import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { defaultProblem } from '../src/core/methods';
import notebookStorage, {
  createDatabaseStorage,
} from '../src/shared/storage/database';
import {
  createNotebookRepository,
  decodeNotebook,
} from '../src/shared/storage/notebook';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock(
  '../src/native/specs/NativeNotebookDatabase',
  () => ({ __esModule: true, default: null }),
  { virtual: true },
);

const KEY = 'almost-exact.notebook.v1';
const EMPTY = JSON.stringify({ version: 1, entries: [] });
const FAILURE =
  'Your notebook database is unavailable. Please restart Numelix and try again.';
function envelope(id = 'legacy-page') {
  return JSON.stringify(
    {
      version: 1,
      entries: [
        {
          id,
          createdAt: 123,
          updatedAt: 456,
          problem: defaultProblem(),
          title: 'Homework',
          notes: 'Keep my notes',
          tags: ['roots'],
          pinned: true,
        },
      ],
    },
    null,
    2,
  );
}
function legacyStorage(initial: string | null) {
  let raw = initial;
  return {
    getItem: jest.fn(async (_key: string) => raw),
    setItem: jest.fn(async (_key: string, value: string) => {
      raw = value;
    }),
    raw: () => raw,
  };
}
function nativeDatabase(initial: string | null = null) {
  let raw = initial;
  return {
    readNotebook: jest.fn(async () => raw),
    writeNotebook: jest.fn(async (value: string) => {
      raw = value;
    }),
    raw: () => raw,
  };
}

test('imports valid legacy data exactly once and retains the original source untouched', async () => {
  const raw = envelope();
  const legacy = legacyStorage(raw);
  const database = nativeDatabase();
  const driver = createDatabaseStorage(database, legacy, true);
  expect(await driver.getItem(KEY)).toBe(raw);
  expect(database.writeNotebook).toHaveBeenCalledWith(raw);
  expect(legacy.raw()).toBe(raw);
  expect(legacy.setItem).not.toHaveBeenCalled();
  expect(await driver.getItem(KEY)).toBe(raw);
  expect(database.writeNotebook).toHaveBeenCalledTimes(1);
  expect(legacy.getItem).toHaveBeenCalledTimes(1);
});

test('an initialized database takes precedence without reading legacy storage', async () => {
  const raw = envelope('database-page');
  const database = nativeDatabase(raw);
  const legacy = legacyStorage(envelope());
  expect(await createDatabaseStorage(database, legacy, true).getItem(KEY)).toBe(
    raw,
  );
  expect(legacy.getItem).not.toHaveBeenCalled();
  expect(database.writeNotebook).not.toHaveBeenCalled();
});

test('deleting every migrated page does not resurrect legacy pages when reopened', async () => {
  const original = envelope();
  const database = nativeDatabase();
  const legacy = legacyStorage(original);
  const repository = createNotebookRepository(
    createDatabaseStorage(database, legacy, true),
  );
  expect((await repository.load()).entries).toHaveLength(1);
  await repository.remove('legacy-page');
  const reopened = createNotebookRepository(
    createDatabaseStorage(database, legacy, true),
  );
  expect((await reopened.load()).entries).toHaveLength(0);
  expect(database.raw()).toBe(EMPTY);
  expect(legacy.getItem).toHaveBeenCalledTimes(1);
  expect(legacy.raw()).toBe(original);
  expect(legacy.setItem).not.toHaveBeenCalled();
});

test.each([null, ''])(
  'initializes missing or empty legacy value %p with an empty envelope',
  async raw => {
    const database = nativeDatabase();
    const legacy = legacyStorage(raw);
    const driver = createDatabaseStorage(database, legacy, true);
    expect(await driver.getItem(KEY)).toBe(EMPTY);
    expect(database.writeNotebook).toHaveBeenCalledWith(EMPTY);
    expect(legacy.raw()).toBe(raw);
    expect(legacy.setItem).not.toHaveBeenCalled();
    expect(
      await createDatabaseStorage(database, legacy, true).getItem(KEY),
    ).toBe(EMPTY);
    expect(legacy.getItem).toHaveBeenCalledTimes(1);
  },
);

const invalid = [
  ['corrupt JSON', '{broken'],
  ['unknown version', JSON.stringify({ version: 2, entries: [] })],
  [
    'corrupt record',
    JSON.stringify({
      version: 1,
      entries: [{ id: 'bad', createdAt: 123, problem: { kind: 'unknown' } }],
    }),
  ],
  [
    'invalid metadata',
    JSON.stringify({
      version: 1,
      entries: [
        { id: 'bad', createdAt: 123, problem: defaultProblem(), title: '' },
      ],
    }),
  ],
  [
    'over-capacity notebook',
    JSON.stringify({
      version: 1,
      entries: Array.from({ length: 41 }, (_, index) => ({
        id: `page-${index}`,
        createdAt: index,
        problem: defaultProblem(),
      })),
    }),
  ],
  ['oversized notebook', 'x'.repeat(256001)],
] as const;
test.each(invalid)(
  'preserves %s in legacy storage without importing it',
  async (_label, raw) => {
    const legacy = legacyStorage(raw);
    const database = nativeDatabase();
    const driver = createDatabaseStorage(database, legacy, true);
    expect((await driver.getItem(KEY)) === raw).toBe(true);
    expect(decodeNotebook(raw).readOnly).toBe(true);
    await expect(
      createNotebookRepository(driver).save(defaultProblem()),
    ).rejects.toThrow(/preserved/);
    expect(database.writeNotebook).not.toHaveBeenCalled();
    expect(database.raw()).toBeNull();
    expect(legacy.raw() === raw).toBe(true);
    expect(legacy.setItem).not.toHaveBeenCalled();
  },
);

test('migration failure preserves the original and a later retry can import it', async () => {
  const raw = envelope();
  const legacy = legacyStorage(raw);
  const database = nativeDatabase();
  database.writeNotebook.mockRejectedValueOnce(
    new Error('/private/database migration failed'),
  );
  const driver = createDatabaseStorage(database, legacy, true);
  await expect(driver.getItem(KEY)).rejects.toThrow(FAILURE);
  expect(database.raw()).toBeNull();
  expect(legacy.raw()).toBe(raw);
  expect(legacy.setItem).not.toHaveBeenCalled();
  expect(await driver.getItem(KEY)).toBe(raw);
});

test('database write failure retains both sources and never falls back to legacy writes', async () => {
  const original = envelope();
  const legacy = legacyStorage(original);
  const database = nativeDatabase(original);
  database.writeNotebook.mockRejectedValueOnce(
    new Error('/private/database write failed'),
  );
  const driver = createDatabaseStorage(database, legacy, true);
  await expect(driver.setItem(KEY, EMPTY)).rejects.toThrow(FAILURE);
  expect(database.raw()).toBe(original);
  expect(legacy.raw()).toBe(original);
  expect(legacy.setItem).not.toHaveBeenCalled();
  await driver.setItem(KEY, EMPTY);
  expect(database.raw()).toBe(EMPTY);
});

test('a failed native read reports a safe failure without falling back to legacy data', async () => {
  const legacy = legacyStorage(envelope());
  const database = nativeDatabase();
  database.readNotebook.mockRejectedValueOnce(
    new Error('/private/database read failed'),
  );
  await expect(
    createDatabaseStorage(database, legacy, true).getItem(KEY),
  ).rejects.toThrow(FAILURE);
  expect(legacy.getItem).not.toHaveBeenCalled();
  expect(database.writeNotebook).not.toHaveBeenCalled();
});

test('Android with a missing native database fails safely without pretending legacy is the database', async () => {
  const original = envelope();
  const legacy = legacyStorage(original);
  const driver = createDatabaseStorage(null, legacy, true);
  await expect(driver.getItem(KEY)).rejects.toThrow(FAILURE);
  await expect(driver.setItem(KEY, EMPTY)).rejects.toThrow(FAILURE);
  expect(legacy.getItem).not.toHaveBeenCalled();
  expect(legacy.setItem).not.toHaveBeenCalled();
  expect(legacy.raw()).toBe(original);
});

test.each([...invalid, ['empty write', '']] as const)(
  'rejects %s before writing to the database',
  async (_label, raw) => {
    const database = nativeDatabase(EMPTY);
    const legacy = legacyStorage(envelope());
    await expect(
      createDatabaseStorage(database, legacy, true).setItem(KEY, raw),
    ).rejects.toThrow(/invalid|preserved/i);
    expect(database.writeNotebook).not.toHaveBeenCalled();
    expect(database.raw()).toBe(EMPTY);
    expect(legacy.setItem).not.toHaveBeenCalled();
  },
);

test('valid notebook writes go only to the database', async () => {
  const database = nativeDatabase(EMPTY);
  const legacy = legacyStorage(envelope());
  const raw = envelope('new-page');
  await createDatabaseStorage(database, legacy, true).setItem(KEY, raw);
  expect(database.writeNotebook).toHaveBeenCalledWith(raw);
  expect(legacy.getItem).not.toHaveBeenCalled();
  expect(legacy.setItem).not.toHaveBeenCalled();
});

test('iOS retains legacy reads and writes without requiring a native database', async () => {
  const legacy = legacyStorage(envelope());
  const driver = createDatabaseStorage(null, legacy, false);
  expect(await driver.getItem(KEY)).toBe(legacy.raw());
  await driver.setItem(KEY, EMPTY);
  expect(legacy.setItem).toHaveBeenCalledWith(KEY, EMPTY);
});

test('the default adapter retains AsyncStorage on the iOS test platform', async () => {
  expect(Platform.OS).toBe('ios');
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(EMPTY);
  expect(await notebookStorage.getItem(KEY)).toBe(EMPTY);
  await notebookStorage.setItem(KEY, EMPTY);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(KEY, EMPTY);
});

test('unrelated keys still use legacy storage even when Android has no native database', async () => {
  const legacy = legacyStorage('dark');
  const driver = createDatabaseStorage(null, legacy, true);
  expect(await driver.getItem('almost-exact.theme.v1')).toBe('dark');
  await driver.setItem('almost-exact.theme.v1', 'light');
  expect(legacy.raw()).toBe('light');
});

test('an in-flight legacy migration cannot overwrite a later notebook write', async () => {
  let finishLegacy!: (raw: string) => void;
  let markStarted!: () => void;
  const started = new Promise<void>(resolve => {
    markStarted = resolve;
  });
  const legacyRead = new Promise<string>(resolve => {
    finishLegacy = resolve;
  });
  const original = envelope();
  const legacy = legacyStorage(original);
  legacy.getItem.mockImplementationOnce(async () => {
    markStarted();
    return legacyRead;
  });
  const database = nativeDatabase();
  const driver = createDatabaseStorage(database, legacy, true);
  const migration = driver.getItem(KEY);
  await started;
  const clear = driver.setItem(KEY, EMPTY);
  await Promise.resolve();
  expect(database.writeNotebook).not.toHaveBeenCalled();
  finishLegacy(original);
  await Promise.all([migration, clear]);
  expect(database.raw()).toBe(EMPTY);
  expect(await driver.getItem(KEY)).toBe(EMPTY);
  expect(legacy.raw()).toBe(original);
});
