import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { RaisedTabBar } from '../src/app/navigation/RaisedTabBar';
import { ThemeProvider } from '../src/shared/theme';
import { useReducedMotion } from '../src/shared/ui/useReducedMotion';
jest.mock('../src/shared/ui/useReducedMotion', () => ({
  useReducedMotion: jest.fn(() => false),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
let renderer: TestRenderer.ReactTestRenderer;
let callbacks: Array<(state: { finished: boolean }) => void>;
function props(index: number) {
  const routes = ['Methods', 'Notebook', 'Learn', 'Settings'].map(name => ({
    key: name,
    name,
  }));
  // This boundary stub provides only navigation fields consumed by the custom bar.
  return {
    state: { index, routes },
    descriptors: Object.fromEntries(
      routes.map(route => [
        route.key,
        { options: { tabBarIcon: () => <Text>{route.name}</Text> } },
      ]),
    ),
    navigation: {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    },
  } as unknown as BottomTabBarProps;
}
async function render(index: number) {
  await act(async () => {
    const tree = (
      <ThemeProvider>
        <RaisedTabBar {...props(index)} />
      </ThemeProvider>
    );
    if (renderer) renderer.update(tree);
    else renderer = TestRenderer.create(tree);
  });
}
const floating = () =>
  renderer.root.findByProps({ testID: 'floating-navigation' }).findByType(Text)
    .props.children;
beforeEach(async () => {
  callbacks = [];
  jest.mocked(useReducedMotion).mockReturnValue(false);
  jest.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: callback => {
      if (callback) callbacks.push(callback);
    },
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  await render(0);
  const layout = renderer.root
    .findAllByType(View)
    .find(n => typeof n.props.onLayout === 'function')!;
  await act(async () =>
    layout.props.onLayout({ nativeEvent: { layout: { width: 400 } } }),
  );
});
afterEach(async () => {
  await act(async () => renderer.unmount());
  renderer = undefined as unknown as TestRenderer.ReactTestRenderer;
  jest.restoreAllMocks();
});
test('the floating icon changes only when it reaches its destination', async () => {
  expect(floating()).toBe('Methods');
  await render(1);
  expect(floating()).toBe('Methods');
  await act(async () => callbacks.at(-1)!({ finished: true }));
  expect(floating()).toBe('Notebook');
});
test('an interrupted transition cannot replace the final destination icon', async () => {
  await render(1);
  const interrupted = callbacks.at(-1)!;
  await render(3);
  const final = callbacks.at(-1)!;
  await act(async () => interrupted({ finished: true }));
  expect(floating()).toBe('Methods');
  await act(async () => final({ finished: true }));
  expect(floating()).toBe('Settings');
});
test('reduced motion updates position and icon immediately', async () => {
  jest.mocked(useReducedMotion).mockReturnValue(true);
  await render(2);
  expect(floating()).toBe('Learn');
  expect(Animated.timing).not.toHaveBeenCalled();
});

test('the floating circle has a real curved bar outline instead of a painted cover', () => {
  expect(
    renderer.root.findAllByProps({ testID: 'liquid-tab-outline' }),
  ).not.toHaveLength(0);
  const floatingStyle = renderer.root.findByProps({
    testID: 'floating-navigation',
  }).props.style;
  expect(StyleSheet.flatten(floatingStyle).backgroundColor).toBeUndefined();
});

test('the departing tab icon stays hidden until the floating circle clears it', async () => {
  await render(1);
  const opacity = (name: string) =>
    StyleSheet.flatten(
      renderer.root.findAllByProps({ testID: `tab-icon-${name}` }).at(-1)!.props
        .style,
    ).opacity;
  expect(opacity('Methods')).toBe(0);
  const clock = jest
    .mocked(Animated.timing)
    .mock.calls.at(-1)![0] as Animated.Value;
  await act(async () => clock.setValue(1));
  expect(opacity('Methods')).toBe(1);
  expect(opacity('Notebook')).toBe(0);
});
