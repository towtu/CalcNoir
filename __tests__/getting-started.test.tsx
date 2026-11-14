import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { BackHandler, Keyboard, TextInput } from 'react-native';
import { GettingStartedScreen } from '../src/features/learn/GettingStartedScreen';
import { ThemeProvider } from '../src/shared/theme';
import { Button } from '../src/shared/ui';
import { METHODS } from '../src/core/methods';
import type { Calculation } from '../src/core/numerics/types';
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
let hardwareBack: () => boolean;
let renderer: TestRenderer.ReactTestRenderer;
const complete = jest.fn<void, [Calculation]>();
const skip = jest.fn();
const output = () => JSON.stringify(renderer.toJSON());
const button = (label: string) =>
  renderer.root
    .findAllByType(Button)
    .find(
      n => n.props.label === label || n.props.accessibilityLabel === label,
    )!;
const press = async (label: string) => {
  await act(async () => button(label).props.onPress());
};
const choose = async (label: string) => {
  const target = renderer.root
    .findAll(
      n =>
        n.props.accessibilityLabel === `Open ${label}` &&
        typeof n.props.onPress === 'function',
    )
    .at(-1)!;
  await act(async () => target.props.onPress());
};
const input = (label: string) =>
  renderer.root
    .findAllByType(TextInput)
    .find(n => n.props.accessibilityLabel === label)!;
beforeEach(async () => {
  jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_event, listener) => {
      hardwareBack = () =>
        listener({ type: 'hardwareBackPress', timeStamp: 1 }) === true;
      return { remove: jest.fn() };
    });
  complete.mockClear();
  skip.mockClear();
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider>
        <GettingStartedScreen onComplete={complete} onSkip={skip} />
      </ThemeProvider>,
    );
  });
});
afterEach(async () => {
  await act(async () => renderer.unmount());
  jest.restoreAllMocks();
});
test('shows one stage at a time and requires an explicit method choice', async () => {
  expect(output()).toContain('Step 1 of 3');
  expect(output()).not.toContain('Equation or f(x)');
  expect(button('Next').props.disabled).toBe(true);
  await choose('Bisection');
  expect(output()).not.toContain('Equation or f(x)');
  await press('Next');
  expect(output()).toContain('Step 2 of 3');
  expect(input('Equation or f(x)')).toBeDefined();
  expect(output()).not.toContain('Open Lagrange');
});
test.each(METHODS)(
  '$title produces a real calculation and hands the same result to the workspace',
  async method => {
    await choose(method.title);
    await press('Next');
    await press('Calculate');
    expect(output()).toContain('Step 3 of 3');
    expect(complete).not.toHaveBeenCalled();
    await press('Open my result');
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        problem: expect.objectContaining({ method: method.id }),
        status: method.category === 'root' ? 'converged' : 'calculated',
      }),
    );
  },
);
test('invalid values stay editable and Back retains the draft', async () => {
  await choose('Lagrange');
  await press('Next');
  await act(async () => input('Target x').props.onChangeText('invalid'));
  await press('Calculate');
  expect(output()).toContain('Step 2 of 3');
  expect(output()).toContain('complete, finite number');
  expect(input('Target x').props.value).toBe('invalid');
  await act(async () => input('Target x').props.onChangeText('1.25'));
  await press('Back');
  await press('Next');
  expect(input('Target x').props.value).toBe('1.25');
  await press('Calculate');
  await press('Back');
  expect(input('Target x').props.value).toBe('1.25');
});
test('Skip is available after a choice and does not complete a calculation', async () => {
  await choose('Secant');
  await press('Next');
  await press('Skip tutorial');
  expect(skip).toHaveBeenCalledTimes(1);
  expect(complete).not.toHaveBeenCalled();
});

test('Android Back dismisses the keyboard before moving to the previous guide stage', async () => {
  await choose('Bisection');
  await press('Next');
  jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
  const dismiss = jest
    .spyOn(Keyboard, 'dismiss')
    .mockImplementation(() => undefined);
  await act(async () => expect(hardwareBack()).toBe(true));
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(output()).toContain('Step 2 of 3');
  jest.mocked(Keyboard.isVisible).mockReturnValue(false);
  await act(async () => expect(hardwareBack()).toBe(true));
  expect(output()).toContain('Step 1 of 3');
});

test('a focused field still consumes Back if Android keyboard visibility arrives late', async () => {
  await choose('Bisection');
  await press('Next');
  jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
  const focused = jest
    .spyOn(TextInput.State, 'currentlyFocusedInput')
    .mockReturnValue(input('Equation or f(x)').instance);
  jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
  await act(async () => expect(hardwareBack()).toBe(true));
  expect(output()).toContain('Step 2 of 3');
  focused.mockReturnValue(undefined);
  await act(async () => expect(hardwareBack()).toBe(true));
  expect(output()).toContain('Step 1 of 3');
});
