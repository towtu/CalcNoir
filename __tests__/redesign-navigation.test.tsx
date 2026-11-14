import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import App from '../App';
import { Button } from '../src/shared/ui';
import { defaultProblem } from '../src/core/methods';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

let renderer: TestRenderer.ReactTestRenderer;
function visible(
  node:
    | TestRenderer.ReactTestRendererNode
    | TestRenderer.ReactTestRendererNode[]
    | null,
): unknown {
  if (node === null || typeof node === 'string') return node;
  if (Array.isArray(node))
    return node.map(visible).filter(value => value !== null);
  if (
    node.props['aria-hidden'] === true ||
    node.props.accessibilityElementsHidden === true
  )
    return null;
  return { ...node, children: node.children ? visible(node.children) : null };
}
const output = () => JSON.stringify(visible(renderer.toJSON()));
const button = (label: string) =>
  renderer.root
    .findAllByType(Button)
    .find(
      node =>
        node.props.label === label || node.props.accessibilityLabel === label,
    )!;
const press = async (label: string) => {
  const target = renderer.root
    .findAll(
      node =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onPress === 'function',
    )
    .at(-1);
  expect(target).toBeDefined();
  await act(async () => target!.props.onPress());
};
async function open(completed = true, notebookRaw: string | null = null) {
  jest
    .mocked(AsyncStorage.getItem)
    .mockImplementation(async key =>
      key === 'almost-exact.notebook.v1'
        ? notebookRaw
        : key === 'calcnoir.getting-started.v1' && completed
        ? 'done'
        : null,
    );
  await act(async () => {
    renderer = TestRenderer.create(<App />);
  });
}
beforeEach(() => {
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
  if (renderer) await act(async () => renderer.unmount());
  jest.restoreAllMocks();
});

test('first launch offers a short guide with a visible exit and remembers completion', async () => {
  await open(false);
  expect(output()).toContain('Getting started');
  expect(button('Skip tutorial')).toBeDefined();
  await act(async () => button('Skip tutorial').props.onPress());
  expect(output()).toContain('Choose a method');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    'calcnoir.getting-started.v1',
    'done',
  );
});

test('the methods landing does not display an equation editor or numerical process', async () => {
  await open();
  expect(output()).toContain('CalcNoir');
  expect(output()).toContain('Choose a method');
  expect(output()).not.toContain('Equation or f(x)');
  expect(output()).not.toContain('Step table');
  expect(output()).not.toContain('Recorded steps');
});

test('Lagrange opens its own editor and Calculate opens a separate answer screen', async () => {
  await open();
  await press('Open Lagrange');
  expect(output()).toContain('Point 1 x');
  expect(output()).not.toContain('Step table');
  expect(output()).not.toContain('Display precision');
  await act(async () => button('Calculate').props.onPress());
  expect(output()).toContain('2.25');
  expect(
    renderer.root.findAll(
      node => node.props.accessibilityLabel === 'View steps',
    ).length,
  ).toBeGreaterThan(0);
  expect(output()).not.toContain('Point 1 x');
  expect(output()).not.toContain('Partial sum');
});

test('Back from a result preserves the edited equation and advanced settings stay opt-in', async () => {
  await open();
  await press('Open Bisection');
  const input = () =>
    renderer.root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === 'Equation or f(x)')!;
  await act(async () => input().props.onChangeText('x^2 = 3'));
  expect(output()).not.toContain('Iteration limit');
  await act(async () => button('Calculate').props.onPress());
  expect(output()).toContain('1.732');
  await press('Back');
  expect(input().props.value).toBe('x^2 = 3');
});

async function tab(label: string) {
  const target = renderer.root.findAll(
    node =>
      node.props.accessibilityLargeContentTitle === label &&
      typeof node.props.onPress === 'function',
  )[0];
  await act(async () => target.props.onPress({ preventDefault: jest.fn() }));
}
test('a skipped first-run tutorial remains replayable from Settings', async () => {
  await open(false);
  await act(async () => button('Skip tutorial').props.onPress());
  await tab('Settings');
  expect(button('Replay tutorial')).toBeDefined();
  await act(async () => button('Replay tutorial').props.onPress());
  expect(output()).toContain('Getting started');
  await press('Skip tutorial');
  expect(output()).toContain('Appearance');
});
test('notebook method picker preserves typed title and notes and updates the same page', async () => {
  await open(
    true,
    JSON.stringify({
      version: 1,
      entries: [
        {
          id: 'method-page',
          createdAt: 123,
          problem: defaultProblem(),
          title: 'Method homework',
          notes: 'Keep my notes',
          tags: ['week1'],
          pinned: true,
        },
      ],
    }),
  );
  await tab('Notebook');
  await press('Open Method homework');
  await act(async () => button('Edit').props.onPress());
  const title = () =>
    renderer.root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === 'Page title')!;
  await act(async () => title().props.onChangeText('Revised method homework'));
  await act(async () => button('Change method').props.onPress());
  expect(output()).toContain('Choose a method');
  expect(output()).not.toContain('Equation or f(x)');
  await press('Open Secant');
  expect(title().props.value).toBe('Revised method homework');
  expect(output()).toContain('Second guess x₁');
  await act(async () => button('Save changes').props.onPress());
  const write = jest
    .mocked(AsyncStorage.setItem)
    .mock.calls.find(call => call[0] === 'almost-exact.notebook.v1')!;
  const saved = JSON.parse(write[1]).entries[0];
  expect(saved).toEqual(
    expect.objectContaining({
      id: 'method-page',
      notes: 'Keep my notes',
      title: 'Revised method homework',
      pinned: true,
      problem: expect.objectContaining({ method: 'secant' }),
    }),
  );
});
