import { validateProblem } from '../../core/numerics';
import { defaultProblem, methodInfo } from '../../core/methods';
import type { MethodId, Problem } from '../../core/numerics/types';

export interface Draft {
  method: MethodId;
  expression: string;
  gExpression: string;
  a: string;
  b: string;
  x0: string;
  x1: string;
  tolerance: string;
  maxIterations: string;
  precision: string;
  points: Array<{ x: string; y: string }>;
  targetX: string;
}

export function draftFor(problem: Problem): Draft {
  const root = problem.kind === 'root' ? problem : defaultProblem();
  if (root.kind !== 'root') {
    throw new Error('Root defaults are unavailable.');
  }
  return {
    method: problem.method,
    expression: root.expression,
    gExpression: root.gExpression ?? '',
    a: String(root.a),
    b: String(root.b),
    x0: String(root.x0),
    x1: String(root.x1),
    tolerance: String(root.tolerance),
    maxIterations: String(root.maxIterations),
    precision: String(problem.precision),
    points:
      problem.kind === 'interpolation'
        ? problem.points.map(point => ({
            x: String(point.x),
            y: String(point.y),
          }))
        : [
            { x: '0', y: '0' },
            { x: '1', y: '1' },
          ],
    targetX: problem.kind === 'interpolation' ? String(problem.targetX) : '0.5',
  };
}

function numberFrom(text: string, label: string): number {
  const trimmed = text.trim();
  if (
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed) ||
    !Number.isFinite(Number(trimmed))
  ) {
    throw new Error(`${label} must be a complete, finite number.`);
  }
  const value = Number(trimmed);
  const mantissa = trimmed.split(/[eE]/)[0];
  if (value === 0 && /[1-9]/.test(mantissa)) {
    throw new Error(
      `${label} is too small to represent without becoming zero. Use zero explicitly or a larger magnitude.`,
    );
  }
  return value;
}

export function problemFor(draft: Draft): Problem {
  const precision = numberFrom(draft.precision, 'Display precision');
  if (methodInfo(draft.method).category === 'interpolation') {
    return validateProblem({
      kind: 'interpolation',
      method: draft.method,
      precision,
      points: draft.points.map((point, index) => ({
        x: numberFrom(point.x, `Point ${index + 1} x`),
        y: numberFrom(point.y, `Point ${index + 1} y`),
      })),
      targetX: numberFrom(draft.targetX, 'Target x'),
    });
  }
  const starter = defaultProblem(draft.method);
  if (starter.kind !== 'root') {
    throw new Error('Root defaults are unavailable.');
  }
  const setting = (
    key: 'a' | 'b' | 'x0' | 'x1',
    label: string,
    required: boolean,
  ): number => {
    if (required) {
      return numberFrom(draft[key], label);
    }
    try {
      return numberFrom(draft[key], label);
    } catch {
      // Hidden drafts stay editable. Only the snapshot uses finite starter
      // values when an unused setting is incomplete or unrepresentable.
      return starter[key];
    }
  };
  return validateProblem({
    kind: 'root',
    method: draft.method,
    expression: draft.expression,
    gExpression: draft.gExpression,
    a: setting('a', 'Bracket start a', draft.method === 'bisection'),
    b: setting('b', 'Bracket end b', draft.method === 'bisection'),
    x0: setting('x0', 'First guess x₀', draft.method !== 'bisection'),
    x1: setting('x1', 'Second guess x₁', draft.method === 'secant'),
    tolerance: numberFrom(draft.tolerance, 'Tolerance'),
    maxIterations: numberFrom(draft.maxIterations, 'Iteration limit'),
    precision,
  });
}
