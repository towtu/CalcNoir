import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Problem } from '../../core/numerics/types';
import { createNotebookRepository } from './notebook';
import type { NotebookInput, NotebookSnapshot, SavedProblem } from './notebook';
import notebookStorage from './database';

interface NotebookValue {
  entries: SavedProblem[];
  loading: boolean;
  warning: string | null;
  readOnly: boolean;
  create: (input: NotebookInput) => Promise<SavedProblem>;
  update: (id: string, input: NotebookInput) => Promise<SavedProblem>;
  duplicate: (id: string) => Promise<SavedProblem>;
  save: (problem: Problem) => Promise<void>;
  remove: (id: string) => Promise<void>;
}
const Context = createContext<NotebookValue | null>(null);
export function NotebookProvider({ children }: { children: React.ReactNode }) {
  const [repository] = useState(() =>
    createNotebookRepository(notebookStorage),
  );
  const [entries, setEntries] = useState<SavedProblem[]>([]),
    [loading, setLoading] = useState(true),
    [warning, setWarning] = useState<string | null>(null),
    [readOnly, setReadOnly] = useState(false);
  useEffect(() => {
    let mounted = true;
    repository
      .load()
      .then(value => {
        if (mounted) {
          setEntries(value.entries);
          setWarning(value.warning);
          setReadOnly(value.readOnly);
        }
      })
      .catch(() => {
        if (mounted) {
          setReadOnly(true);
          setWarning(
            'Your notebook could not be opened. Please try again later.',
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [repository]);
  const publish = (result: NotebookSnapshot) => {
    setEntries(result.entries);
    setWarning(result.warning);
    setReadOnly(result.readOnly);
  };
  const create = async (input: NotebookInput) => {
    const result = await repository.create(input);
    publish(result);
    return result.saved;
  };
  const update = async (id: string, input: NotebookInput) => {
    const result = await repository.update(id, input);
    publish(result);
    return result.saved;
  };
  const duplicate = async (id: string) => {
    const result = await repository.duplicate(id);
    publish(result);
    return result.saved;
  };
  const save = async (problem: Problem) => {
    publish(await repository.save(problem));
  };
  const remove = async (id: string) => {
    publish(await repository.remove(id));
  };
  return (
    <Context.Provider
      value={{
        entries,
        loading,
        warning,
        readOnly,
        create,
        update,
        duplicate,
        save,
        remove,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useNotebook(): NotebookValue {
  const value = useContext(Context);
  if (!value) {
    throw new Error('NotebookProvider is required.');
  }
  return value;
}
