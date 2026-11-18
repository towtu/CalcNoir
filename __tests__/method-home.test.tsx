import { ThemeToggle } from '../src/shared/ui/ThemeToggle';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import Svg from 'react-native-svg';
import { METHODS } from '../src/core/methods';
import { MethodsScreen } from '../src/features/methods/MethodsScreen';
import { SettingsScreen } from '../src/features/settings/SettingsScreen';
import { ThemeProvider } from '../src/shared/theme';
import { Brand } from '../src/shared/ui';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

let renderer: TestRenderer.ReactTestRenderer;
async function render(content: React.ReactNode) {
  await act(async () => {
    renderer = TestRenderer.create(<ThemeProvider>{content}</ThemeProvider>);
  });
}
function methodRows() {
  return METHODS.map(
    method =>
      renderer.root.findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          node.props.accessibilityLabel === `Open ${method.title}` &&
          typeof node.props.onPress === 'function',
      )[0],
  ).filter(Boolean);
}
beforeEach(() => jest.clearAllMocks());
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
});

test('the compact home exposes all six methods with short input hints and exact method callbacks', async () => {
  const onChoose = jest.fn();
  await render(<MethodsScreen onChoose={onChoose} onSettings={jest.fn()} />);
  expect(renderer.root.findByType(Brand).props.compact).toBe(true);
  const text = JSON.stringify(renderer.toJSON());
  expect(text).toContain('Root Finding');
  expect(text).toContain('Interpolation');
  expect(text).not.toContain('Numerical methods, clearly.');
  expect(text).not.toContain('Start with the method your problem needs.');
  expect(methodRows()).toHaveLength(6);
  for (const [index, method] of METHODS.entries()) {
    const row = methodRows().find(
      item => item.props.accessibilityLabel === `Open ${method.title}`,
    )!;
    expect(row.props.accessibilityHint).toBeTruthy();
    expect(text).not.toContain(method.formula);
    await act(async () => row.props.onPress());
    expect(onChoose).toHaveBeenNthCalledWith(index + 1, method.id);
  }
});

test('the saved-page picker marks its current method and omits home branding', async () => {
  const onChoose = jest.fn();
  await render(
    <MethodsScreen
      picker
      selectedMethod="secant"
      onChoose={onChoose}
      warning="Notebook warning"
    />,
  );
  expect(renderer.root.findAllByType(Brand)).toHaveLength(0);
  const rows = methodRows();
  const current = rows.find(
    row => row.props.accessibilityLabel === 'Open Secant',
  )!;
  expect(current.props.accessibilityState.selected).toBe(true);
  expect(
    rows.filter(row => row.props.accessibilityState.selected),
  ).toHaveLength(1);
  expect(JSON.stringify(renderer.toJSON())).toContain('Current');
  expect(JSON.stringify(renderer.toJSON())).toContain('Notebook warning');
  await act(async () =>
    rows
      .find(row => row.props.accessibilityLabel === 'Open Lagrange')!
      .props.onPress(),
  );
  expect(onChoose).toHaveBeenCalledWith('lagrange');
});

test('appearance uses sun and moon cues with an accessible persisted switch', async () => {
  const onTutorial = jest.fn();
  await render(<SettingsScreen onTutorial={onTutorial} />);
  const icon = (mode: string) =>
    renderer.root
      .findAllByType(Svg)
      .find(node => node.props.testID === `appearance-${mode}-icon`)!;
  expect(icon('light')).toBeDefined();
  expect(icon('dark')).toBeDefined();
  expect(icon('light').props.accessible).toBe(false);
  expect(icon('dark').props.accessible).toBe(false);
  const themeSwitch = () => renderer.root.findByType(ThemeToggle);
  expect(
    renderer.root.findAll(
      n =>
        n.props.accessibilityRole === 'switch' &&
        n.props.accessibilityLabel === 'Use dark theme',
    ).length,
  ).toBeGreaterThan(0);
  expect(themeSwitch().props.value).toBe(false);
  const control = () =>
    renderer.root
      .findAll(
        n =>
          n.props.accessibilityRole === 'switch' &&
          typeof n.props.onPress === 'function',
      )
      .at(-1)!;
  expect(control().props.accessibilityState.checked).toBe(false);
  await act(async () => control().props.onPress());
  expect(control().props.accessibilityState.checked).toBe(true);
  expect(themeSwitch().props.value).toBe(true);
  expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
    'almost-exact.theme.v1',
    'dark',
  );
  const replay = renderer.root.findAll(
    node =>
      node.props.accessibilityLabel === 'Replay tutorial' &&
      typeof node.props.onPress === 'function',
  )[0];
  await act(async () => replay.props.onPress());
  expect(onTutorial).toHaveBeenCalledTimes(1);
});
