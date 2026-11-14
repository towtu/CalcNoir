import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import NativeNotebookDatabase from '../../native/specs/NativeNotebookDatabase';
import { decodeNotebook } from './notebook';
import type { StorageDriver } from './notebook';

const KEY = 'almost-exact.notebook.v1';
const EMPTY = JSON.stringify({ version: 1, entries: [] });
const FAILURE =
  'Your notebook database is unavailable. Please restart CalcNoir and try again.';
interface NotebookDatabase {
  readNotebook: () => Promise<string | null>;
  writeNotebook: (raw: string) => Promise<void>;
}
export function createDatabaseStorage(
  database: NotebookDatabase | null,
  legacy: StorageDriver,
  useDatabase: boolean,
): StorageDriver {
  if (!useDatabase) return legacy;
  let pending: Promise<void> = Promise.resolve();
  function queue<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation);
    pending = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  return {
    getItem: key =>
      key !== KEY
        ? legacy.getItem(key)
        : queue(async () => {
            if (!database) throw new Error(FAILURE);
            try {
              const stored = await database.readNotebook();
              if (stored !== null) return stored;
              const original = await legacy.getItem(KEY);
              if (original && decodeNotebook(original).readOnly)
                return original;
              const imported = original || EMPTY;
              await database.writeNotebook(imported);
              return imported;
            } catch {
              throw new Error(FAILURE);
            }
          }),
    setItem: (key, raw) =>
      key !== KEY
        ? legacy.setItem(key, raw)
        : queue(async () => {
            if (!database) throw new Error(FAILURE);
            if (
              typeof raw !== 'string' ||
              !raw ||
              decodeNotebook(raw).readOnly
            ) {
              throw new Error(
                'The notebook data is invalid. Your saved data has been preserved.',
              );
            }
            try {
              await database.writeNotebook(raw);
            } catch {
              throw new Error(FAILURE);
            }
          }),
  };
}
const notebookStorage = createDatabaseStorage(
  NativeNotebookDatabase ?? null,
  AsyncStorage,
  Platform.OS === 'android',
);
export default notebookStorage;
