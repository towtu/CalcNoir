import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { defaultProblem } from '../src/core/methods';
import { calculate } from '../src/core/numerics';
import { StepsScreen } from '../src/features/solver/StepsScreen';
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
async function render(screen: React.ReactNode) {
  let instance!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    instance = TestRenderer.create(<ThemeProvider>{screen}</ThemeProvider>);
  });
  const button = (label: string) =>
    instance.root
      .findAllByType(Button)
      .find(node => node.props.label === label)!;
  return { instance, button };
}
test('Next and Previous visibly update the current midpoint, not only the step counter', async () => {
  const screen = await render(
    <StepsScreen
      calculation={calculate(defaultProblem())}
      onGraph={jest.fn()}
    />,
  );
  const value = () =>
    screen.instance.root.findAll(node => node.props.testID === 'step-value')[0]
      .props.children;
  expect(value()).toBe('1.5');
  await act(async () => screen.button('Next step').props.onPress());
  expect(value()).toBe('1.75');
  await act(async () => screen.button('Previous step').props.onPress());
  expect(value()).toBe('1.5');
  expect(screen.button('Previous step').props.disabled).toBe(true);
  await act(async () => screen.instance.unmount());
});
test('interpolation step changes show the changing partial sum before expanding details', async () => {
  const screen = await render(
    <StepsScreen
      calculation={calculate(defaultProblem('lagrange'))}
      onGraph={jest.fn()}
    />,
  );
  const value = () =>
    screen.instance.root.findAll(node => node.props.testID === 'step-value')[0]
      .props.children;
  expect(value()).toBe('0');
  await act(async () => screen.button('Next step').props.onPress());
  expect(value()).toBe('0.5625');
  await act(async () => screen.instance.unmount());
});
test('the last graph step offers Replay and starts again from the first step', async () => {
  const calculation = calculate(defaultProblem('lagrange'));
  const screen = await render(
    <GraphScreen calculation={calculation} initialStep={3} />,
  );
  expect(screen.button('Replay steps').props.disabled).toBe(false);
  await act(async () => screen.button('Replay steps').props.onPress());
  const label = screen.instance.root.findAll(
    node =>
      typeof node.props.accessibilityLabel === 'string' &&
      node.props.accessibilityLabel.includes('Selected step 1.'),
  );
  expect(label.length).toBeGreaterThan(0);
  await act(async () => screen.instance.unmount());
});
