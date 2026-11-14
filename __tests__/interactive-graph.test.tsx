import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { calculate } from '../src/core/numerics';
import type { Calculation } from '../src/core/numerics/types';
import { CalculationGraph } from '../src/features/solver/components/CalculationGraph';
import { GraphScreen } from '../src/features/solver/GraphScreen';
import { ThemeProvider } from '../src/shared/theme';
import { Button } from '../src/shared/ui';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

const calculation: Calculation = {
  ...calculate({
    kind: 'interpolation',
    method: 'lagrange',
    precision: 6,
    targetX: 1.5,
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
    ],
  }),
  xDomain: [0, 2],
  curve: [
    { x: 0, y: 0 },
    { x: 0.5, y: 0.25 },
    { x: 1, y: 1 },
    { x: 1.5, y: 2.25 },
    { x: 2, y: 4 },
  ],
};

async function renderGraph(value = calculation) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider>
        <CalculationGraph calculation={value} interactive />
      </ThemeProvider>,
    );
  });
  const button = (label: string) =>
    renderer.root
      .findAllByType(Button)
      .find(item => item.props.label === label)!;
  const plot = () =>
    renderer.root.findAll(
      item =>
        item.props.testID === 'sampled-graph' &&
        typeof item.props.onResponderGrant === 'function',
    )[0];
  return { renderer, button, plot };
}

test('touch and drag inspect stored samples without calculating new values', async () => {
  const value = { ...calculation, functionEvaluations: 17 };
  const { renderer, plot } = await renderGraph(value);
  await act(async () => {
    plot().props.onResponderGrant({ nativeEvent: { locationX: 167 } });
  });
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Sampled point: x = 1, P(x) = 1',
  );
  expect(
    renderer.root.findAll(item => item.props.testID === 'inspected-sample')
      .length,
  ).toBeGreaterThan(0);
  await act(async () => {
    plot().props.onResponderMove({ nativeEvent: { locationX: 10000 } });
  });
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Sampled point: x = 2, P(x) = 4',
  );
  expect(value.functionEvaluations).toBe(17);
  expect(value.curve).toBe(calculation.curve);
  await act(async () => renderer.unmount());
});

test('zoom stays inside the sampled domain and reset restores the entire view', async () => {
  const { renderer, button } = await renderGraph();
  expect(button('Zoom out').props.disabled).toBe(true);
  await act(async () => button('Zoom in').props.onPress());
  const graphLabel = () =>
    renderer.root.findAll(
      item => item.props.accessibilityRole === 'adjustable',
    )[0].props.accessibilityLabel;
  expect(graphLabel()).toContain('x from 0.5 to 1.5');
  await act(async () => button('Zoom in').props.onPress());
  await act(async () => button('Zoom in').props.onPress());
  expect(button('Zoom in').props.disabled).toBe(true);
  expect(graphLabel()).toContain('x from 0.875 to 1.125');
  await act(async () => button('Reset view').props.onPress());
  expect(graphLabel()).toContain('x from 0 to 2');
  expect(button('Zoom out').props.disabled).toBe(true);
  await act(async () => renderer.unmount());
});

test('an undefined sampled value stays a gap with an honest inspection label', async () => {
  const { renderer, plot } = await renderGraph({
    ...calculation,
    curve: [
      { x: 0, y: 0 },
      { x: 1, y: null },
      { x: 2, y: 4 },
    ],
  });
  await act(async () => {
    plot().props.onResponderGrant({ nativeEvent: { locationX: 167 } });
  });
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'No finite sampled value at x = 1',
  );
  expect(
    renderer.root.findAll(item => item.props.testID === 'inspected-sample'),
  ).toHaveLength(0);
  await act(async () => renderer.unmount());
});

test('a calculation without curve samples explains the empty graph', async () => {
  const { renderer, button } = await renderGraph({ ...calculation, curve: [] });
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'No stored curve samples for this calculation.',
  );
  expect(button('Zoom in').props.disabled).toBe(true);
  await act(async () => renderer.unmount());
});

test('the exact interpolation target and selected helper marker retain their vertical bounds', async () => {
  const sparse = {
    ...calculation,
    curve: [
      { x: 0, y: 0 },
      { x: 2, y: 1 },
    ],
  };
  const step = {
    ...sparse.steps[0],
    marker: { x: 1, y: -20 },
    helper: [
      { x: 0, y: -20 },
      { x: 2, y: -20 },
    ],
  };
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider>
        <CalculationGraph calculation={sparse} step={step} />
      </ThemeProvider>,
    );
  });
  const markers = renderer.root.findAll(
    item => item.props.r === 5 && typeof item.props.cy === 'number',
  );
  expect(markers.length).toBeGreaterThanOrEqual(2);
  for (const marker of markers) {
    expect(marker.props.cy).toBeGreaterThanOrEqual(16);
    expect(marker.props.cy).toBeLessThanOrEqual(214);
  }
  await act(async () => renderer.unmount());
});

describe('recorded graph steps', () => {
  // React act schedules its own microtasks; count only playback timers.
  beforeEach(() => jest.useFakeTimers({ doNotFake: ['queueMicrotask'] }));
  afterEach(() => jest.useRealTimers());

  async function renderScreen(initialStep = 0, value = calculation) {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <GraphScreen calculation={value} initialStep={initialStep} />
        </ThemeProvider>,
      );
    });
    const button = (label: string) =>
      renderer.root
        .findAllByType(Button)
        .find(item => item.props.label === label)!;
    const selected = () =>
      renderer.root.findByType(CalculationGraph).props.step;
    return { renderer, button, selected };
  }

  test('opens the requested recorded step without autoplay and keeps controls linked to geometry', async () => {
    const { renderer, button, selected } = await renderScreen(1);
    expect(selected()).toBe(calculation.steps[1]);
    await act(async () => jest.advanceTimersByTime(5000));
    expect(selected()).toBe(calculation.steps[1]);
    expect(jest.getTimerCount()).toBe(0);
    await act(async () => button('Next step').props.onPress());
    expect(selected()).toBe(calculation.steps[2]);
    expect(button('Next step').props.disabled).toBe(true);
    await act(async () => button('Previous step').props.onPress());
    expect(selected()).toBe(calculation.steps[1]);
    await act(async () => renderer.unmount());
  });

  test('user-started play advances recorded geometry and stops at the last step', async () => {
    const { renderer, button, selected } = await renderScreen();
    await act(async () => button('Play steps').props.onPress());
    expect(button('Pause steps')).toBeDefined();
    await act(async () => jest.advanceTimersByTime(900));
    expect(selected()).toBe(calculation.steps[1]);
    await act(async () => jest.advanceTimersByTime(900));
    expect(selected()).toBe(calculation.steps[2]);
    expect(button('Replay steps').props.disabled).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    await act(async () => jest.advanceTimersByTime(5000));
    expect(selected()).toBe(calculation.steps[2]);
    await act(async () => renderer.unmount());
  });

  test('pause cancels playback and unmount clears an active timer', async () => {
    const { renderer, button, selected } = await renderScreen();
    await act(async () => button('Play steps').props.onPress());
    expect(jest.getTimerCount()).toBe(1);
    await act(async () => button('Pause steps').props.onPress());
    expect(jest.getTimerCount()).toBe(0);
    await act(async () => jest.advanceTimersByTime(900));
    expect(selected()).toBe(calculation.steps[0]);
    await act(async () => button('Play steps').props.onPress());
    expect(jest.getTimerCount()).toBe(1);
    await act(async () => renderer.unmount());
    expect(jest.getTimerCount()).toBe(0);
  });

  test('clamps an out-of-range initial step and explains absent recorded steps', async () => {
    const last = await renderScreen(999);
    expect(last.selected()).toBe(calculation.steps[2]);
    expect(last.button('Replay steps').props.disabled).toBe(false);
    await act(async () => last.renderer.unmount());
    const empty = await renderScreen(0, { ...calculation, steps: [] });
    expect(JSON.stringify(empty.renderer.toJSON())).toContain(
      'No recorded steps for this calculation.',
    );
    expect(empty.button('Play steps')).toBeUndefined();
    await act(async () => empty.renderer.unmount());
  });
});
