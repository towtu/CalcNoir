import {
  createNotebookRepository,
  decodeNotebook,
} from '../src/shared/storage/notebook';
import { defaultProblem } from '../src/core/methods';

function memoryStorage() {
  let raw: string | null = null;
  return {
    getItem: jest.fn(async () => raw),
    setItem: jest.fn(async (_key: string, value: string) => {
      raw = value;
    }),
    setRaw(value: string) {
      raw = value;
    },
  };
}
test('keeps valid records while rejecting a malformed persisted problem', () => {
  const value = decodeNotebook(
    JSON.stringify({
      version: 1,
      entries: [
        { id: 'saved-one', createdAt: 123, problem: defaultProblem() },
        {
          id: 'bad',
          createdAt: 124,
          problem: { kind: 'root', method: 'eval', expression: 'import(1)' },
        },
      ],
    }),
  );
  expect(value.entries).toHaveLength(1);
  expect(value.warning).not.toBeNull();
});
test('concurrent saves retain both problems', async () => {
  const storage = memoryStorage(),
    repository = createNotebookRepository(storage);
  await Promise.all([
    repository.save(defaultProblem('bisection')),
    repository.save(defaultProblem('secant')),
  ]);
  expect((await repository.load()).entries).toHaveLength(2);
});
test('deduplicates snapshots and removes only the selected record', async () => {
  const repository = createNotebookRepository(memoryStorage());
  await repository.save(defaultProblem('bisection'));
  await repository.save(defaultProblem('bisection'));
  await repository.save(defaultProblem('newton'));
  const entries = (await repository.load()).entries;
  expect(entries).toHaveLength(2);
  await repository.remove(entries[0].id);
  expect((await repository.load()).entries).toHaveLength(1);
});
test('failed persistence is reported and does not claim that a save succeeded', async () => {
  const storage = memoryStorage();
  storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  const repository = createNotebookRepository(storage);
  await expect(repository.save(defaultProblem())).rejects.toThrow('disk full');
  expect((await repository.load()).entries).toHaveLength(0);
});
test('corrupt or oversized local data produces a recoverable warning', () => {
  expect(decodeNotebook('{broken').warning).not.toBeNull();
  expect(decodeNotebook('x'.repeat(256001)).warning).not.toBeNull();
});
test('duplicate persisted record identifiers are skipped with visible feedback', async () => {
  const storage = memoryStorage();
  storage.setRaw(
    JSON.stringify({
      version: 1,
      entries: [
        { id: 'same-id', createdAt: 123, problem: defaultProblem('bisection') },
        { id: 'same-id', createdAt: 124, problem: defaultProblem('newton') },
        { id: 'other-id', createdAt: 125, problem: defaultProblem('secant') },
      ],
    }),
  );
  const repository = createNotebookRepository(storage);
  const loaded = await repository.load();
  expect(loaded.entries).toHaveLength(2);
  expect(loaded.warning).not.toBeNull();
  expect(loaded.readOnly).toBe(true);
  await expect(repository.remove('same-id')).rejects.toThrow(/preserved/);
  expect((await repository.load()).entries).toHaveLength(2);
});
