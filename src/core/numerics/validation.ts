import { compileExpression } from './expression';
import type { Problem, RootMethod, InterpolationMethod } from './types';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Enter a complete numerical problem.');
  }
  return value as Record<string, unknown>;
}
function finite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }
  return value;
}
function integer(
  value: unknown,
  name: string,
  min: number,
  max: number,
): number {
  const number = finite(value, name);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  }
  return number;
}
function expression(value: unknown, name: string, equality: boolean): string {
  if (typeof value !== 'string') {
    throw new Error(`Enter ${name}.`);
  }
  compileExpression(value, equality);
  return value.trim();
}

/** Validate imported/persisted inputs as well as values supplied by the form. */
export function validateProblem(value: unknown): Problem {
  const input = record(value);
  const precision = integer(input.precision, 'Display precision', 0, 12);
  if (input.kind === 'root') {
    const methods: RootMethod[] = [
      'bisection',
      'newton',
      'secant',
      'fixed-point',
    ];
    if (!methods.includes(input.method as RootMethod)) {
      throw new Error('Choose a supported root method.');
    }
    const method = input.method as RootMethod;
    const tolerance = finite(input.tolerance, 'Tolerance');
    if (tolerance <= 0) {
      throw new Error('Tolerance must be greater than zero.');
    }
    let gExpression: string | undefined;
    if (method === 'fixed-point') {
      gExpression = expression(
        input.gExpression,
        'an equivalent mapping g(x)',
        false,
      );
    } else if (input.gExpression !== undefined) {
      if (
        typeof input.gExpression !== 'string' ||
        input.gExpression.length > 300
      ) {
        throw new Error(
          'Mapping g(x) must be a string of at most 300 characters.',
        );
      }
      gExpression = input.gExpression.trim();
    }
    return {
      kind: 'root',
      method,
      expression: expression(input.expression, 'f(x) or an equality', true),
      ...(gExpression !== undefined ? { gExpression } : {}),
      a: finite(input.a, 'Bracket start'),
      b: finite(input.b, 'Bracket end'),
      x0: finite(input.x0, 'First guess'),
      x1: finite(input.x1, 'Second guess'),
      tolerance,
      maxIterations: integer(input.maxIterations, 'Iteration limit', 1, 200),
      precision,
    };
  }
  if (input.kind === 'interpolation') {
    const methods: InterpolationMethod[] = ['newton-divided', 'lagrange'];
    if (!methods.includes(input.method as InterpolationMethod)) {
      throw new Error('Choose a supported interpolation method.');
    }
    if (
      !Array.isArray(input.points) ||
      input.points.length < 2 ||
      input.points.length > 20
    ) {
      throw new Error('Interpolation requires 2–20 coordinate pairs.');
    }
    const points = input.points.map((coordinate: unknown) => {
      const point = record(coordinate);
      return { x: finite(point.x, 'Point x'), y: finite(point.y, 'Point y') };
    });
    if (new Set(points.map(point => point.x)).size !== points.length) {
      throw new Error(
        'Every interpolation point must have a distinct x coordinate.',
      );
    }
    return {
      kind: 'interpolation',
      method: input.method as InterpolationMethod,
      points,
      targetX: finite(input.targetX, 'Target x'),
      precision,
    };
  }
  throw new Error('Choose a root or interpolation problem.');
}
