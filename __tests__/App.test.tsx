import { ThemeToggle } from '../src/shared/ui/ThemeToggle';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import App from '../App';
import { MethodsScreen } from '../src/features/methods/MethodsScreen';
import {
  NotebookEditorScreen,
  NotebookPageScreen,
  NotebookScreen,
} from '../src/features/notebook';
import { SettingsScreen } from '../src/features/settings/SettingsScreen';
import { SolverScreen } from '../src/features/solver';
import { ResultScreen } from '../src/features/solver/ResultScreen';
import { Button } from '../src/shared/ui';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

let renderer: TestRenderer.ReactTestRenderer | undefined;
let stored: Map<string, string>;
function current(component: React.ElementType) {
  const screens = renderer!.root.findAllByType(component);
  return screens[screens.length - 1];
}
const control = (label: string, root = renderer!.root) =>
  root
    .findAll(
      item =>
        item.props.accessibilityLabel === label &&
        typeof item.props.onPress === 'function',
    )
    .slice(-1)[0];
const button = (label: string, root = renderer!.root) =>
  root.findAllByType(Button).find(item => item.props.label === label)!;
const tab = (label: string) =>
  renderer!.root.findAll(
    item =>
      item.props.accessibilityLargeContentTitle === label &&
      typeof item.props.onPress === 'function',
  )[0];
async function openApp() {
  await act(async () => {
    renderer = TestRenderer.create(<App />);
  });
}

beforeEach(() => {
  stored = new Map([['calcnoir.getting-started.v1', 'done']]);
  jest
    .mocked(AsyncStorage.getItem)
    .mockReset()
    .mockImplementation(async key => stored.get(key) ?? null);
  jest
    .mocked(AsyncStorage.setItem)
    .mockReset()
    .mockImplementation(async (key, value) => {
      stored.set(key, value);
    });
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
  jest.restoreAllMocks();
});

test('native application starts with methods and its four main destinations', async () => {
  await openApp();
  expect(current(MethodsScreen)).toBeDefined();
  expect(renderer!.root.findAllByType(SolverScreen)).toHaveLength(0);
  for (const label of ['Methods', 'Notebook', 'Learn', 'Settings']) {
    expect(tab(label)).toBeDefined();
  }
  expect(JSON.stringify(renderer!.toJSON())).not.toContain('Equation or f(x)');
  await act(async () => control('Open Bisection').props.onPress());
  expect(current(SolverScreen).props.initialProblem.method).toBe('bisection');
});

test('a calculated page persists, reopens through the notebook and can be themed', async () => {
  await openApp();
  await act(async () => control('Open Bisection').props.onPress());
  await act(async () =>
    button('Calculate', current(SolverScreen)).props.onPress(),
  );
  const calculation = current(ResultScreen).props.calculation;
  await act(async () =>
    button('Save problem', current(ResultScreen)).props.onPress(),
  );
  const editor = current(NotebookEditorScreen);
  const title = editor
    .findAllByType(TextInput)
    .find(item => item.props.accessibilityLabel === 'Page title')!;
  await act(async () => title.props.onChangeText('Homework A'));
  await act(async () =>
    button('Save page', current(NotebookEditorScreen)).props.onPress(),
  );
  expect(current(NotebookPageScreen)).toBeDefined();
  const saved = JSON.parse(stored.get('almost-exact.notebook.v1')!).entries[0];
  expect(saved.title).toBe('Homework A');
  expect(saved.problem).toEqual(calculation.problem);
  await act(async () => renderer!.unmount());
  renderer = undefined;
  await openApp();
  await act(async () =>
    tab('Notebook').props.onPress({ preventDefault: jest.fn() }),
  );
  expect(current(NotebookScreen)).toBeDefined();
  await act(async () => control('Open Homework A').props.onPress());
  expect(current(NotebookPageScreen).props.entryId).toBe(saved.id);
  await act(async () =>
    button('Calculate', current(NotebookPageScreen)).props.onPress(),
  );
  expect(current(ResultScreen).props.calculation).toEqual(calculation);
  await act(async () => control('Back').props.onPress());
  await act(async () => control('Back').props.onPress());
  await act(async () =>
    tab('Settings').props.onPress({ preventDefault: jest.fn() }),
  );
  const themeSwitch = current(SettingsScreen).findByType(ThemeToggle);
  await act(async () => themeSwitch.props.onValueChange(true));
  expect(current(SettingsScreen).findByType(ThemeToggle).props.value).toBe(
    true,
  );
  expect(stored.get('almost-exact.theme.v1')).toBe('dark');
});
