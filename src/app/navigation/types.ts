import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Calculation, Problem, MethodId } from '../../core/numerics/types';
/**
 * Four primary destinations. Settings is deliberately absent: it is a
 * secondary screen reached from the header shortcut on each primary tab, so it
 * lives on the stack instead.
 */
export type RootTabs = {
  Home: undefined;
  Solve: undefined;
  Learn: undefined;
  Notebook: undefined;
};
export type SavedEditorParams = {
  entryId?: string;
  initialProblem?: Problem;
  selectedMethod?: MethodId;
};
export type RootStack = {
  Main: NavigatorScreenParams<RootTabs> | undefined;
  Problem: { problem: Problem; savedId?: string };
  Result: { calculation: Calculation; savedId?: string };
  Steps: { calculation: Calculation; initialStep?: number };
  Graph: { calculation: Calculation; initialStep?: number };
  Table: { calculation: Calculation };
  Comparison: { problem: Problem };
  SavedPage: { entryId: string };
  SavedEditor: SavedEditorParams;
  SavedMethod: { editor: SavedEditorParams };
  Lesson: { method: MethodId };
  Practice: { method?: MethodId } | undefined;
  Settings: undefined;
};
