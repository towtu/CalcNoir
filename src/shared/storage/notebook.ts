import { validateProblem } from '../../core/numerics';
import type { Problem } from '../../core/numerics/types';

export interface SavedProblem {
  id: string;
  createdAt: number;
  problem: Problem;
  title?: string;
  notes?: string;
  tags?: string[];
  pinned?: boolean;
  updatedAt?: number;
}
export interface NotebookInput {
  problem: Problem;
  title: string;
  notes: string;
  tags: string[];
  pinned: boolean;
}
export interface NotebookSnapshot {
  entries: SavedProblem[];
  warning: string | null;
  readOnly: boolean;
}
export interface StorageDriver {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}
const KEY = 'almost-exact.notebook.v1';
const LIMIT = 40;
const RAW_LIMIT = 256000;
const WRITE_MESSAGES = {
  capacity: 'Notebook is full (40 pages). Delete a page before adding another.',
  size: 'The notebook is too large to save safely. Shorten notes or delete a page before trying again.',
} as const;
export class NotebookWriteError extends Error {
  constructor(readonly code: keyof typeof WRITE_MESSAGES) {
    super(WRITE_MESSAGES[code]);
    this.name = 'NotebookWriteError';
  }
  get userMessage(): string {
    return WRITE_MESSAGES[this.code];
  }
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
function text(
  value: unknown,
  name: string,
  min: number,
  max: number,
  trim = false,
): string {
  if (typeof value !== 'string') {
    throw new Error(`${name} must be text.`);
  }
  const normalized = trim ? value.trim() : value;
  if (normalized.length < min || normalized.length > max) {
    throw new Error(`${name} must contain ${min}–${max} characters.`);
  }
  return normalized;
}
function tags(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 6) {
    throw new Error('Use up to six unique tags.');
  }
  const normalized = Array.from(value, tag =>
    text(tag, 'Each tag', 1, 24, true),
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new Error('Use unique tags.');
  }
  return normalized;
}
function pinned(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('Pinned must be true or false.');
  }
  return value;
}
function timestamp(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 8640000000000000
  ) {
    throw new Error('The saved timestamp is invalid.');
  }
  return value;
}
function metadata(
  value: Record<string, unknown>,
): Pick<SavedProblem, 'title' | 'notes' | 'tags' | 'pinned' | 'updatedAt'> {
  return {
    ...('title' in value
      ? { title: text(value.title, 'Title', 1, 80, true) }
      : {}),
    ...('notes' in value ? { notes: text(value.notes, 'Notes', 0, 4000) } : {}),
    ...('tags' in value ? { tags: tags(value.tags) } : {}),
    ...('pinned' in value ? { pinned: pinned(value.pinned) } : {}),
    ...('updatedAt' in value ? { updatedAt: timestamp(value.updatedAt) } : {}),
  };
}
function validateInput(input: NotebookInput): NotebookInput {
  if (!record(input)) {
    throw new Error('Enter a complete saved problem.');
  }
  return {
    problem: validateProblem(input.problem),
    title: text(input.title, 'Title', 1, 80, true),
    notes: text(input.notes, 'Notes', 0, 4000),
    tags: tags(input.tags),
    pinned: pinned(input.pinned),
  };
}
function decodeNotebookState(raw: string | null): NotebookSnapshot {
  if (!raw) {
    return { entries: [], warning: null, readOnly: false };
  }
  if (raw.length > RAW_LIMIT) {
    return {
      entries: [],
      readOnly: true,
      warning:
        'Your saved notebook is too large to open safely. It is preserved and cannot be changed until recovered.',
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      entries: [],
      readOnly: true,
      warning:
        'Your saved notebook could not be read. It is preserved and cannot be changed until recovered.',
    };
  }
  if (
    !record(parsed) ||
    parsed.version !== 1 ||
    !Array.isArray(parsed.entries)
  ) {
    return {
      entries: [],
      readOnly: true,
      warning:
        'This notebook format is not supported. Its saved data is preserved and cannot be changed until recovered.',
    };
  }
  const entries: SavedProblem[] = [];
  const identifiers = new Set<string>();
  let rejected = 0;
  for (const candidate of parsed.entries.slice(0, 200)) {
    if (
      !record(candidate) ||
      typeof candidate.id !== 'string' ||
      !/^[a-z0-9-]{1,80}$/i.test(candidate.id) ||
      typeof candidate.createdAt !== 'number' ||
      !Number.isFinite(candidate.createdAt) ||
      candidate.createdAt < 0 ||
      candidate.createdAt > 8640000000000000
    ) {
      rejected++;
      continue;
    }
    if (identifiers.has(candidate.id)) {
      rejected++;
      continue;
    }
    try {
      entries.push({
        id: candidate.id,
        createdAt: candidate.createdAt,
        problem: validateProblem(candidate.problem),
        ...metadata(candidate),
      });
      identifiers.add(candidate.id);
    } catch {
      rejected++;
    }
  }
  return {
    entries: entries.sort((a, b) => b.createdAt - a.createdAt).slice(0, LIMIT),
    readOnly: rejected > 0 || parsed.entries.length > LIMIT,
    warning:
      parsed.entries.length > LIMIT
        ? 'This notebook contains more than 40 pages. The original notebook is preserved and read-only until recovered. Up to 40 valid pages are shown.'
        : rejected
        ? 'Some saved problems could not be opened. The original notebook is preserved and read-only until recovered.'
        : null,
  };
}
export function decodeNotebook(raw: string | null): NotebookSnapshot {
  return decodeNotebookState(raw);
}
export function createNotebookRepository(storage: StorageDriver) {
  let pending: Promise<void> = Promise.resolve();
  function queue<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation);
    // A failed write remains visible to its caller; subsequent operations can still run.
    pending = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  const read = async () => decodeNotebookState(await storage.getItem(KEY));
  const requireWritable = (state: NotebookSnapshot) => {
    if (state.readOnly) {
      throw new Error(
        'The saved notebook needs recovery before it can be changed. Its original data has been preserved.',
      );
    }
  };
  const persist = async (entries: SavedProblem[]) => {
    if (entries.length > LIMIT) {
      throw new NotebookWriteError('capacity');
    }
    const raw = JSON.stringify({ version: 1, entries });
    if (raw.length > RAW_LIMIT) {
      throw new NotebookWriteError('size');
    }
    await storage.setItem(KEY, raw);
    return { entries, warning: null, readOnly: false };
  };
  const newRecord = (
    problem: Problem,
    entries: SavedProblem[],
  ): SavedProblem => {
    const now = Date.now();
    const base = `${now.toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    let id = base;
    let suffix = 0;
    while (entries.some(entry => entry.id === id)) {
      id = `${base}-${++suffix}`;
    }
    return { id, createdAt: now, problem };
  };
  const find = (entries: SavedProblem[], id: string): SavedProblem => {
    const saved = entries.find(entry => entry.id === id);
    if (!saved) {
      throw new Error('The saved problem was not found.');
    }
    return saved;
  };
  return {
    load: () => queue(read),
    create: (
      input: NotebookInput,
    ): Promise<NotebookSnapshot & { saved: SavedProblem }> =>
      queue(async () => {
        const validated = validateInput(input);
        const previous = await read();
        requireWritable(previous);
        const saved = {
          ...newRecord(validated.problem, previous.entries),
          ...validated,
          updatedAt: Date.now(),
        };
        return {
          ...(await persist([saved, ...previous.entries])),
          saved,
        };
      }),
    update: (
      id: string,
      input: NotebookInput,
    ): Promise<NotebookSnapshot & { saved: SavedProblem }> =>
      queue(async () => {
        const validated = validateInput(input);
        const previous = await read();
        requireWritable(previous);
        const original = find(previous.entries, id);
        const saved = { ...original, ...validated, updatedAt: Date.now() };
        return {
          ...(await persist(
            previous.entries.map(entry => (entry.id === id ? saved : entry)),
          )),
          saved,
        };
      }),
    duplicate: (
      id: string,
    ): Promise<NotebookSnapshot & { saved: SavedProblem }> =>
      queue(async () => {
        const previous = await read();
        requireWritable(previous);
        const original = find(previous.entries, id);
        const saved = {
          ...newRecord(original.problem, previous.entries),
          title: `${(original.title ?? `${original.problem.method} problem`)
            .slice(0, 75)
            .trimEnd()} Copy`,
          notes: original.notes ?? '',
          tags: [...(original.tags ?? [])],
          pinned: false,
          updatedAt: Date.now(),
        };
        return {
          ...(await persist([saved, ...previous.entries])),
          saved,
        };
      }),
    save: (input: Problem) =>
      queue(async () => {
        const problem = validateProblem(input),
          previous = await read(),
          identity = JSON.stringify(problem);
        requireWritable(previous);
        const saved = newRecord(problem, previous.entries);
        return persist([
          saved,
          ...previous.entries.filter(
            entry => JSON.stringify(entry.problem) !== identity,
          ),
        ]);
      }),
    remove: (id: string) =>
      queue(async () => {
        const previous = await read();
        requireWritable(previous);
        return persist(previous.entries.filter(entry => entry.id !== id));
      }),
  };
}
