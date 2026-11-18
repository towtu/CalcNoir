import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert, Share, TextInput } from 'react-native';
import App from '../App';
import { defaultProblem } from '../src/core/methods';
import * as numerics from '../src/core/numerics';
import { ComparisonScreen } from '../src/features/comparison/ComparisonScreen';
import { NotebookScreen } from '../src/features/notebook/NotebookScreen';
import { PracticeScreen } from '../src/features/practice/PracticeScreen';
import { SolverScreen } from '../src/features/solver';
import { ResultScreen } from '../src/features/solver/ResultScreen';
import {
  NotebookEditorScreen,
  NotebookPageScreen,
} from '../src/features/notebook';
import { calculationReport } from '../src/shared/ui/format';
import { draftFor, problemFor } from '../src/features/solver/draft';
import type { Draft } from '../src/features/solver/draft';
import type { RootMethod } from '../src/core/numerics/types';
import { createNotebookRepository } from '../src/shared/storage/notebook';
import { NotebookProvider, useNotebook } from '../src/shared/storage';
import { ThemeProvider, useTheme } from '../src/shared/theme';
import { Button, Notice } from '../src/shared/ui';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let theme!: ReturnType<typeof useTheme>;
function ThemeProbe() {
  theme = useTheme();
  return null;
}

let notebook!: ReturnType<typeof useNotebook>;
function NotebookProbe() {
  notebook = useNotebook();
  return null;
}

let renderer: TestRenderer.ReactTestRenderer | undefined;
const button = (label: string, root = renderer!.root) =>
  root.findAllByType(Button).find(item => item.props.label === label)!;
const field = (label: string) =>
  renderer!.root
    .findAllByType(TextInput)
    .find(item => item.props.accessibilityLabel === label)!;
const tab = (label: string) =>
  renderer!.root.findAll(
    item =>
      item.props.accessibilityLargeContentTitle === label &&
      typeof item.props.onPress === 'function',
  )[0];

const goToSolve = async () => {
  const target = renderer!.root.findAll(
    node =>
      node.props.accessibilityLargeContentTitle === 'Solve' &&
      typeof node.props.onPress === 'function',
  )[0];
  await act(async () => target.props.onPress({ preventDefault: jest.fn() }));
};
const control = (label: string, root = renderer!.root) =>
  root
    .findAll(
      item =>
        item.props.accessibilityLabel === label &&
        typeof item.props.onPress === 'function',
    )
    .slice(-1)[0];
const currentResult = () =>
  renderer!.root.findAllByType(ResultScreen).slice(-1)[0];

async function render(children: React.ReactNode) {
  await act(async () => {
    renderer = TestRenderer.create(<ThemeProvider>{children}</ThemeProvider>);
  });
}

beforeEach(() => {
  jest
    .mocked(AsyncStorage.getItem)
    .mockReset()
    .mockImplementation(async key =>
      key === 'numelix.tour.v1' ? 'done' : null,
    );
  jest.mocked(AsyncStorage.setItem).mockReset().mockResolvedValue(undefined);
  jest
    .spyOn(globalThis, 'requestAnimationFrame')
    .mockImplementation(callback => {
      callback(0);
      return 1;
    });
});
afterEach(async () => {
  if (renderer) {
    await act(async () => renderer!.unmount());
    renderer = undefined;
  }
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('late stored appearance does not override a newer user choice', async () => {
  const hydration = deferred<string | null>();
  jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(hydration.promise);
  await render(<ThemeProbe />);
  await act(async () => theme.toggleTheme());
  await act(async () => theme.toggleTheme());
  expect(theme.isDark).toBe(false);
  await act(async () => hydration.resolve('dark'));
  expect(theme.isDark).toBe(false);
  expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
    'almost-exact.theme.v1',
    'light',
  );
});

test('two appearance toggles in the same render preserve both changes', async () => {
  await render(<ThemeProbe />);
  await act(async () => {
    theme.toggleTheme();
    theme.toggleTheme();
  });
  expect(theme.isDark).toBe(false);
  expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
    'almost-exact.theme.v1',
    'light',
  );
});

test('appearance writes cannot finish in reverse order and persist an old choice', async () => {
  const firstWrite = deferred<void>();
  let stored = 'light';
  jest
    .mocked(AsyncStorage.setItem)
    .mockImplementationOnce(async (_key, value) => {
      await firstWrite.promise;
      stored = value;
    });
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (_key, value) => {
    stored = value;
  });
  await render(<ThemeProbe />);
  await act(async () => theme.toggleTheme());
  await act(async () => theme.toggleTheme());
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  await act(async () => firstWrite.resolve());
  expect(theme.isDark).toBe(false);
  expect(stored).toBe('light');
});

test('appearance write failures are visible and a later successful choice clears the warning', async () => {
  jest
    .mocked(AsyncStorage.setItem)
    .mockRejectedValueOnce(new Error('disk full'));
  await render(<ThemeProbe />);
  await act(async () => theme.toggleTheme());
  expect(theme.isDark).toBe(true);
  expect(theme.storageWarning).toContain('could not be saved');
  await act(async () => theme.toggleTheme());
  expect(theme.isDark).toBe(false);
  expect(theme.storageWarning).toBeNull();
  expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
    'almost-exact.theme.v1',
    'light',
  );
});

test('a late failed appearance read does not mark a successfully saved choice as failed', async () => {
  const hydration = deferred<string | null>();
  jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(hydration.promise);
  await render(<ThemeProbe />);
  await act(async () => theme.toggleTheme());
  await act(async () => hydration.reject(new Error('old read failed')));
  expect(theme.isDark).toBe(true);
  expect(theme.storageWarning).toBeNull();
});

test('a restored dark appearance is the starting point of the next toggle', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('dark');
  await render(<ThemeProbe />);
  expect(theme.isDark).toBe(true);
  await act(async () => theme.toggleTheme());
  expect(theme.isDark).toBe(false);
  expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
    'almost-exact.theme.v1',
    'light',
  );
});

test('saving preserves an unsupported notebook version instead of replacing its data', async () => {
  const raw = JSON.stringify({
    version: 2,
    entries: [
      { id: 'future-entry', createdAt: 123, problem: defaultProblem() },
    ],
  });
  const storage = {
    getItem: jest.fn(async () => raw),
    setItem: jest.fn(async () => undefined),
  };
  const repository = createNotebookRepository(storage);
  expect((await repository.load()).warning).toMatch(/not supported/);
  await expect(repository.save(defaultProblem('secant'))).rejects.toThrow();
  expect(storage.setItem).not.toHaveBeenCalled();
});

test.each([
  ['malformed JSON', '{"entries":['],
  [
    'unsupported schema',
    JSON.stringify({
      version: 2,
      entries: [
        { id: 'future-entry', createdAt: 123, problem: defaultProblem() },
      ],
    }),
  ],
])(
  'the app preserves a notebook with %s while result sharing still works',
  async (_description, original) => {
    let raw = original;
    jest
      .mocked(AsyncStorage.getItem)
      .mockImplementation(async key =>
        key === 'almost-exact.notebook.v1'
          ? raw
          : key === 'numelix.tour.v1'
          ? 'done'
          : null,
      );
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      if (key === 'almost-exact.notebook.v1') raw = value;
    });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
      activityType: undefined,
    });
    await act(async () => {
      renderer = TestRenderer.create(<App />);
    });
    await goToSolve();
    await act(async () => control('Open Bisection').props.onPress());
    await act(async () => button('Calculate').props.onPress());
    const result = currentResult();
    expect(result.props.notebookReadOnly).toBe(true);
    expect(result.props.notebookWarning).toContain('preserved');
    expect(button('Save problem', result).props.disabled).toBe(true);
    expect(
      result
        .findAllByType(Notice)
        .some(notice => notice.props.message === result.props.notebookWarning),
    ).toBe(true);
    await act(async () => button('Save problem', result).props.onPress());
    expect(renderer!.root.findAllByType(NotebookEditorScreen)).toHaveLength(0);
    await act(async () => control('More actions', result).props.onPress());
    expect(button('Compare methods', currentResult()).props.disabled).not.toBe(
      true,
    );
    await act(async () =>
      button('Share calculation', currentResult()).props.onPress(),
    );
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        message: calculationReport(result.props.calculation),
      }),
    );
    await act(async () => control('Back').props.onPress());
    await act(async () => control('Back').props.onPress());
    await act(async () =>
      tab('Notebook').props.onPress({ preventDefault: jest.fn() }),
    );
    expect(renderer!.root.findAllByType(NotebookScreen)).toHaveLength(1);
    expect(button('Delete page')).toBeUndefined();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(raw).toBe(original);
  },
);

test('a partially recovered notebook calculates and shares valid entries while mutations stay blocked', async () => {
  const problem = defaultProblem('secant');
  const original = JSON.stringify({
    version: 1,
    entries: [
      { id: 'recoverable-entry', createdAt: 123, problem },
      { id: 'invalid-entry', createdAt: 124, problem: { kind: 'unknown' } },
    ],
  });
  let raw = original;
  jest
    .mocked(AsyncStorage.getItem)
    .mockImplementation(async key =>
      key === 'almost-exact.notebook.v1'
        ? raw
        : key === 'numelix.tour.v1'
        ? 'done'
        : null,
    );
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
    if (key === 'almost-exact.notebook.v1') raw = value;
  });
  const share = jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
  await act(async () => {
    renderer = TestRenderer.create(<App />);
  });
    await goToSolve();
  await act(async () =>
    tab('Notebook').props.onPress({ preventDefault: jest.fn() }),
  );
  await act(async () => control('Open Secant').props.onPress());
  const page = renderer!.root.findByType(NotebookPageScreen);
  expect(page.props.entryId).toBe('recoverable-entry');
  expect(button('Edit', page).props.disabled).toBe(true);
  await act(async () => control('More', page).props.onPress());
  expect(button('Delete page', page).props.disabled).toBe(true);
  await act(async () => button('Calculate', page).props.onPress());
  const result = currentResult();
  expect(result.props.calculation.problem).toEqual(problem);
  expect(button('Update saved page', result).props.disabled).toBe(true);
  await act(async () => button('Update saved page', result).props.onPress());
  await act(async () => control('More actions', result).props.onPress());
  await act(async () =>
    button('Share calculation', currentResult()).props.onPress(),
  );
  expect(share).toHaveBeenCalledWith(
    expect.objectContaining({
      message: calculationReport(result.props.calculation),
    }),
  );
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(raw).toBe(original);
});

test('saving during notebook startup preserves existing entries and confirmed page deletion survives reopen', async () => {
  const original = defaultProblem('bisection');
  const second = defaultProblem('secant');
  let raw = JSON.stringify({
    version: 1,
    entries: [{ id: 'existing', createdAt: 123, problem: original }],
  });
  const hydration = deferred<string | null>();
  let notebookReads = 0;
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => {
    if (key !== 'almost-exact.notebook.v1') return null;
    notebookReads++;
    return notebookReads === 1 ? hydration.promise : raw;
  });
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (_key, value) => {
    raw = value;
  });
  const onOpen = jest.fn();
  await render(
    <NotebookProvider>
      <NotebookProbe />
      <NotebookScreen onOpen={onOpen} onCreate={jest.fn()} />
    </NotebookProvider>,
  );
  expect(notebook.loading).toBe(true);
  let save!: Promise<void>;
  await act(async () => {
    save = notebook.save(second);
  });
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  await act(async () => {
    hydration.resolve(raw);
    await save;
  });
  expect(notebook.loading).toBe(false);
  expect(notebook.entries.map(entry => entry.problem)).toEqual([
    second,
    original,
  ]);
  const savedId = notebook.entries[0].id;
  await act(async () => control('Open Secant').props.onPress());
  expect(onOpen).toHaveBeenCalledWith(savedId);
  const onDeleted = jest.fn();
  await act(async () =>
    renderer!.update(
      <ThemeProvider>
        <NotebookProvider>
          <NotebookProbe />
          <NotebookPageScreen
            entryId={savedId}
            onOpen={onOpen}
            onEdit={jest.fn()}
            onCalculate={jest.fn()}
            onDeleted={onDeleted}
          />
        </NotebookProvider>
      </ThemeProvider>,
    ),
  );
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await act(async () => control('More').props.onPress());
  await act(async () => button('Delete page').props.onPress());
  const actions = alert.mock.calls[0][2]!;
  expect(actions[0].style).toBe('cancel');
  const confirm = actions.find(action => action.style === 'destructive')!;
  await act(async () => {
    await confirm.onPress!();
  });
  expect(onDeleted).toHaveBeenCalledTimes(1);
  expect(notebook.entries.map(entry => entry.problem)).toEqual([original]);
  await act(async () =>
    renderer!.update(
      <ThemeProvider>
        <NotebookProvider key="reopened">
          <NotebookProbe />
          <NotebookScreen onOpen={onOpen} onCreate={jest.fn()} />
        </NotebookProvider>
      </ThemeProvider>,
    ),
  );
  expect(notebook.loading).toBe(false);
  expect(notebook.entries.map(entry => entry.problem)).toEqual([original]);
  await act(async () => control('Open Bisection').props.onPress());
  expect(onOpen).toHaveBeenLastCalledWith('existing');
});

test('editing a checked practice answer clears its previous correctness message', async () => {
  await render(<PracticeScreen />);
  await act(async () => field('Your answer').props.onChangeText('1.5'));
  await act(async () => button('Check my answer').props.onPress());
  expect(
    renderer!.root
      .findAllByType(Notice)
      .some(notice => notice.props.message.startsWith('Exactly.')),
  ).toBe(true);
  await act(async () => field('Your answer').props.onChangeText('9'));
  expect(
    renderer!.root
      .findAllByType(Notice)
      .some(notice => notice.props.message.startsWith('Exactly.')),
  ).toBe(false);
});

test('separate method pages never inherit incomplete fields from another method', async () => {
  await act(async () => {
    renderer = TestRenderer.create(<App />);
  });
    await goToSolve();
  await act(async () => control('Open Bisection').props.onPress());
  await act(async () => field('Bracket start a').props.onChangeText('-'));
  await act(async () => control('Back').props.onPress());
  await act(async () => control('Open Newton-Raphson').props.onPress());
  expect(field('Bracket start a')).toBeUndefined();
  await act(async () => button('Calculate').props.onPress());
  expect(currentResult().props.calculation.problem).toEqual(
    defaultProblem('newton'),
  );
  expect(currentResult().props.calculation.status).toBe('converged');
});

test.each<{
  method: RootMethod;
  hidden: Partial<Draft>;
}>([
  { method: 'bisection', hidden: { x0: '-', x1: '1e-' } },
  { method: 'newton', hidden: { a: '-', b: '', x1: 'Infinity' } },
  { method: 'secant', hidden: { a: '1e-999', b: '1e' } },
  { method: 'fixed-point', hidden: { a: '-', b: '', x1: 'NaN' } },
])(
  '$method uses finite starter settings only for invalid hidden inputs',
  ({ method, hidden }) => {
    const starter = defaultProblem(method);
    if (starter.kind !== 'root') {
      throw new Error('Expected root starter');
    }
    const draft = { ...draftFor(starter), ...hidden };
    const before = JSON.stringify(draft);
    const problem = problemFor(draft);
    expect(problem).toEqual(starter);
    expect(JSON.stringify(draft)).toBe(before);
  },
);

test('complete hidden settings are preserved in the calculated snapshot', () => {
  const problem = problemFor({
    ...draftFor(defaultProblem('newton')),
    a: '-17',
    b: '22',
    x1: '3e2',
  });
  expect(problem).toEqual(expect.objectContaining({ a: -17, b: 22, x1: 300 }));
});

test.each<{
  method: RootMethod;
  field: 'a' | 'b' | 'x0' | 'x1';
}>([
  { method: 'bisection', field: 'a' },
  { method: 'bisection', field: 'b' },
  { method: 'newton', field: 'x0' },
  { method: 'secant', field: 'x1' },
  { method: 'fixed-point', field: 'x0' },
])(
  '$method still rejects an incomplete active $field',
  ({ method, field: name }) => {
    expect(() =>
      problemFor({ ...draftFor(defaultProblem(method)), [name]: '-' }),
    ).toThrow('must be a complete, finite number');
  },
);

test('double pressing calculate and page save performs each operation once', async () => {
  const pendingFrame = deferred<void>();
  const write = deferred<void>();
  const onCalculated = jest.fn();
  jest.mocked(requestAnimationFrame).mockImplementation(callback => {
    pendingFrame.promise.then(() => callback(0));
    return 1;
  });
  await render(<SolverScreen onCalculated={onCalculated} />);
  let firstRun!: Promise<void>;
  await act(async () => {
    const run = button('Calculate').props.onPress;
    firstRun = run();
    run();
  });
  expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  expect(button('Calculating…').props.busy).toBe(true);
  await act(async () => {
    pendingFrame.resolve();
    await firstRun;
  });
  expect(onCalculated).toHaveBeenCalledTimes(1);
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => write.promise);
  const onSaved = jest.fn();
  await act(async () =>
    renderer!.update(
      <ThemeProvider>
        <NotebookProvider>
          <NotebookEditorScreen
            initialProblem={onCalculated.mock.calls[0][0].problem}
            onSaved={onSaved}
          />
        </NotebookProvider>
      </ThemeProvider>,
    ),
  );
  let firstSave!: Promise<void>;
  await act(async () => {
    const save = button('Save page').props.onPress;
    firstSave = save();
    save();
  });
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  expect(button('Save page').props.busy).toBe(true);
  expect(onSaved).not.toHaveBeenCalled();
  await act(async () => {
    write.resolve();
    await firstSave;
  });
  expect(button('Save page').props.busy).toBe(false);
  expect(onSaved).toHaveBeenCalledTimes(1);
});

test('a solver unmounted before its pending frame completes never publishes a result', async () => {
  const frame = deferred<void>();
  jest.mocked(requestAnimationFrame).mockImplementation(callback => {
    frame.promise.then(() => callback(0));
    return 1;
  });
  const onCalculated = jest.fn();
  await render(<SolverScreen onCalculated={onCalculated} />);
  let run!: Promise<void>;
  await act(async () => {
    run = button('Calculate').props.onPress();
  });
  await act(async () => renderer!.unmount());
  renderer = undefined;
  await act(async () => {
    frame.resolve();
    await run;
  });
  expect(onCalculated).not.toHaveBeenCalled();
});

test('comparison replaces pending work with the latest problem and opens those exact inputs', async () => {
  jest.useFakeTimers();
  const compute = jest.spyOn(numerics, 'calculate');
  const onOpen = jest.fn();
  const initial = defaultProblem('bisection');
  const latest = defaultProblem('lagrange');
  await render(<ComparisonScreen problem={initial} onOpen={onOpen} />);
  await act(async () => {
    renderer!.update(
      <ThemeProvider>
        <ComparisonScreen problem={latest} onOpen={onOpen} />
      </ThemeProvider>,
    );
  });
  await act(async () => {
    jest.advanceTimersByTime(20);
  });
  const open = renderer!.root
    .findAllByType(Button)
    .filter(item => item.props.label === 'View these steps');
  expect(open).toHaveLength(2);
  expect(compute).toHaveBeenCalledTimes(2);
  expect(
    compute.mock.calls.every(([problem]) => problem.kind === 'interpolation'),
  ).toBe(true);
  await act(async () => open[1].props.onPress());
  expect(onOpen).toHaveBeenCalledWith(latest);
});

test('unmounting a comparison cancels its pending computation', async () => {
  jest.useFakeTimers();
  const compute = jest.spyOn(numerics, 'calculate');
  await render(
    <ComparisonScreen problem={defaultProblem()} onOpen={jest.fn()} />,
  );
  await act(async () => renderer!.unmount());
  renderer = undefined;
  await act(async () => jest.runOnlyPendingTimers());
  expect(compute).not.toHaveBeenCalled();
});

test('result sharing exports its exact snapshot while returning to input exposes no share action', async () => {
  const share = jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
  await act(async () => {
    renderer = TestRenderer.create(<App />);
  });
    await goToSolve();
  await act(async () => control('Open Bisection').props.onPress());
  await act(async () => button('Calculate').props.onPress());
  const result = currentResult();
  expect(result.props.calculation.problem).toEqual(defaultProblem());
  await act(async () => control('More actions', result).props.onPress());
  await act(async () =>
    button('Share calculation', currentResult()).props.onPress(),
  );
  expect(share).toHaveBeenCalledWith({
    title: 'Numelix calculation',
    message: calculationReport(result.props.calculation),
  });
  await act(async () => control('Back').props.onPress());
  await act(async () => field('Equation or f(x)').props.onChangeText('x^2-2'));
  const input = renderer!.root.findAllByType(SolverScreen).slice(-1)[0];
  expect(button('Share calculation', input)).toBeUndefined();
  expect(share).toHaveBeenCalledTimes(1);
});
