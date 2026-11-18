import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AccessibilityInfo } from 'react-native';
import App from '../App';
import { INTRO_DURATION } from '../src/features/intro/IntroAnimation';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

let renderer: TestRenderer.ReactTestRenderer | undefined;
const output = () => JSON.stringify(renderer!.toJSON());
const press = async (label: string) => {
  const target = renderer!.root
    .findAll(
      node =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onPress === 'function',
    )
    .at(-1);
  expect(target).toBeDefined();
  await act(async () => target!.props.onPress());
};

async function open(seen = false) {
  jest
    .mocked(AsyncStorage.getItem)
    .mockImplementation(async key =>
      key === 'numelix.tour.v1' && seen ? 'done' : null,
    );
  await act(async () => {
    renderer = TestRenderer.create(<App />);
  });
}

beforeEach(() => {
  // Stated per test rather than inherited: one test here turns reduce motion
  // on, and the preset's own mock is shared across this file.
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.mocked(AsyncStorage.getItem).mockReset();
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

test('the opening animation lifts on its own and hands over to the tour', async () => {
  jest.useFakeTimers();
  await open();
  // The app is mounted behind the curtain from the first frame.
  expect(output()).toContain('Numerical analysis. Made simple.');
  expect(output()).toContain('Methods tried');
  await act(async () => {
    jest.advanceTimersByTime(INTRO_DURATION);
  });
  expect(output()).not.toContain('Numerical analysis. Made simple.');
  expect(output()).toContain('1 of 5');
});

test('the opening animation can be tapped away', async () => {
  await open(true);
  expect(output()).toContain('Numerical analysis. Made simple.');
  await press('Skip intro');
  expect(output()).not.toContain('Numerical analysis. Made simple.');
  // Nothing is pending for someone who has already seen the tour.
  expect(output()).not.toContain('1 of 5');
});

test('reduce motion skips the opening animation entirely', async () => {
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(true);
  await open(true);
  expect(output()).not.toContain('Numerical analysis. Made simple.');
  expect(output()).toContain('Methods tried');
});

test('the tour names every destination, moves the tabs with it and is remembered', async () => {
  await open();
  await press('Skip intro');
  expect(output()).toContain('1 of 5');

  await press('Continue tour');
  expect(output()).toContain('2 of 5');
  // Step two is Solve, and the tour actually switched to that tab.
  expect(output()).toContain('Choose a method');

  await press('Continue tour');
  expect(output()).toContain('3 of 5');
  await press('Previous tour step');
  expect(output()).toContain('2 of 5');

  await press('Continue tour');
  await press('Continue tour');
  await press('Continue tour');
  expect(output()).toContain('5 of 5');
  expect(output()).toContain('Settings');

  await press('Finish tour');
  expect(output()).not.toContain('5 of 5');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('numelix.tour.v1', 'done');
});

test('skipping the tour records it so it does not return on the next launch', async () => {
  await open();
  await press('Skip intro');
  await press('Skip tour');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('numelix.tour.v1', 'done');
  expect(output()).not.toContain('1 of 5');
});

test('an unreadable preference skips the tour instead of repeating it', async () => {
  jest
    .mocked(AsyncStorage.getItem)
    .mockImplementation(async key =>
      key === 'numelix.tour.v1'
        ? Promise.reject(new Error('unavailable'))
        : null,
    );
  await act(async () => {
    renderer = TestRenderer.create(<App />);
  });
  await press('Skip intro');
  expect(output()).not.toContain('1 of 5');
  expect(output()).toContain('could not be read');
});
