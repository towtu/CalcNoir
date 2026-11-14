import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert, TextInput } from 'react-native';
import { defaultProblem } from '../src/core/methods';
import { NotebookScreen } from '../src/features/notebook/NotebookScreen';
import { NotebookPageScreen } from '../src/features/notebook/NotebookPageScreen';
import { NotebookEditorScreen } from '../src/features/notebook/NotebookEditorScreen';
import { useNotebook } from '../src/shared/storage';
import type { SavedProblem } from '../src/shared/storage';
import { NotebookWriteError } from '../src/shared/storage/notebook';
import { ThemeProvider } from '../src/shared/theme';
import { Button } from '../src/shared/ui';

jest.mock('../src/shared/storage', () => ({ useNotebook: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

const first: SavedProblem = {
  id: 'first',
  createdAt: Date.parse('2026-11-14T10:00:00.000Z'),
  problem: defaultProblem(),
  title: 'Square root homework',
  notes: 'Check the classroom example',
  tags: ['week-one'],
  pinned: true,
};
const second: SavedProblem = {
  id: 'second',
  createdAt: Date.parse('2026-11-14T11:00:00.000Z'),
  problem: defaultProblem('lagrange'),
};
const writeFailures = [
  [
    'capacity',
    'Notebook is full (40 pages). Delete a page before adding another.',
  ],
  [
    'size',
    'The notebook is too large to save safely. Shorten notes or delete a page before trying again.',
  ],
] as const;

function notebook(overrides = {}) {
  const value = {
    entries: [first, second],
    loading: false,
    warning: null,
    readOnly: false,
    save: jest.fn(),
    create: jest.fn().mockResolvedValue(first),
    update: jest.fn().mockResolvedValue(first),
    duplicate: jest.fn().mockResolvedValue({ ...first, id: 'copy' }),
    remove: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  jest.mocked(useNotebook).mockReturnValue(value);
  return value;
}

async function renderScreen(screen: React.ReactNode) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<ThemeProvider>{screen}</ThemeProvider>);
  });
  const button = (label: string) =>
    renderer.root
      .findAllByType(Button)
      .find(item => item.props.label === label)!;
  const control = (label: string) =>
    renderer.root.findAll(
      item =>
        item.props.accessibilityRole === 'button' &&
        item.props.accessibilityLabel === label &&
        typeof item.props.onPress === 'function',
    )[0];
  const field = (label: string) =>
    renderer.root
      .findAllByType(TextInput)
      .find(item => item.props.accessibilityLabel === label)!;
  const text = () => JSON.stringify(renderer.toJSON());
  return { renderer, button, control, field, text };
}

beforeEach(() => {
  jest.clearAllMocks();
  notebook();
});
afterEach(() => jest.restoreAllMocks());

test('notebook opens a saved page by id and creates through the methods flow', async () => {
  const onOpen = jest.fn();
  const onCreate = jest.fn();
  const screen = await renderScreen(
    <NotebookScreen onOpen={onOpen} onCreate={onCreate} />,
  );
  expect(screen.text()).toContain('Square root homework');
  expect(screen.text()).toContain('Lagrange');
  await act(async () =>
    screen.control('Open Square root homework').props.onPress(),
  );
  expect(onOpen).toHaveBeenCalledWith('first');
  await act(async () => screen.button('New problem').props.onPress());
  expect(onCreate).toHaveBeenCalledTimes(1);
  expect(screen.button('Delete page')).toBeUndefined();
  await act(async () => screen.renderer.unmount());
});

test('every notebook row has a separate visible pin control that updates metadata without opening the page', async () => {
  const value = notebook();
  const onOpen = jest.fn();
  const content = <NotebookScreen onOpen={onOpen} onCreate={jest.fn()} />;
  const screen = await renderScreen(content);
  expect(screen.control('Unpin Square root homework')).toBeDefined();
  expect(screen.control('Pin Lagrange')).toBeDefined();
  expect(screen.control('Open Lagrange').findAllByType(Button)).toHaveLength(0);
  await act(async () => screen.control('Pin Lagrange').props.onPress());
  expect(onOpen).not.toHaveBeenCalled();
  expect(value.update).toHaveBeenCalledWith('second', {
    problem: second.problem,
    title: 'Lagrange',
    notes: '',
    tags: [],
    pinned: true,
  });
  value.entries = [first, { ...second, pinned: true }];
  await act(async () =>
    screen.renderer.update(<ThemeProvider>{content}</ThemeProvider>),
  );
  expect(screen.control('Pin Lagrange')).toBeUndefined();
  expect(screen.control('Unpin Lagrange')).toBeDefined();
  await act(async () => screen.control('Unpin Lagrange').props.onPress());
  expect(value.update).toHaveBeenLastCalledWith(
    'second',
    expect.objectContaining({ pinned: false }),
  );
  expect(onOpen).not.toHaveBeenCalled();
  await act(async () => screen.renderer.unmount());
});

test.each(['list', 'page'] as const)(
  '%s pin control blocks immediate reentry and reflects persisted state',
  async surface => {
    let finish!: (entry: SavedProblem) => void;
    const value = notebook({
      update: jest.fn(
        () =>
          new Promise<SavedProblem>(resolve => {
            finish = resolve;
          }),
      ),
    });
    const content =
      surface === 'list' ? (
        <NotebookScreen onOpen={jest.fn()} onCreate={jest.fn()} />
      ) : (
        pageScreen()
      );
    const screen = await renderScreen(content);
    let pending!: Promise<void>;
    await act(async () => {
      const pin = screen.control('Unpin Square root homework').props.onPress;
      pending = pin();
      pin();
    });
    expect(value.update).toHaveBeenCalledTimes(1);
    expect(value.update).toHaveBeenCalledWith('first', {
      problem: first.problem,
      title: first.title,
      notes: first.notes,
      tags: first.tags,
      pinned: false,
    });
    expect(screen.button('Unpin').props.busy).toBe(true);
    expect(screen.control('Pin Square root homework')).toBeUndefined();
    value.entries = [{ ...first, pinned: false }, second];
    await act(async () => {
      finish(value.entries[0]);
      await pending;
    });
    expect(screen.control('Unpin Square root homework')).toBeUndefined();
    expect(screen.control('Pin Square root homework')).toBeDefined();
    expect(screen.button('Pin').props.busy).toBe(false);
    await act(async () => screen.renderer.unmount());
  },
);

test.each(['list', 'page'] as const)(
  '%s leaves the saved pin unchanged and reports a failed write',
  async surface => {
    const value = notebook({
      update: jest
        .fn()
        .mockRejectedValue(new Error('/private/notebook.db failed')),
    });
    const onOpen = jest.fn();
    const screen = await renderScreen(
      surface === 'list' ? (
        <NotebookScreen onOpen={onOpen} onCreate={jest.fn()} />
      ) : (
        pageScreen({ onOpen })
      ),
    );
    await act(async () =>
      screen.control('Unpin Square root homework').props.onPress(),
    );
    expect(value.update).toHaveBeenCalledTimes(1);
    expect(screen.text()).toContain('The pin could not be changed');
    expect(screen.text()).not.toContain('/private/notebook.db');
    expect(screen.control('Unpin Square root homework')).toBeDefined();
    expect(screen.button('Unpin').props.busy).toBe(false);
    expect(first.pinned).toBe(true);
    expect(first.notes).toBe('Check the classroom example');
    expect(onOpen).not.toHaveBeenCalled();
    await act(async () => screen.renderer.unmount());
  },
);

test.each(['list', 'page'] as const)(
  '%s shows a disabled pin control in a read-only notebook and refuses direct mutation',
  async surface => {
    const value = notebook({ readOnly: true });
    const screen = await renderScreen(
      surface === 'list' ? (
        <NotebookScreen onOpen={jest.fn()} onCreate={jest.fn()} />
      ) : (
        pageScreen()
      ),
    );
    expect(
      screen.control('Unpin Square root homework').props.accessibilityState
        .disabled,
    ).toBe(true);
    await act(async () =>
      screen.control('Unpin Square root homework').props.onPress(),
    );
    expect(value.update).not.toHaveBeenCalled();
    await act(async () => screen.renderer.unmount());
  },
);

test('notebook searches notes, tags, equations and methods and filters pinned pages', async () => {
  const screen = await renderScreen(
    <NotebookScreen onOpen={jest.fn()} onCreate={jest.fn()} />,
  );
  for (const query of ['classroom', 'week-one', 'x^3', 'Bisection']) {
    await act(async () =>
      screen.field('Search pages').props.onChangeText(query),
    );
    expect(screen.control('Open Square root homework')).toBeDefined();
    expect(screen.control('Open Lagrange')).toBeUndefined();
  }
  await act(async () => screen.field('Search pages').props.onChangeText(''));
  await act(async () => screen.control('Pinned').props.onPress());
  expect(screen.control('Pinned').props.accessibilityState.selected).toBe(true);
  expect(screen.control('Open Lagrange')).toBeUndefined();
  await act(async () =>
    screen.field('Search pages').props.onChangeText('missing'),
  );
  expect(screen.text()).toContain('No matching pages');
  await act(async () => screen.renderer.unmount());
});

test('notebook distinguishes opening, empty and read-only states', async () => {
  notebook({ loading: true, entries: [] });
  const opening = await renderScreen(
    <NotebookScreen onOpen={jest.fn()} onCreate={jest.fn()} />,
  );
  expect(opening.text()).toContain('Opening notebook');
  expect(opening.text()).not.toContain('Your notebook is empty');
  await act(async () => opening.renderer.unmount());
  notebook({
    entries: [],
    readOnly: true,
    warning: 'Notebook format is newer.',
  });
  const empty = await renderScreen(
    <NotebookScreen onOpen={jest.fn()} onCreate={jest.fn()} />,
  );
  expect(empty.text()).toContain('Notebook format is newer.');
  expect(empty.text()).toContain('Your notebook is empty');
  await act(async () => empty.renderer.unmount());
});

function pageScreen(props = {}) {
  return (
    <NotebookPageScreen
      entryId="first"
      onEdit={jest.fn()}
      onCalculate={jest.fn()}
      onOpen={jest.fn()}
      onDeleted={jest.fn()}
      {...props}
    />
  );
}

test('a page shows its pin action immediately and keeps duplication and deletion secondary', async () => {
  const onCalculate = jest.fn();
  const onEdit = jest.fn();
  const screen = await renderScreen(pageScreen({ onCalculate, onEdit }));
  expect(screen.text()).toContain('Square root homework');
  expect(screen.text()).toContain('Check the classroom example');
  expect(screen.text()).toContain('week-one');
  expect(screen.button('Unpin')).toBeDefined();
  expect(screen.renderer.root.findAllByType(Button)[0].props.label).toBe('Unpin');
  expect(screen.control('Unpin Square root homework')).toBeDefined();
  expect(screen.button('Duplicate page')).toBeUndefined();
  expect(screen.button('Delete page')).toBeUndefined();
  await act(async () => screen.button('Calculate').props.onPress());
  expect(onCalculate).toHaveBeenCalledWith(first.problem, 'first');
  await act(async () => screen.button('Edit').props.onPress());
  expect(onEdit).toHaveBeenCalledWith('first');
  await act(async () => screen.control('More').props.onPress());
  expect(screen.button('Duplicate page')).toBeDefined();
  expect(screen.button('Unpin page')).toBeUndefined();
  await act(async () => screen.renderer.unmount());
});

test('pinning preserves problem and page metadata and duplicate opens only after persistence', async () => {
  let finish!: (entry: SavedProblem) => void;
  const value = notebook({
    duplicate: jest.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    ),
  });
  const onOpen = jest.fn();
  const screen = await renderScreen(pageScreen({ onOpen }));
  await act(async () => screen.button('Unpin').props.onPress());
  expect(value.update).toHaveBeenCalledWith('first', {
    problem: first.problem,
    title: first.title,
    notes: first.notes,
    tags: first.tags,
    pinned: false,
  });
  await act(async () => screen.control('More').props.onPress());
  let pending!: Promise<void>;
  await act(async () => {
    pending = screen.button('Duplicate page').props.onPress();
    screen.button('Duplicate page').props.onPress();
  });
  expect(value.duplicate).toHaveBeenCalledTimes(1);
  expect(screen.button('Duplicate page').props.busy).toBe(true);
  expect(onOpen).not.toHaveBeenCalled();
  await act(async () => {
    finish({ ...first, id: 'copy' });
    await pending;
  });
  expect(onOpen).toHaveBeenCalledWith('copy');
  await act(async () => screen.renderer.unmount());
});

test('leaving a page while duplication is pending does not open the copy later', async () => {
  let finish!: (entry: SavedProblem) => void;
  const value = notebook({
    duplicate: jest.fn(
      () =>
        new Promise<SavedProblem>(resolve => {
          finish = resolve;
        }),
    ),
  });
  const onOpen = jest.fn();
  const screen = await renderScreen(pageScreen({ onOpen }));
  await act(async () => screen.control('More').props.onPress());
  let pending!: Promise<void>;
  await act(async () => {
    pending = screen.button('Duplicate page').props.onPress();
  });
  expect(value.duplicate).toHaveBeenCalledWith('first');
  expect(onOpen).not.toHaveBeenCalled();
  await act(async () => screen.renderer.unmount());
  await act(async () => {
    finish({ ...first, id: 'copy' });
    await pending;
  });
  expect(onOpen).not.toHaveBeenCalled();
});

test('leaving a page while confirmed deletion is pending does not navigate later', async () => {
  let finish!: () => void;
  const value = notebook({
    remove: jest.fn(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        }),
    ),
  });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const onDeleted = jest.fn();
  const screen = await renderScreen(pageScreen({ onDeleted }));
  await act(async () => screen.control('More').props.onPress());
  await act(async () => screen.button('Delete page').props.onPress());
  const confirm = alert.mock.calls[0][2]!.find(
    action => action.style === 'destructive',
  )!;
  let pending!: Promise<void>;
  await act(async () => {
    pending = Promise.resolve(confirm.onPress!());
  });
  expect(value.remove).toHaveBeenCalledWith('first');
  expect(onDeleted).not.toHaveBeenCalled();
  await act(async () => screen.renderer.unmount());
  await act(async () => {
    finish();
    await pending;
  });
  expect(onDeleted).not.toHaveBeenCalled();
});

test.each(writeFailures)(
  'duplication shows the trusted %s explanation without exposing storage details',
  async (code, message) => {
    notebook({
      duplicate: jest.fn().mockRejectedValue(
        Object.assign(new NotebookWriteError(code), {
          message: '/private/notebook.db internal failure',
        }),
      ),
    });
    const onOpen = jest.fn();
    const screen = await renderScreen(pageScreen({ onOpen }));
    await act(async () => screen.control('More').props.onPress());
    await act(async () => screen.button('Duplicate page').props.onPress());
    expect(screen.text()).toContain(message);
    expect(screen.text()).not.toContain('/private/notebook.db');
    expect(screen.text()).toContain(first.notes);
    expect(onOpen).not.toHaveBeenCalled();
    await act(async () => screen.renderer.unmount());
  },
);

test('delete confirms natively and failure leaves the page available', async () => {
  const value = notebook({
    remove: jest.fn().mockRejectedValue(new Error('disk full')),
  });
  const alert = jest.spyOn(Alert, 'alert');
  const onDeleted = jest.fn();
  const screen = await renderScreen(pageScreen({ onDeleted }));
  await act(async () => screen.control('More').props.onPress());
  await act(async () => screen.button('Delete page').props.onPress());
  expect(value.remove).not.toHaveBeenCalled();
  const confirm = alert.mock.calls[0][2]!.find(
    action => action.style === 'destructive',
  )!;
  await act(async () => {
    await confirm.onPress!();
  });
  expect(value.remove).toHaveBeenCalledWith('first');
  expect(onDeleted).not.toHaveBeenCalled();
  expect(screen.text()).toContain('The page could not be deleted');
  expect(screen.text()).toContain('Square root homework');
  expect(screen.text()).not.toContain('disk full');
  await act(async () => screen.renderer.unmount());
});

test('missing pages have a useful state and read-only pages still calculate', async () => {
  notebook({ entries: [] });
  const missing = await renderScreen(pageScreen());
  expect(missing.text()).toContain('Page not found');
  await act(async () => missing.renderer.unmount());
  notebook({ readOnly: true });
  const readonly = await renderScreen(pageScreen());
  expect(readonly.button('Calculate').props.disabled).not.toBe(true);
  expect(readonly.button('Edit').props.disabled).toBe(true);
  await act(async () => readonly.control('More').props.onPress());
  for (const label of ['Unpin', 'Duplicate page', 'Delete page']) {
    expect(readonly.button(label).props.disabled).toBe(true);
  }
  await act(async () => readonly.renderer.unmount());
});

test('saving a result starts as a short metadata form with optional details collapsed', async () => {
  const value = notebook();
  const onSaved = jest.fn();
  const screen = await renderScreen(
    <NotebookEditorScreen initialProblem={first.problem} onSaved={onSaved} />,
  );
  expect(screen.field('Page title').props.value).toBe('Bisection');
  expect(screen.field('Notes')).toBeUndefined();
  expect(screen.field('Equation or f(x)')).toBeUndefined();
  await act(async () =>
    screen.field('Page title').props.onChangeText('My exercise'),
  );
  await act(async () => screen.control('Notes and tags').props.onPress());
  await act(async () =>
    screen.field('Notes').props.onChangeText('Try a narrower bracket.'),
  );
  await act(async () =>
    screen.field('Tags').props.onChangeText('roots, homework'),
  );
  await act(async () => screen.button('Save page').props.onPress());
  expect(value.create).toHaveBeenCalledWith({
    problem: first.problem,
    title: 'My exercise',
    notes: 'Try a narrower bracket.',
    tags: ['roots', 'homework'],
    pinned: false,
  });
  expect(onSaved).toHaveBeenCalledWith('first');
  await act(async () => screen.renderer.unmount());
});

test('editing updates the same page and a failed write preserves the entered draft', async () => {
  const value = notebook({
    update: jest
      .fn()
      .mockRejectedValue(new Error('write failed at /private/notebook.db')),
  });
  const onSaved = jest.fn();
  const screen = await renderScreen(
    <NotebookEditorScreen entryId="first" onSaved={onSaved} />,
  );
  await act(async () =>
    screen.field('Page title').props.onChangeText('Revised homework'),
  );
  await act(async () =>
    screen.field('Equation or f(x)').props.onChangeText('x^2-2'),
  );
  await act(async () => screen.button('Save changes').props.onPress());
  expect(value.update).toHaveBeenCalledWith(
    'first',
    expect.objectContaining({
      title: 'Revised homework',
      problem: expect.objectContaining({ expression: 'x^2-2' }),
      pinned: true,
    }),
  );
  expect(screen.field('Page title').props.value).toBe('Revised homework');
  expect(screen.field('Equation or f(x)').props.value).toBe('x^2-2');
  expect(screen.text()).toContain('Your changes could not be saved');
  expect(screen.text()).not.toContain('/private/notebook.db');
  expect(onSaved).not.toHaveBeenCalled();
  expect(first.title).toBe('Square root homework');
  await act(async () => screen.renderer.unmount());
});

test.each(writeFailures)(
  'saving shows the trusted %s explanation and retains the draft',
  async (code, message) => {
    notebook({
      create: jest.fn().mockRejectedValue(
        Object.assign(new NotebookWriteError(code), {
          message: '/private/notebook.db internal failure',
        }),
      ),
    });
    const onSaved = jest.fn();
    const screen = await renderScreen(
      <NotebookEditorScreen initialProblem={first.problem} onSaved={onSaved} />,
    );
    await act(async () =>
      screen.field('Page title').props.onChangeText('Keep my draft'),
    );
    await act(async () => screen.button('Save page').props.onPress());
    expect(screen.text()).toContain(message);
    expect(screen.text()).not.toContain('/private/notebook.db');
    expect(screen.field('Page title').props.value).toBe('Keep my draft');
    expect(onSaved).not.toHaveBeenCalled();
    await act(async () => screen.renderer.unmount());
  },
);

test('save waits for persistence, blocks repeated calls and reports validation errors', async () => {
  let finish!: (entry: SavedProblem) => void;
  const value = notebook({
    create: jest.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    ),
  });
  const onSaved = jest.fn();
  const screen = await renderScreen(
    <NotebookEditorScreen initialProblem={first.problem} onSaved={onSaved} />,
  );
  await act(async () => screen.field('Page title').props.onChangeText(' '));
  await act(async () => screen.button('Save page').props.onPress());
  expect(value.create).not.toHaveBeenCalled();
  expect(screen.text()).toContain('Enter a page title');
  await act(async () => screen.field('Page title').props.onChangeText('Ready'));
  let pending!: Promise<void>;
  await act(async () => {
    pending = screen.button('Save page').props.onPress();
    screen.button('Save page').props.onPress();
  });
  expect(value.create).toHaveBeenCalledTimes(1);
  expect(screen.button('Save page').props.busy).toBe(true);
  expect(onSaved).not.toHaveBeenCalled();
  await act(async () => {
    finish(first);
    await pending;
  });
  expect(onSaved).toHaveBeenCalledWith('first');
  await act(async () => screen.renderer.unmount());
});

test('editing another field preserves existing tags that contain commas', async () => {
  const saved = { ...first, tags: ['chapter 1, part 2', 'practice'] };
  const value = notebook({ entries: [saved] });
  const screen = await renderScreen(
    <NotebookEditorScreen entryId="first" onSaved={jest.fn()} />,
  );
  await act(async () =>
    screen.field('Page title').props.onChangeText('Revised title'),
  );
  await act(async () => screen.button('Save changes').props.onPress());
  expect(value.update).toHaveBeenCalledWith(
    'first',
    expect.objectContaining({ tags: saved.tags }),
  );
  await act(async () => screen.renderer.unmount());
});

test('updating a saved page from a result keeps the new calculation inputs', async () => {
  const value = notebook();
  const revised = { ...defaultProblem(), expression: 'x^2 = 3' };
  const screen = await renderScreen(
    <NotebookEditorScreen
      entryId="first"
      initialProblem={revised}
      onSaved={jest.fn()}
    />,
  );
  expect(screen.field('Equation or f(x)')).toBeUndefined();
  await act(async () => screen.button('Save changes').props.onPress());
  expect(value.update).toHaveBeenCalledWith(
    'first',
    expect.objectContaining({ problem: revised, notes: first.notes }),
  );
  await act(async () => screen.renderer.unmount());
});

test('leaving a save screen while persistence is pending does not navigate later', async () => {
  let finish!: (entry: SavedProblem) => void;
  notebook({
    create: jest.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    ),
  });
  const onSaved = jest.fn();
  const screen = await renderScreen(
    <NotebookEditorScreen initialProblem={first.problem} onSaved={onSaved} />,
  );
  let pending!: Promise<void>;
  await act(async () => {
    pending = screen.button('Save page').props.onPress();
  });
  await act(async () => screen.renderer.unmount());
  await act(async () => {
    finish(first);
    await pending;
  });
  expect(onSaved).not.toHaveBeenCalled();
});
