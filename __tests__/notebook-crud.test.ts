import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { defaultProblem } from '../src/core/methods';
import {
  createNotebookRepository,
  decodeNotebook,
} from '../src/shared/storage/notebook';
import type {
  NotebookInput,
  SavedProblem,
} from '../src/shared/storage/notebook';
import { NotebookProvider, useNotebook } from '../src/shared/storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const KEY = 'almost-exact.notebook.v1';
const FULL_MESSAGE =
  'Notebook is full (40 pages). Delete a page before adding another.';
function memoryStorage(initial: string | null = null) {
  let raw = initial;
  return {
    getItem: jest.fn(async () => raw),
    setItem: jest.fn(async (_key: string, value: string) => {
      raw = value;
    }),
    raw: () => raw,
  };
}
function input(overrides: Partial<NotebookInput> = {}): NotebookInput {
  return {
    problem: defaultProblem(),
    title: 'Cubic homework',
    notes: 'Check the stopping criterion.',
    tags: ['homework', 'roots'],
    pinned: true,
    ...overrides,
  };
}
const invalidMetadata: Array<[string, Record<string, unknown>]> = [
  ['empty title', { title: ' ' }],
  ['long title', { title: 'x'.repeat(81) }],
  ['nontext title', { title: null }],
  ['long notes', { notes: 'x'.repeat(4001) }],
  ['nontext notes', { notes: false }],
  ['too many tags', { tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }],
  ['duplicate tags', { tags: ['roots', ' roots '] }],
  ['empty tag', { tags: [' '] }],
  ['long tag', { tags: ['x'.repeat(25)] }],
  ['nontext tag', { tags: [42] }],
  ['sparse tags', { tags: Array<string>(1) }],
  ['nonarray tags', { tags: null }],
  ['nonboolean pin', { pinned: 'yes' }],
];

test('reads legacy version-one records without rewriting or inventing metadata', async () => {
  const legacy: SavedProblem = {
    id: 'legacy',
    createdAt: 123,
    problem: defaultProblem(),
  };
  const raw = JSON.stringify({ version: 1, entries: [legacy] });
  const storage = memoryStorage(raw);
  const snapshot = await createNotebookRepository(storage).load();
  expect(snapshot).toEqual({
    entries: [legacy],
    warning: null,
    readOnly: false,
  });
  expect(storage.raw()).toBe(raw);
  expect(storage.setItem).not.toHaveBeenCalled();
});

test('creates separate pages for equal problems and persists normalized metadata under version one', async () => {
  const storage = memoryStorage();
  const repository = createNotebookRepository(storage);
  const first = await repository.create(
    input({ title: ' Cubic homework ', tags: [' roots '] }),
  );
  const second = await repository.create(input());
  expect(first.saved).toEqual(
    expect.objectContaining({
      title: 'Cubic homework',
      notes: 'Check the stopping criterion.',
      tags: ['roots'],
      pinned: true,
      problem: defaultProblem(),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    }),
  );
  expect(second.saved.id).not.toBe(first.saved.id);
  expect(second.entries).toHaveLength(2);
  expect(second.entries).toContainEqual(second.saved);
  expect(storage.setItem).toHaveBeenLastCalledWith(KEY, expect.any(String));
  expect(JSON.parse(storage.raw()!)).toEqual({
    version: 1,
    entries: second.entries,
  });
  expect((await repository.load()).entries).toEqual(
    expect.arrayContaining([first.saved, second.saved]),
  );
});

test('accepts the metadata bounds and preserves plain notes exactly', async () => {
  const repository = createNotebookRepository(memoryStorage());
  const value = input({
    title: 'x'.repeat(80),
    notes: '\n' + 'x'.repeat(3998) + '\n',
    tags: Array.from({ length: 6 }, (_, index) => `${index}`.repeat(24)),
    pinned: false,
  });
  expect((await repository.create(value)).saved).toEqual(
    expect.objectContaining(value),
  );
  expect(
    (await repository.create(input({ notes: '', tags: [] }))).saved.notes,
  ).toBe('');
});

test.each(invalidMetadata)(
  'rejects %s before writing',
  async (_description, metadata) => {
    const storage = memoryStorage();
    const repository = createNotebookRepository(storage);
    await expect(
      repository.create({ ...input(), ...metadata } as NotebookInput),
    ).rejects.toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
  },
);

test.each([
  ...invalidMetadata,
  ['negative update timestamp', { updatedAt: -1 }],
  ['oversized update timestamp', { updatedAt: 8640000000000001 }],
  ['nonfinite update timestamp', { updatedAt: null }],
  ['nonnumber update timestamp', { updatedAt: 'today' }],
] as Array<[string, Record<string, unknown>]>)(
  'preserves a notebook with persisted %s as read-only',
  async (_description, metadata) => {
    const raw = JSON.stringify({
      version: 1,
      entries: [
        { id: 'invalid-meta', createdAt: 123, ...input(), ...metadata },
      ],
    });
    const storage = memoryStorage(raw);
    const repository = createNotebookRepository(storage);
    expect((await repository.load()).readOnly).toBe(true);
    await expect(repository.create(input())).rejects.toThrow(/preserved/);
    await expect(repository.update('invalid-meta', input())).rejects.toThrow(
      /preserved/,
    );
    await expect(repository.duplicate('invalid-meta')).rejects.toThrow(
      /preserved/,
    );
    await expect(repository.save(defaultProblem())).rejects.toThrow(
      /preserved/,
    );
    await expect(repository.remove('invalid-meta')).rejects.toThrow(
      /preserved/,
    );
    expect(storage.raw()).toBe(raw);
    expect(storage.setItem).not.toHaveBeenCalled();
  },
);

test('normalizes recognized metadata when reading without rewriting the original data', () => {
  const raw = JSON.stringify({
    version: 1,
    entries: [
      {
        id: 'page',
        createdAt: 123,
        updatedAt: 456,
        ...input({ title: ' Cubic ', tags: [' roots '] }),
      },
    ],
  });
  expect(decodeNotebook(raw)).toEqual({
    entries: [
      {
        id: 'page',
        createdAt: 123,
        updatedAt: 456,
        ...input({ title: 'Cubic', tags: ['roots'] }),
      },
    ],
    readOnly: false,
    warning: null,
  });
});

test('updates in place, preserving immutable identity and creation time', async () => {
  const storage = memoryStorage();
  const repository = createNotebookRepository(storage);
  jest.spyOn(Date, 'now').mockReturnValue(1000);
  try {
    const original = (await repository.create(input())).saved;
    const other = (await repository.create(input({ title: 'Other page' })))
      .saved;
    jest.mocked(Date.now).mockReturnValue(2000);
    const replacement = input({
      problem: defaultProblem('lagrange'),
      title: 'Measurements',
      notes: '',
      tags: [],
      pinned: false,
    });
    const result = await repository.update(original.id, replacement);
    expect(result.saved).toEqual({
      ...original,
      ...replacement,
      updatedAt: 2000,
    });
    expect(result.entries).toHaveLength(2);
    expect(result.entries).toContainEqual(other);
    expect((await repository.load()).entries).toContainEqual(result.saved);
  } finally {
    jest.restoreAllMocks();
  }
});

test('updates a legacy page without changing its identity', async () => {
  const storage = memoryStorage(
    JSON.stringify({
      version: 1,
      entries: [{ id: 'legacy', createdAt: 123, problem: defaultProblem() }],
    }),
  );
  const result = await createNotebookRepository(storage).update(
    'legacy',
    input(),
  );
  expect(result.saved).toEqual(
    expect.objectContaining({
      id: 'legacy',
      createdAt: 123,
      ...input(),
      updatedAt: expect.any(Number),
    }),
  );
});

test('duplicates a page with copied details, a new identity, bounded title and no pin', async () => {
  const repository = createNotebookRepository(memoryStorage());
  const original = (await repository.create(input())).saved;
  const copy = (await repository.duplicate(original.id)).saved;
  expect(copy.id).not.toBe(original.id);
  expect(copy).toEqual(
    expect.objectContaining({
      ...input(),
      title: 'Cubic homework Copy',
      pinned: false,
    }),
  );
  const long = (await repository.create(input({ title: 'x'.repeat(80) })))
    .saved;
  expect((await repository.duplicate(long.id)).saved.title).toBe(
    'x'.repeat(75) + ' Copy',
  );
  expect((await repository.load()).entries).toHaveLength(4);
});

test('duplicates a legacy page with safe metadata defaults', async () => {
  const repository = createNotebookRepository(
    memoryStorage(
      JSON.stringify({
        version: 1,
        entries: [{ id: 'legacy', createdAt: 123, problem: defaultProblem() }],
      }),
    ),
  );
  const copy = (await repository.duplicate('legacy')).saved;
  expect(copy.title).toMatch(/ Copy$/);
  expect(copy.notes).toBe('');
  expect(copy.tags).toEqual([]);
  expect(copy.pinned).toBe(false);
});

test('missing update and duplication IDs reject without writing', async () => {
  const storage = memoryStorage();
  const repository = createNotebookRepository(storage);
  await expect(repository.update('missing', input())).rejects.toThrow(
    /not found/i,
  );
  await expect(repository.duplicate('missing')).rejects.toThrow(/not found/i);
  expect(storage.setItem).not.toHaveBeenCalled();
});

test('invalid edits and failed writes retain the original page and allow later writes', async () => {
  const storage = memoryStorage();
  const repository = createNotebookRepository(storage);
  const original = (await repository.create(input())).saved;
  const raw = storage.raw();
  await expect(
    repository.update(original.id, input({ title: '' })),
  ).rejects.toThrow();
  expect(storage.raw()).toBe(raw);
  storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await expect(
    repository.update(original.id, input({ title: 'Changed' })),
  ).rejects.toThrow('disk full');
  expect(storage.raw()).toBe(raw);
  expect((await repository.load()).entries).toEqual([original]);
  expect(
    (await repository.update(original.id, input({ title: 'Retried' }))).saved
      .title,
  ).toBe('Retried');
});

test('serializes concurrent creates, updates and duplication without dropping pages', async () => {
  const repository = createNotebookRepository(memoryStorage());
  const first = (await repository.create(input())).saved;
  const [created, updated, copied] = await Promise.all([
    repository.create(input({ title: 'Second page' })),
    repository.update(first.id, input({ title: 'Changed' })),
    repository.duplicate(first.id),
  ]);
  const loaded = await repository.load();
  expect(loaded.entries).toHaveLength(3);
  expect(loaded.entries).toEqual(
    expect.arrayContaining([created.saved, updated.saved, copied.saved]),
  );
  expect(copied.saved.title).toBe('Changed Copy');
});

test('rejects new pages and duplicates when full without evicting the oldest pinned notes', async () => {
  const entries = Array.from({ length: 40 }, (_, index) => ({
    id: `page-${index}`,
    createdAt: index,
    ...input({
      title: `Page ${index}`,
      notes: `Keep note ${index}`,
      pinned: index === 0,
    }),
  }));
  const raw = JSON.stringify({ version: 1, entries });
  const storage = memoryStorage(raw);
  const repository = createNotebookRepository(storage);
  const expectedError = {
    name: 'NotebookWriteError',
    code: 'capacity',
    message: FULL_MESSAGE,
  };
  await expect(repository.create(input())).rejects.toMatchObject(expectedError);
  await expect(repository.duplicate('page-39')).rejects.toMatchObject(
    expectedError,
  );
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(storage.raw()).toBe(raw);
  expect((await repository.load()).entries).toContainEqual(entries[0]);
  expect((await repository.load()).readOnly).toBe(false);

  const updated = await repository.update(
    'page-0',
    input({ title: 'Updated oldest page', notes: entries[0].notes }),
  );
  expect(updated.entries).toHaveLength(40);
  expect(updated.saved.id).toBe('page-0');
  expect(updated.saved.notes).toBe('Keep note 0');
  await repository.remove('page-39');
  const copy = await repository.duplicate('page-0');
  expect(copy.entries).toHaveLength(40);
  expect(copy.saved.notes).toBe('Keep note 0');
  await repository.remove(copy.saved.id);
  expect((await repository.create(input())).entries).toHaveLength(40);
});

test('a restored over-capacity notebook stays read-only and preserves every original record', async () => {
  const entries = Array.from({ length: 41 }, (_, index) => ({
    id: `page-${index}`,
    createdAt: index,
    ...input({ notes: `Original note ${index}` }),
  }));
  const raw = JSON.stringify({ version: 1, entries });
  const storage = memoryStorage(raw);
  const repository = createNotebookRepository(storage);
  const loaded = await repository.load();
  expect(loaded.entries).toHaveLength(40);
  expect(loaded.readOnly).toBe(true);
  expect(loaded.warning).toMatch(/40/);
  expect(loaded.warning).toMatch(/original.*preserved/i);
  await expect(repository.create(input())).rejects.toThrow(/preserved/);
  await expect(repository.update('page-40', input())).rejects.toThrow(
    /preserved/,
  );
  await expect(repository.duplicate('page-40')).rejects.toThrow(/preserved/);
  await expect(repository.remove('page-40')).rejects.toThrow(/preserved/);
  await expect(repository.save(defaultProblem())).rejects.toThrow(/preserved/);
  expect(storage.raw()).toBe(raw);
  expect(storage.setItem).not.toHaveBeenCalled();
});

test('concurrent additions compete safely for the last free page slot', async () => {
  const entries = Array.from({ length: 39 }, (_, index) => ({
    id: `page-${index}`,
    createdAt: index,
    ...input(),
  }));
  const storage = memoryStorage(JSON.stringify({ version: 1, entries }));
  const repository = createNotebookRepository(storage);
  const results = await Promise.allSettled([
    repository.create(input()),
    repository.duplicate('page-0'),
  ]);
  expect(results.map(result => result.status)).toEqual([
    'fulfilled',
    'rejected',
  ]);
  expect(storage.setItem).toHaveBeenCalledTimes(1);
  expect((await repository.load()).entries).toHaveLength(40);
  expect((await repository.load()).entries).toContainEqual(entries[0]);
});

test('legacy save deduplicates at capacity but cannot evict pages for a new problem', async () => {
  const entries = Array.from({ length: 40 }, (_, index) => ({
    id: `page-${index}`,
    createdAt: index,
    ...input(),
  }));
  const storage = memoryStorage(JSON.stringify({ version: 1, entries }));
  const repository = createNotebookRepository(storage);
  await expect(repository.save(defaultProblem('secant'))).rejects.toThrow(
    FULL_MESSAGE,
  );
  expect(storage.setItem).not.toHaveBeenCalled();
  expect((await repository.save(defaultProblem())).entries).toHaveLength(1);
});

test('rejects serialized writes over the raw read limit without changing stored data', async () => {
  const entries = Array.from({ length: 10 }, (_, index) => ({
    id: `page-${index}`,
    createdAt: index,
    ...input({ notes: '\u0000'.repeat(4000) }),
  }));
  entries.push({ id: 'small-page', createdAt: 11, ...input({ notes: '' }) });
  const raw = JSON.stringify({ version: 1, entries });
  expect(raw.length).toBeLessThan(256000);
  const storage = memoryStorage(raw);
  const repository = createNotebookRepository(storage);
  await expect(
    repository.create(input({ notes: '\u0000'.repeat(4000) })),
  ).rejects.toMatchObject({ name: 'NotebookWriteError', code: 'size' });
  await expect(repository.duplicate('page-0')).rejects.toThrow(
    /large|size|limit/i,
  );
  await expect(
    repository.update('small-page', input({ notes: '\u0000'.repeat(4000) })),
  ).rejects.toThrow(/large|size|limit/i);
  expect(storage.raw()).toBe(raw);
  expect(storage.setItem).not.toHaveBeenCalled();
  expect((await repository.load()).readOnly).toBe(false);
});

test('legacy save remains a deduplicating API alongside page creation', async () => {
  const repository = createNotebookRepository(memoryStorage());
  await repository.create(input());
  await repository.create(input());
  const result = await repository.save(defaultProblem());
  expect(result.entries).toHaveLength(1);
  await repository.remove('missing');
  expect((await repository.load()).entries).toHaveLength(1);
});

test('context publishes persisted create, update and duplicate results and retains state on failure', async () => {
  let raw: string | null = null;
  jest.mocked(AsyncStorage.getItem).mockImplementation(async () => raw);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (_key, value) => {
    raw = value;
  });
  let notebook!: ReturnType<typeof useNotebook>;
  function Probe() {
    notebook = useNotebook();
    return null;
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      React.createElement(NotebookProvider, null, React.createElement(Probe)),
    );
  });
  try {
    let saved!: SavedProblem;
    await act(async () => {
      saved = await notebook.create(input());
    });
    expect(notebook.entries).toEqual([saved]);
    await act(async () => {
      saved = await notebook.update(saved.id, input({ title: 'Edited' }));
    });
    expect(notebook.entries).toEqual([saved]);
    let copy!: SavedProblem;
    await act(async () => {
      copy = await notebook.duplicate(saved.id);
    });
    expect(notebook.entries).toEqual(expect.arrayContaining([saved, copy]));
    jest
      .mocked(AsyncStorage.setItem)
      .mockRejectedValueOnce(new Error('disk full'));
    await act(async () => {
      await expect(
        notebook.update(saved.id, input({ title: 'Lost edit' })),
      ).rejects.toThrow('disk full');
    });
    expect(notebook.entries).toEqual(expect.arrayContaining([saved, copy]));
  } finally {
    await act(async () => renderer.unmount());
    jest.mocked(AsyncStorage.getItem).mockReset().mockResolvedValue(null);
    jest.mocked(AsyncStorage.setItem).mockReset().mockResolvedValue(undefined);
  }
});
