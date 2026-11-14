import { compileExpression } from './expression';
import { domainFor, sampleCurve } from './plot';
import type { Calculation, CalculationStep, Point, RootProblem } from './types';

const COLUMNS = {
  bisection: ['n', 'a', 'b', 'Midpoint', 'f(midpoint)', 'Half-width'],
  newton: ['n', 'x', 'f(x)', 'f′(x)', 'Next x', '|Δx|'],
  secant: ['n', 'Previous x', 'x', 'f(x)', 'Next x', '|Δx|'],
  'fixed-point': ['n', 'x', 'g(x)', 'f(g(x))', '|Δx|'],
};

function checked(value: number, message: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(message);
  }
  return value;
}

export function calculateRoot(problem: RootProblem): Calculation {
  const expression = compileExpression(problem.expression);
  const mapping =
    problem.method === 'fixed-point'
      ? compileExpression(problem.gExpression!, false)
      : null;
  let evaluations = 0;
  const f = (x: number): number => {
    evaluations += 1;
    return expression.evaluate(x);
  };
  const g = (x: number): number => {
    evaluations += 1;
    return mapping!.evaluate(x);
  };
  const result: Calculation = {
    problem,
    status: 'failed',
    message: '',
    value: null,
    residual: null,
    steps: [],
    columns: [...COLUMNS[problem.method]],
    curve: [],
    xDomain: [-2, 2],
    plotKind: mapping ? 'mapping' : 'function',
    functionEvaluations: 0,
  };
  const remember = (x: number, fx: number): void => {
    result.value = x;
    result.residual = Math.abs(fx);
  };
  const exact = (
    x: number,
    fx: number,
    cells: CalculationStep['cells'],
  ): boolean => {
    if (fx !== 0) {
      return false;
    }
    remember(x, fx);
    result.steps.push({
      index: 1,
      formula: 'f(x) = 0',
      explanation:
        'This supplied value is already an exact root of the equation.',
      cells,
      marker: { x, y: mapping ? x : fx },
      helper: [],
      ...(problem.method === 'bisection'
        ? {
            interval: [
              Math.min(problem.a, problem.b),
              Math.max(problem.a, problem.b),
            ] as [number, number],
          }
        : {}),
    });
    result.status = 'converged';
    result.message = 'An exact root was found in the supplied inputs.';
    return true;
  };
  // Compare the residual to arithmetic at this estimate, never to the starting
  // value: a huge starting residual can conceal poles and rootless functions.
  const residualSatisfied = (x: number): boolean => {
    evaluations += 1;
    return expression.normalizedResidual(x) <= problem.tolerance;
  };
  const converged = (x: number, fx: number, movement: number): boolean =>
    fx === 0 ||
    (movement / Math.max(1, Math.abs(x)) <= problem.tolerance &&
      residualSatisfied(x));
  const success = (): void => {
    result.status = 'converged';
    result.message =
      'The estimate and equation residual satisfy the convergence checks.';
  };
  const limit = (): void => {
    throw new Error(
      'The iteration limit was reached before convergence. Increase the limit or choose different inputs.',
    );
  };

  try {
    if (problem.method === 'bisection') {
      let a = Math.min(problem.a, problem.b);
      let b = Math.max(problem.a, problem.b);
      let fa = f(a);
      if (!exact(a, fa, [1, a, b, a, fa, 0])) {
        const fb = f(b);
        if (!exact(b, fb, [1, a, b, b, fb, 0])) {
          remember(a, fa);
          if (a === b || Math.sign(fa) === Math.sign(fb)) {
            throw new Error(
              'Bisection needs distinct bracket endpoints with opposite function signs.',
            );
          }
          for (let index = 1; index <= problem.maxIterations; index += 1) {
            const midpoint = a / 2 + b / 2;
            const fm = f(midpoint);
            const halfWidth = Math.abs(b / 2 - a / 2);
            remember(midpoint, fm);
            result.steps.push({
              index,
              formula: 'm = (a + b) / 2; keep the half with opposite signs',
              explanation:
                'The midpoint splits the bracket. A sign change identifies the next candidate interval; the residual also checks that the estimate approaches a root.',
              cells: [index, a, b, midpoint, fm, halfWidth],
              marker: { x: midpoint, y: fm },
              helper: [
                { x: a, y: 0 },
                { x: b, y: 0 },
              ],
              interval: [a, b],
            });
            if (converged(midpoint, fm, halfWidth)) {
              success();
              break;
            }
            if (midpoint === a || midpoint === b) {
              throw new Error(
                'The bracket cannot shrink further at machine precision, but the residual is not converged. The bracket may contain a discontinuity.',
              );
            }
            if (Math.sign(fa) !== Math.sign(fm)) {
              b = midpoint;
            } else {
              a = midpoint;
              fa = fm;
            }
          }
          if (result.status !== 'converged') {
            limit();
          }
        }
      }
    } else if (problem.method === 'newton') {
      let x = problem.x0;
      let fx = f(x);
      remember(x, fx);
      if (!exact(x, fx, [1, x, fx, null, x, 0])) {
        const derivative = expression.derivative();
        for (let index = 1; index <= problem.maxIterations; index += 1) {
          evaluations += 1;
          const slope = derivative(x);
          if (slope === 0) {
            throw new Error(
              'Newton–Raphson stopped because the derivative is zero. Choose another starting guess.',
            );
          }
          const next = checked(
            x - fx / slope,
            'The Newton estimate overflowed the real number range.',
          );
          const movement = Math.abs(next - x);
          const acceptCurrent = converged(x, fx, movement);
          const nextF = acceptCurrent ? fx : f(next);
          remember(acceptCurrent ? x : next, nextF);
          result.steps.push({
            index,
            formula: 'xₙ₊₁ = xₙ − f(xₙ) / f′(xₙ)',
            explanation: acceptCurrent
              ? 'The current estimate already satisfies the residual and predicted step checks, so it is retained before another evaluation could lose precision.'
              : 'The tangent at the current estimate meets the x axis at the next estimate.',
            cells: [
              index,
              x,
              fx,
              slope,
              next,
              Number.isFinite(movement) ? movement : null,
            ],
            marker: { x, y: fx },
            helper: [
              { x, y: fx },
              { x: next, y: 0 },
            ],
          });
          if (acceptCurrent || converged(next, nextF, movement)) {
            success();
            break;
          }
          if (next === x) {
            throw new Error(
              'Newton–Raphson stagnated at machine precision without a small enough residual.',
            );
          }
          x = next;
          fx = nextF;
        }
        if (result.status !== 'converged') {
          limit();
        }
      }
    } else if (problem.method === 'secant') {
      let previous = problem.x0;
      let x = problem.x1;
      let previousF = f(previous);
      if (
        !exact(previous, previousF, [
          1,
          previous,
          previous,
          previousF,
          previous,
          0,
        ])
      ) {
        let fx = f(x);
        remember(x, fx);
        if (!exact(x, fx, [1, previous, x, fx, x, 0])) {
          for (let index = 1; index <= problem.maxIterations; index += 1) {
            // Normalize function values before subtraction to avoid overflow and
            // preserve the method under multiplying f by a nonzero constant.
            const valueScale = Math.max(Math.abs(previousF), Math.abs(fx));
            const denominator = fx / valueScale - previousF / valueScale;
            if (denominator === 0 || previous === x) {
              throw new Error(
                'Secant stopped because its slope denominator is zero. Choose two different guesses with different function values.',
              );
            }
            const delta = checked(
              (fx / valueScale / denominator) * (x - previous),
              'The secant step overflowed the real number range.',
            );
            const next = checked(
              x - delta,
              'The secant estimate overflowed the real number range.',
            );
            const movement = Math.abs(next - x);
            const acceptCurrent = converged(x, fx, movement);
            const nextF = acceptCurrent ? fx : f(next);
            remember(acceptCurrent ? x : next, nextF);
            result.steps.push({
              index,
              formula: 'xₙ₊₁ = xₙ − f(xₙ)(xₙ − xₙ₋₁) / (f(xₙ) − f(xₙ₋₁))',
              explanation: acceptCurrent
                ? 'The current estimate already satisfies the residual and predicted step checks, so it is retained before another evaluation could lose precision.'
                : 'The line through the two most recent function points meets the x axis at the next estimate.',
              cells: [
                index,
                previous,
                x,
                fx,
                next,
                Number.isFinite(movement) ? movement : null,
              ],
              marker: { x, y: fx },
              helper: [
                { x: previous, y: previousF },
                { x, y: fx },
                { x: next, y: 0 },
              ],
            });
            if (acceptCurrent || converged(next, nextF, movement)) {
              success();
              break;
            }
            if (next === x) {
              throw new Error(
                'Secant stagnated at machine precision without a small enough residual.',
              );
            }
            previous = x;
            previousF = fx;
            x = next;
            fx = nextF;
          }
          if (result.status !== 'converged') {
            limit();
          }
        }
      }
    } else {
      let x = problem.x0;
      const fx = f(x);
      remember(x, fx);
      if (
        fx === 0 &&
        Math.abs(g(x) - x) / Math.max(1, Math.abs(x)) > problem.tolerance
      ) {
        throw new Error(
          'The initial value solves f(x), but the supplied mapping does not keep it fixed. Supply an equivalent g(x).',
        );
      }
      if (!exact(x, fx, [1, x, x, fx, 0])) {
        for (let index = 1; index <= problem.maxIterations; index += 1) {
          const next = g(x);
          const nextF = f(next);
          const movement = Math.abs(next - x);
          remember(next, nextF);
          result.steps.push({
            index,
            formula: 'xₙ₊₁ = g(xₙ); verify f(xₙ₊₁) → 0',
            explanation:
              'Move vertically to g(x), then horizontally to y = x. A fixed point is accepted only when it also solves the original equation.',
            cells: [
              index,
              x,
              next,
              nextF,
              Number.isFinite(movement) ? movement : null,
            ],
            marker: { x, y: next },
            helper: [
              { x, y: x },
              { x, y: next },
              { x: next, y: next },
            ],
          });
          if (next === x && nextF !== 0) {
            throw new Error(
              'The mapping stagnated at a fixed point that does not solve the original equation. Supply an equivalent g(x).',
            );
          }
          const equationSatisfied = nextF === 0 || residualSatisfied(next);
          const mappingSatisfied =
            Math.abs(g(next) - next) / Math.max(1, Math.abs(next)) <=
            problem.tolerance;
          if (equationSatisfied && mappingSatisfied) {
            success();
            break;
          }
          if (next === x) {
            throw new Error(
              'The mapping stagnated at a fixed point that does not solve the original equation. Supply an equivalent g(x).',
            );
          }
          x = next;
        }
        if (result.status !== 'converged') {
          limit();
        }
      }
    }
  } catch (error) {
    result.status = 'failed';
    result.message =
      error instanceof Error
        ? error.message
        : 'The calculation could not continue with these inputs.';
  }
  const starts =
    problem.method === 'bisection'
      ? [problem.a, problem.b]
      : problem.method === 'secant'
      ? [problem.x0, problem.x1]
      : [problem.x0];
  const plotPoints: Point[] = result.steps.flatMap(step => [
    ...(step.marker ? [step.marker] : []),
    ...step.helper,
  ]);
  result.xDomain = domainFor([...starts, ...plotPoints.map(point => point.x)]);
  result.curve = sampleCurve(
    mapping ? mapping.evaluate : expression.evaluate,
    result.xDomain,
  );
  result.functionEvaluations = evaluations;
  return result;
}
