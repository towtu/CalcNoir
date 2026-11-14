export type RootMethod = 'bisection' | 'newton' | 'secant' | 'fixed-point';
export type InterpolationMethod = 'newton-divided' | 'lagrange';
export type MethodId = RootMethod | InterpolationMethod;
export interface Point {
  x: number;
  y: number;
}
export interface CurvePoint {
  x: number;
  y: number | null;
}
export interface RootProblem {
  kind: 'root';
  method: RootMethod;
  expression: string;
  gExpression?: string;
  a: number;
  b: number;
  x0: number;
  x1: number;
  tolerance: number;
  maxIterations: number;
  precision: number;
}
export interface InterpolationProblem {
  kind: 'interpolation';
  method: InterpolationMethod;
  points: Point[];
  targetX: number;
  precision: number;
}
export type Problem = RootProblem | InterpolationProblem;
export interface CalculationStep {
  index: number;
  formula: string;
  explanation: string;
  cells: Array<number | string | null>;
  marker: Point | null;
  helper: Point[];
  interval?: [number, number];
  contribution?: CurvePoint[];
}
export interface Calculation {
  problem: Problem;
  status: 'converged' | 'calculated' | 'failed';
  message: string;
  value: number | null;
  residual: number | null;
  steps: CalculationStep[];
  columns: string[];
  curve: CurvePoint[];
  xDomain: [number, number];
  plotKind: 'function' | 'mapping' | 'polynomial';
  functionEvaluations: number;
}
