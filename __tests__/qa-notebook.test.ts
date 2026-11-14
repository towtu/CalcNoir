import { defaultProblem } from '../src/core/methods';
import { createNotebookRepository } from '../src/shared/storage/notebook';

test.each([
  ['unsupported schema', JSON.stringify({ version: 2, entries: [] })],
  ['corrupt JSON', '{broken'],
  ['oversized data', 'x'.repeat(256001)],
  [
    'partially corrupt records',
    JSON.stringify({
      version: 1,
      entries: [
        { id: 'valid', createdAt: 123, problem: defaultProblem() },
        { id: 'broken', createdAt: 124, problem: { method: 'unknown' } },
      ],
    }),
  ],
])(
  'writes preserve %s instead of replacing the original data',
  async (_name, raw) => {
    const storage = {
      getItem: jest.fn(async () => raw),
      setItem: jest.fn(async () => undefined),
    };
    const repository = createNotebookRepository(storage);
    expect((await repository.load()).warning).not.toBeNull();
    await expect(repository.save(defaultProblem())).rejects.toThrow();
    await expect(repository.remove('valid')).rejects.toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
  },
);
