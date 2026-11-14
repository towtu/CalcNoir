import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Calculation, Problem, MethodId } from '../../core/numerics/types';
export type RootTabs = {
  Methods: undefined;
  Notebook: undefined;
  Learn: undefined;
  Settings: undefined;
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
  GettingStarted: undefined;
  Practice: undefined;
};
