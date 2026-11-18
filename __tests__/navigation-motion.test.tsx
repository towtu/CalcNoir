import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Text } from 'react-native';
import { SettingsScreen } from '../src/features/settings/SettingsScreen';
import { ThemeProvider } from '../src/shared/theme';
import { useReducedMotion } from '../src/shared/ui/useReducedMotion';

const control = (label: string) =>
  renderer!.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  )[0];

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

let renderer: TestRenderer.ReactTestRenderer | undefined;
let motionChanged: (enabled: boolean) => void;
let removed: jest.Mock;

function MotionPreference() {
  const reduced = useReducedMotion();
  return <Text>{reduced ? 'Reduce motion' : 'Animate navigation'}</Text>;
}

async function renderPreference() {
  await act(async () => {
    renderer = TestRenderer.create(<MotionPreference />);
  });
}

const preference = () => renderer!.root.findByType(Text).props.children;

beforeEach(() => {
  removed = jest.fn();
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(false);
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockImplementation((event, listener) => {
      if (event === 'reduceMotionChanged') {
        motionChanged = listener as (enabled: boolean) => void;
      }
      return { remove: removed };
    });
});

afterEach(async () => {
  if (renderer) {
    await act(async () => renderer!.unmount());
    renderer = undefined;
  }
  jest.restoreAllMocks();
});

test('navigation stays still while the system preference is unknown, then uses the resolved value', async () => {
  let resolvePreference!: (enabled: boolean) => void;
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockReturnValue(
    new Promise<boolean>(resolve => {
      resolvePreference = resolve;
    }),
  );
  await renderPreference();
  expect(preference()).toBe('Reduce motion');
  await act(async () => resolvePreference(false));
  expect(preference()).toBe('Animate navigation');
});

test('a saved reduce-motion preference disables navigation animation', async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  await renderPreference();
  expect(preference()).toBe('Reduce motion');
});

test('live system changes update the navigation preference in both directions', async () => {
  await renderPreference();
  expect(preference()).toBe('Animate navigation');
  await act(async () => motionChanged(true));
  expect(preference()).toBe('Reduce motion');
  await act(async () => motionChanged(false));
  expect(preference()).toBe('Animate navigation');
});

test('a live preference change wins over a delayed initial system read', async () => {
  let resolvePreference!: (enabled: boolean) => void;
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockReturnValue(
    new Promise<boolean>(resolve => {
      resolvePreference = resolve;
    }),
  );
  await renderPreference();
  await act(async () => motionChanged(true));
  await act(async () => resolvePreference(false));
  expect(preference()).toBe('Reduce motion');
});

test('a failed system read conservatively disables animation and still accepts later changes', async () => {
  jest
    .mocked(AccessibilityInfo.isReduceMotionEnabled)
    .mockRejectedValue(new Error('Unavailable'));
  await renderPreference();
  expect(preference()).toBe('Reduce motion');
  await act(async () => motionChanged(false));
  expect(preference()).toBe('Animate navigation');
});

test('unmount removes the native subscription while a preference read is pending', async () => {
  let resolvePreference!: (enabled: boolean) => void;
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockReturnValue(
    new Promise<boolean>(resolve => {
      resolvePreference = resolve;
    }),
  );
  await renderPreference();
  expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
    'reduceMotionChanged',
    expect.any(Function),
  );
  await act(async () => renderer!.unmount());
  renderer = undefined;
  expect(removed).toHaveBeenCalledTimes(1);
  await act(async () => {
    resolvePreference(false);
    motionChanged(false);
  });
  expect(removed).toHaveBeenCalledTimes(1);
});

test('Settings exposes Replay tutorial in the Help card near the top and invokes its callback', async () => {
  const onTutorial = jest.fn();
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider>
        <SettingsScreen onTutorial={onTutorial} />
      </ThemeProvider>,
    );
  });
  // Help stays above the reference cards, so replaying the tutorial is
  // reachable without scrolling past explanatory text.
  const output = JSON.stringify(renderer!.toJSON());
  expect(output).toContain('Help');
  expect(output.indexOf('Help')).toBeLessThan(
    output.indexOf('Accuracy & Rounding'),
  );
  const replay = control('Replay tutorial');
  expect(replay.props.accessibilityState.disabled).toBe(false);
  await act(async () => replay.props.onPress());
  expect(onTutorial).toHaveBeenCalledTimes(1);
});

test('Settings remains compatible when no tutorial callback is supplied', async () => {
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>,
    );
  });
  expect(control('Replay tutorial').props.accessibilityState.disabled).toBe(
    true,
  );
});
