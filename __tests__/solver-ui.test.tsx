import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import { SolverScreen } from '../src/features/solver';
import { StepsScreen } from '../src/features/solver/StepsScreen';
import { TableScreen } from '../src/features/solver/TableScreen';
import { ResultScreen } from '../src/features/solver/ResultScreen';
import { NotebookEditorScreen } from '../src/features/notebook';
import { NotebookProvider } from '../src/shared/storage';
import { ThemeProvider } from '../src/shared/theme';
import { Button, Notice } from '../src/shared/ui';
import { defaultProblem } from '../src/core/methods';
import type { Problem } from '../src/core/numerics/types';
import { CalculationGraph } from '../src/features/solver/components/CalculationGraph';
import { draftFor, problemFor } from '../src/features/solver/draft';
import { calculate } from '../src/core/numerics';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

beforeEach(() => {
  jest.mocked(AsyncStorage.getItem).mockReset().mockResolvedValue(null);
  jest.mocked(AsyncStorage.setItem).mockReset().mockResolvedValue(undefined);
  jest
    .spyOn(globalThis, 'requestAnimationFrame')
    .mockImplementation(callback => {
      callback(0);
      return 1;
    });
});
afterEach(() => jest.restoreAllMocks());

async function renderScreen(children: React.ReactNode) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<ThemeProvider>{children}</ThemeProvider>);
  });
  const button = (label: string) =>
    renderer.root
      .findAllByType(Button)
      .find(item => item.props.label === label)!;
  const field = (label: string) =>
    renderer.root
      .findAllByType(TextInput)
      .find(item => item.props.accessibilityLabel === label)!;
  const control = (label: string) =>
    renderer.root.findAll(
      item =>
        item.props.accessibilityLabel === label &&
        typeof item.props.onPress === 'function',
    )[0];
  return { renderer, button, field, control };
}
async function renderSolver(
  initialProblem: Problem = defaultProblem(),
  onCalculated = jest.fn(),
) {
  return {
    ...(await renderScreen(
      <SolverScreen
        initialProblem={initialProblem}
        onCalculated={onCalculated}
      />,
    )),
    onCalculated,
  };
}

test('the input screen submits a calculation snapshot and leaves invalid edits available', async () => {
  const { renderer, button, field, onCalculated } = await renderSolver();
  await act(async () => button('Calculate').props.onPress());
  expect(onCalculated).toHaveBeenCalledWith(calculate(defaultProblem()));
  expect(renderer.root.findAllByType(ResultScreen)).toHaveLength(0);
  expect(button('Save problem')).toBeUndefined();
  await act(async () => field('Equation or f(x)').props.onChangeText('x^2 ='));
  await act(async () => button('Calculate').props.onPress());
  expect(field('Equation or f(x)').props.value).toBe('x^2 =');
  expect(JSON.stringify(renderer.toJSON())).toContain('Input needs attention');
  expect(onCalculated).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test('incomplete scientific numbers stay drafts and do not become zero', async () => {
  const { renderer, button, field, control, onCalculated } =
    await renderSolver();
  expect(field('Tolerance')).toBeUndefined();
  await act(async () => control('Advanced settings').props.onPress());
  await act(async () => field('Tolerance').props.onChangeText('1e-'));
  await act(async () => button('Calculate').props.onPress());
  expect(field('Tolerance').props.value).toBe('1e-');
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Tolerance must be a complete, finite number.',
  );
  expect(onCalculated).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
});

test('the notebook editor reports storage failure and retains the page draft', async () => {
  jest
    .mocked(AsyncStorage.setItem)
    .mockRejectedValueOnce(new Error('disk unavailable'));
  const onSaved = jest.fn();
  const { renderer, button, field } = await renderScreen(
    <NotebookProvider>
      <NotebookEditorScreen
        initialProblem={defaultProblem()}
        onSaved={onSaved}
      />
    </NotebookProvider>,
  );
  await act(async () =>
    field('Page title').props.onChangeText('Keep this draft'),
  );
  await act(async () => button('Save page').props.onPress());
  expect(onSaved).not.toHaveBeenCalled();
  expect(field('Page title').props.value).toBe('Keep this draft');
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Your changes could not be saved',
  );
  expect(JSON.stringify(renderer.toJSON())).not.toContain('disk unavailable');
  await act(async () => renderer.unmount());
});

test('table rows and step controls carry the same selected index to graph and explanation', async () => {
  const calculation = calculate(defaultProblem());
  const onStep = jest.fn();
  const { renderer, button } = await renderScreen(
    <TableScreen calculation={calculation} onStep={onStep} />,
  );
  const fifth = renderer.root.findAll(
    item =>
      item.props.accessibilityLabel?.startsWith('Show step 5:') &&
      typeof item.props.onPress === 'function',
  )[0];
  await act(async () => fifth.props.onPress());
  expect(onStep).toHaveBeenCalledWith(4);
  const onGraph = jest.fn();
  await act(async () =>
    renderer.update(
      <ThemeProvider>
        <StepsScreen
          calculation={calculation}
          initialStep={onStep.mock.calls[0][0]}
          onGraph={onGraph}
        />
      </ThemeProvider>,
    ),
  );
  await act(async () => button('Next step').props.onPress());
  await act(async () => button('Show on graph').props.onPress());
  expect(onGraph).toHaveBeenCalledWith(5);
  await act(async () => button('Explain this step').props.onPress());
  expect(JSON.stringify(renderer.toJSON())).toContain('Built-in explanation');
  expect(JSON.stringify(renderer.toJSON())).toContain('Bisection · step 6');
  await act(async () =>
    renderer.update(
      <ThemeProvider>
        <CalculationGraph
          calculation={calculation}
          step={calculation.steps[onGraph.mock.calls[0][0]]}
        />
      </ThemeProvider>,
    ),
  );
  expect(renderer.root.findByType(CalculationGraph).props.step.index).toBe(6);
  await act(async () => renderer.unmount());
});

test('method-specific interpolation fields retain invalid point edits and recover on correction', async () => {
  const { renderer, button, field, onCalculated } = await renderSolver(
    defaultProblem('lagrange'),
  );
  expect(field('Equation or f(x)')).toBeUndefined();
  await act(async () => field('Point 2 x').props.onChangeText('0'));
  await act(async () => button('Calculate').props.onPress());
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Every interpolation point must have a distinct x coordinate.',
  );
  expect(field('Point 2 x').props.value).toBe('0');
  expect(onCalculated).not.toHaveBeenCalled();
  await act(async () => field('Point 2 x').props.onChangeText('1'));
  await act(async () => button('Calculate').props.onPress());
  expect(onCalculated).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 'calculated',
      problem: defaultProblem('lagrange'),
    }),
  );
  await act(async () => renderer.unmount());
});

test('a page save stays pending until its local write resolves', async () => {
  let finish!: () => void;
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        finish = resolve;
      }),
  );
  const onSaved = jest.fn();
  const { renderer, button, field } = await renderScreen(
    <NotebookProvider>
      <NotebookEditorScreen
        initialProblem={defaultProblem()}
        onSaved={onSaved}
      />
    </NotebookProvider>,
  );
  let pending!: Promise<void>;
  await act(async () => {
    pending = button('Save page').props.onPress();
  });
  expect(button('Save page').props.busy).toBe(true);
  expect(field('Page title').props.editable).toBe(false);
  expect(onSaved).not.toHaveBeenCalled();
  await act(async () => {
    finish();
    await pending;
  });
  expect(button('Save page').props.busy).toBe(false);
  expect(onSaved).toHaveBeenCalledWith(expect.any(String));
  await act(async () => renderer.unmount());
});

test.each(['1e-999', '-1e-999'])(
  'rejects nonzero input %s that would underflow to zero without changing the draft',
  async text => {
    const { renderer, button, field, onCalculated } = await renderSolver();
    await act(async () => field('Bracket start a').props.onChangeText(text));
    await act(async () => button('Calculate').props.onPress());
    expect(field('Bracket start a').props.value).toBe(text);
    expect(
      renderer.root
        .findAllByType(Notice)
        .some(notice =>
          notice.props.message.includes(
            'Bracket start a is too small to represent without becoming zero.',
          ),
        ),
    ).toBe(true);
    expect(onCalculated).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  },
);

test('explicit zero and the smallest representable positive number remain valid drafts', () => {
  const draft = draftFor(defaultProblem());
  for (const text of ['0', '-0', '0e-999', '5e-324']) {
    const problem = problemFor({ ...draft, a: text });
    expect(problem.kind).toBe('root');
    if (problem.kind === 'root') {
      expect(problem.a).toBe(Number(text));
    }
  }
});

test('keeps a finite interpolated target visible beyond sampled extrema', async () => {
  const calculation = calculate({
    kind: 'interpolation',
    method: 'lagrange',
    precision: 6,
    targetX: 1.5,
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  });
  // A sampled curve need not contain the exact target or polynomial extremum.
  const sparse = {
    ...calculation,
    curve: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  };
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider>
        <CalculationGraph calculation={sparse} />
      </ThemeProvider>,
    );
  });
  const target = renderer.root.findAll(
    item => item.props.r === 5 && typeof item.props.cy === 'number',
  )[0];
  expect(target.props.cy).toBeGreaterThanOrEqual(16);
  expect(target.props.cy).toBeLessThanOrEqual(214);
  await act(async () => renderer.unmount());
});
