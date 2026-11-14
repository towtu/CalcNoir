import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import { defaultProblem, METHODS } from '../src/core/methods';
import type { MethodId } from '../src/core/numerics/types';
import { NotebookEditorScreen } from '../src/features/notebook/NotebookEditorScreen';
import { ProblemEditor } from '../src/features/solver/components/ProblemEditor';
import type { Draft } from '../src/features/solver/draft';
import { useNotebook } from '../src/shared/storage';
import type { SavedProblem } from '../src/shared/storage';
import { ThemeProvider } from '../src/shared/theme';
import { Button } from '../src/shared/ui';

jest.mock('../src/shared/storage', () => ({ useNotebook: jest.fn() }));
jest.mock('../src/features/solver/components/ProblemEditor', () => ({
  ProblemEditor: jest.fn(() => null),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

const saved: SavedProblem = {
  id: 'same-page',
  createdAt: 123,
  problem: defaultProblem(),
  title: 'Homework',
  notes: 'Original notes',
  tags: ['original'],
  pinned: true,
};
let value: ReturnType<typeof useNotebook>;
let renderer: TestRenderer.ReactTestRenderer | undefined;
beforeEach(() => {
  jest.clearAllMocks();
  value = {
    entries: [saved],
    loading: false,
    readOnly: false,
    warning: null,
    save: jest.fn(),
    remove: jest.fn(),
    create: jest.fn().mockResolvedValue(saved),
    update: jest.fn().mockResolvedValue(saved),
    duplicate: jest.fn().mockResolvedValue(saved),
  };
  jest.mocked(useNotebook).mockReturnValue(value);
});
afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined;
  jest.restoreAllMocks();
});
const button = (label: string) =>
  renderer!.root
    .findAllByType(Button)
    .find(node => node.props.label === label)!;
const field = (label: string) =>
  renderer!.root
    .findAllByType(TextInput)
    .find(node => node.props.accessibilityLabel === label)!;
const output = () =>
  renderer!.root
    .findAllByType(Text)
    .flatMap(node =>
      React.Children.toArray(node.props.children).filter(
        child => typeof child === 'string',
      ),
    )
    .join(' ');
const editor = () => renderer!.root.findByType(ProblemEditor);
const draft = () => editor().props.draft as Draft;
async function changeDraft(changes: Partial<Draft>) {
  await act(async () => editor().props.onChange({ ...draft(), ...changes }));
}
async function expand(label: string) {
  const control = renderer!.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  )[0];
  await act(async () => control.props.onPress());
}
async function edit(label: string, text: string) {
  await act(async () => field(label).props.onChangeText(text));
}
async function open(onChooseMethod = jest.fn(), onSaved = jest.fn()) {
  const screen = (selectedMethod?: MethodId) => (
    <ThemeProvider>
      <NotebookEditorScreen
        entryId={saved.id}
        selectedMethod={selectedMethod}
        onChooseMethod={onChooseMethod}
        onSaved={onSaved}
      />
    </ThemeProvider>
  );
  await act(async () => {
    renderer = TestRenderer.create(screen());
  });
  return {
    onChooseMethod,
    onSaved,
    select: async (method: MethodId) => {
      await act(async () => renderer!.update(screen(method)));
    },
  };
}

test('editing offers a separate method picker with the current method and no inline list', async () => {
  const screen = await open();
  expect(output()).toContain('Bisection');
  expect(button('Change method')).toBeDefined();
  await act(async () => button('Change method').props.onPress());
  expect(screen.onChooseMethod).toHaveBeenCalledWith('bisection');
  for (const method of METHODS.filter(
    candidate => candidate.id !== 'bisection',
  )) {
    expect(output()).not.toContain(method.title);
  }
});

test('a returned root method preserves typed details and numeric drafts while updating the same page', async () => {
  const screen = await open();
  await edit('Page title', 'Typed title');
  await expand('Notes and tags');
  await edit('Notes', 'Typed notes');
  await edit('Tags', 'roots, homework');
  await changeDraft({
    expression: 'x^2-2',
    a: '1.25',
    b: '2.75',
    tolerance: '1e-8',
    maxIterations: '120',
    precision: '9',
  });
  await screen.select('secant');
  expect(field('Page title').props.value).toBe('Typed title');
  expect(field('Notes').props.value).toBe('Typed notes');
  expect(field('Tags').props.value).toBe('roots, homework');
  expect(draft()).toEqual(
    expect.objectContaining({
      method: 'secant',
      expression: 'x^2-2',
      tolerance: '1e-8',
      a: '1.25',
      b: '2.75',
    }),
  );
  await changeDraft({ x0: '1.8', x1: '2.4' });
  await act(async () => button('Change method').props.onPress());
  expect(screen.onChooseMethod).toHaveBeenLastCalledWith('secant');
  await act(async () => button('Save changes').props.onPress());
  expect(value.update).toHaveBeenCalledWith(saved.id, {
    title: 'Typed title',
    notes: 'Typed notes',
    tags: ['roots', 'homework'],
    pinned: true,
    problem: expect.objectContaining({
      kind: 'root',
      method: 'secant',
      expression: 'x^2-2',
      a: 1.25,
      b: 2.75,
      x0: 1.8,
      x1: 2.4,
      tolerance: 1e-8,
      maxIterations: 120,
      precision: 9,
    }),
  });
  expect(value.create).not.toHaveBeenCalled();
  expect(screen.onSaved).toHaveBeenCalledWith(saved.id);
});

test('switching categories retains alternate drafts and saves the selected interpolation method', async () => {
  const screen = await open();
  await edit('Page title', 'Category draft');
  await expand('Notes and tags');
  await edit('Notes', 'Keep this note');
  await changeDraft({ expression: 'x^2 =', a: '1e-' });
  await screen.select('lagrange');
  expect(draft().method).toBe('lagrange');
  expect(draft().points[0]).toEqual({ x: '0', y: '0' });
  await changeDraft({
    points: [
      { x: '0', y: '0' },
      { x: '3', y: '9' },
    ],
    targetX: '2',
  });
  await screen.select('bisection');
  expect(draft()).toEqual(
    expect.objectContaining({ expression: 'x^2 =', a: '1e-' }),
  );
  await screen.select('newton-divided');
  expect(draft()).toEqual(
    expect.objectContaining({
      method: 'newton-divided',
      points: [
        { x: '0', y: '0' },
        { x: '3', y: '9' },
      ],
      targetX: '2',
    }),
  );
  await act(async () => button('Save changes').props.onPress());
  expect(value.update).toHaveBeenCalledWith(saved.id, {
    title: 'Category draft',
    notes: 'Keep this note',
    tags: saved.tags,
    pinned: true,
    problem: {
      kind: 'interpolation',
      method: 'newton-divided',
      points: [
        { x: 0, y: 0 },
        { x: 3, y: 9 },
      ],
      targetX: 2,
      precision: 6,
    },
  });
});

test('read-only editing cannot open a method picker', async () => {
  value.readOnly = true;
  const screen = await open();
  expect(button('Change method').props.disabled).toBe(true);
  await act(async () => button('Change method').props.onPress());
  expect(screen.onChooseMethod).not.toHaveBeenCalled();
});

test('a pending save disables method changes even before the busy render', async () => {
  let finish!: (entry: SavedProblem) => void;
  value.update = jest.fn(
    () =>
      new Promise<SavedProblem>(resolve => {
        finish = resolve;
      }),
  );
  const screen = await open();
  const change = button('Change method').props.onPress;
  let pending!: Promise<void>;
  await act(async () => {
    pending = button('Save changes').props.onPress();
    change();
  });
  expect(button('Change method').props.disabled).toBe(true);
  expect(screen.onChooseMethod).not.toHaveBeenCalled();
  await act(async () => {
    finish(saved);
    await pending;
  });
});

test('saving a result remains a metadata form and ignores method-picker parameters', async () => {
  const onChooseMethod = jest.fn();
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider>
        <NotebookEditorScreen
          initialProblem={saved.problem}
          selectedMethod="lagrange"
          onChooseMethod={onChooseMethod}
          onSaved={jest.fn()}
        />
      </ThemeProvider>,
    );
  });
  expect(button('Change method')).toBeUndefined();
  expect(renderer!.root.findAllByType(ProblemEditor)).toHaveLength(0);
  await act(async () => button('Save page').props.onPress());
  expect(value.create).toHaveBeenCalledWith(
    expect.objectContaining({ problem: saved.problem }),
  );
  expect(onChooseMethod).not.toHaveBeenCalled();
});
