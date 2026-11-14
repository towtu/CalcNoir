import { calculate, validateProblem } from '../src/core/numerics';
import { compileExpression } from '../src/core/numerics/expression';
import type {
  Calculation,
  InterpolationProblem,
  RootProblem,
} from '../src/core/numerics/types';

const root = (overrides: Partial<RootProblem> = {}): RootProblem => ({
  kind: 'root',
  method: 'bisection',
  expression: 'x^2-2',
  a: 0,
  b: 2,
  x0: 1,
  x1: 2,
  tolerance: 1e-9,
  maxIterations: 100,
  precision: 8,
  ...overrides,
});
const interpolation = (
  overrides: Partial<InterpolationProblem> = {},
): InterpolationProblem => ({
  kind: 'interpolation',
  method: 'newton-divided',
  points: [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 4 },
  ],
  targetX: 0.5,
  precision: 8,
  ...overrides,
});

function expectFiniteRecords(result: Calculation): void {
  expect(result.xDomain.every(Number.isFinite)).toBe(true);
  expect(result.xDomain[0]).toBeLessThan(result.xDomain[1]);
  expect(result.curve).toHaveLength(161);
  for (const sample of result.curve) {
    expect(Number.isFinite(sample.x)).toBe(true);
    expect(sample.y === null || Number.isFinite(sample.y)).toBe(true);
    expect(sample.x).toBeGreaterThanOrEqual(result.xDomain[0]);
    expect(sample.x).toBeLessThanOrEqual(result.xDomain[1]);
  }
  for (const step of result.steps) {
    expect(step.cells).toHaveLength(result.columns.length);
    expect(
      step.cells.every(
        cell => typeof cell !== 'number' || Number.isFinite(cell),
      ),
    ).toBe(true);
    expect(step.formula.length).toBeGreaterThan(0);
    expect(step.explanation.length).toBeGreaterThan(0);
    for (const point of [
      ...(step.marker ? [step.marker] : []),
      ...step.helper,
    ]) {
      expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
    }
  }
}

describe('independent QA: root answers and finite records', () => {
  test.each(['bisection', 'newton', 'secant'] as const)(
    '%s solves exp(-x)=x with its recorded values',
    method => {
      const result = calculate(
        root({ method, expression: 'exp(-x)=x', x0: 0, x1: 1 }),
      );
      expect(result.status).toBe('converged');
      expect(result.value).toBeCloseTo(0.5671432904097838, 8);
      expect(result.residual).toBeLessThan(1e-8);
      expectFiniteRecords(result);
      const f = compileExpression(
        result.problem.kind === 'root' ? result.problem.expression : '0',
      );
      for (const step of result.steps) {
        if (step.marker) {
          expect(step.marker.y).toBeCloseTo(f.evaluate(step.marker.x), 10);
        }
      }
    },
  );
  test('bisection reverses a negative bracket without changing its answer', () => {
    const result = calculate(root({ expression: 'x+3', a: -1, b: -5 }));
    expect(result.status).toBe('converged');
    expect(result.value).toBe(-3);
    expectFiniteRecords(result);
  });
  test('Secant solves a real cube-root equation at negative x', () => {
    const result = calculate(
      root({ method: 'secant', expression: 'cbrt(x)+2', x0: -7, x1: -9 }),
    );
    expect(result.status).toBe('converged');
    expect(result.value).toBeCloseTo(-8, 7);
    expectFiniteRecords(result);
    expect(compileExpression('cbrt(x)').evaluate(-8)).toBe(-2);
  });
  test('fixed point solves a contractive linear mapping and records a true cobweb', () => {
    const result = calculate(
      root({
        method: 'fixed-point',
        expression: 'x-3',
        gExpression: '(x+3)/2',
        x0: -2,
      }),
    );
    expect(result.status).toBe('converged');
    expect(result.value).toBeCloseTo(3, 7);
    expectFiniteRecords(result);
    for (const step of result.steps) {
      const x = step.cells[1] as number;
      const next = step.cells[2] as number;
      expect(next).toBe((x + 3) / 2);
      expect(step.helper).toEqual([
        { x, y: x },
        { x, y: next },
        { x: next, y: next },
      ]);
    }
  });
  test('bisection retains finite records for the widest opposite-sign bracket', () => {
    const result = calculate(root({ expression: 'x', a: -1e308, b: 1e308 }));
    expect(result.status).toBe('converged');
    expect(result.value).toBe(0);
    expectFiniteRecords(result);
  });
  test.each(['bisection', 'newton', 'secant'] as const)(
    '%s solves a scaled linear equation with a tiny finite root',
    method => {
      const result = calculate(
        root({
          method,
          expression: '1e200*x-1',
          a: 0,
          b: 2e-200,
          x0: 0,
          x1: 2e-200,
        }),
      );
      expect(result.status).toBe('converged');
      expect(result.value! / 1e-200).toBeCloseTo(1, 9);
      expectFiniteRecords(result);
    },
  );
  test.each([
    { expression: 'log(x)', a: -1, b: 2 },
    { method: 'newton', expression: 'acos(x)', x0: 2 },
    { method: 'secant', expression: 'atanh(x)', x0: 2, x1: 3 },
    { method: 'newton', expression: 'log(1,-2)+x' },
    { method: 'newton', expression: 'x^2+1', x0: 1, maxIterations: 1 },
    {
      method: 'fixed-point',
      expression: 'x-3',
      gExpression: '-x',
      x0: 1,
      maxIterations: 4,
    },
    { method: 'secant', expression: 'x', x0: -1e308, x1: 1e308 },
  ] as const)('reports failure honestly for %p', overrides => {
    const result = calculate(root(overrides));
    expect(result.status).toBe('failed');
    expect(result.message.length).toBeGreaterThan(5);
    expect(result.steps.length).toBeLessThanOrEqual(
      root(overrides).maxIterations,
    );
    expectFiniteRecords(result);
  });
});

describe('independent QA: parser boundary and allowlist', () => {
  test.each([
    '__proto__',
    'evaluate("x")',
    'x?1:2',
    '{"x":1}',
    '[x][1]',
    'x=1;2',
    '2 % 1',
    '2 mod 1',
    'combinations(50,25)',
    'sin.constructor(x)',
    'sin()',
    'sqrt(x,2)',
    'log(x,2,3)',
  ])('rejects unsupported expression %s', expression => {
    expect(() => validateProblem(root({ expression }))).toThrow();
  });
  test('accepts 99 syntax nodes and rejects 101 syntax nodes', () => {
    expect(() =>
      validateProblem(root({ expression: Array(50).fill('x').join('+') })),
    ).not.toThrow();
    expect(() =>
      validateProblem(root({ expression: Array(51).fill('x').join('+') })),
    ).toThrow(/complex/);
  });
  test('counts deeply nested parentheses against its syntax budget', () => {
    expect(() =>
      validateProblem(
        root({ expression: '('.repeat(99) + 'x' + ')'.repeat(99) }),
      ),
    ).not.toThrow();
    expect(() =>
      validateProblem(
        root({ expression: '('.repeat(100) + 'x' + ')'.repeat(100) }),
      ),
    ).toThrow(/complex/);
  });
  test('normalizes multi-digit superscripts, pi, ln and implicit products consistently', () => {
    expect(compileExpression('x⁻² + 2πx + ln(e)').evaluate(2)).toBeCloseTo(
      0.25 + 4 * Math.PI + 1,
      12,
    );
    expect(compileExpression('x¹² = 4096').evaluate(2)).toBe(0);
    expect(compileExpression('πx + xπ').evaluate(2)).toBeCloseTo(
      4 * Math.PI,
      12,
    );
  });
  test('rejects invalid settings and a mapping equality at the shared boundary', () => {
    expect(() =>
      validateProblem(root({ method: 'fixed-point', gExpression: 'g=x' })),
    ).toThrow();
    expect(() => validateProblem(root({ tolerance: NaN }))).toThrow();
    expect(() => validateProblem(root({ maxIterations: 0 }))).toThrow();
    expect(() =>
      validateProblem(root({ expression: 'x'.repeat(301) })),
    ).toThrow();
    expect(() =>
      validateProblem(
        interpolation({
          points: [
            { x: 0, y: 0 },
            { x: -0, y: 1 },
          ],
        }),
      ),
    ).toThrow();
  });
});

describe('independent QA: interpolation values, nodes and plots', () => {
  const polynomial = (x: number) => ((2 * x - 3) * x + 0.5) * x - 7;
  test.each([1e-100, 1, 1e100])(
    'Newton interpolation retains ordinary non-node zeros at y scale %p',
    scale => {
      const fixtures = [
        {
          points: [
            { x: 0, y: -scale },
            { x: 2, y: scale },
          ],
          targetX: 1,
        },
        {
          points: [
            { x: -2, y: -2 * scale },
            { x: 2, y: 2 * scale },
          ],
          targetX: 0,
        },
        {
          points: [-2, -1, 1, 2].map(x => ({ x, y: x ** 3 * scale })),
          targetX: 0,
        },
      ];
      for (const fixture of fixtures) {
        const result = calculate(interpolation(fixture));
        expect(result.status).toBe('calculated');
        if (fixture.points.length === 2) {
          expect(result.value).toBe(0);
        }
        expect(Math.abs(result.value!) / scale).toBeLessThan(1e-14);
        expect(
          Math.abs(result.steps[result.steps.length - 1].cells[5] as number) /
            scale,
        ).toBeLessThan(1e-14);
      }
    },
  );
  test.each(['newton-divided', 'lagrange'] as const)(
    '%s reproduces a cubic at interpolation, extrapolation, and every unsorted node',
    method => {
      const points = [1, -1, 0.25, -0.5].map(x => ({ x, y: polynomial(x) }));
      for (const targetX of [
        -1.5,
        -0.125,
        0.625,
        2,
        ...points.map(point => point.x),
      ]) {
        const result = calculate(interpolation({ method, points, targetX }));
        expect(result.status).toBe('calculated');
        expect(result.value).toBeCloseTo(polynomial(targetX), 8);
        expectFiniteRecords(result);
        expect(result.steps[result.steps.length - 1].cells[5]).toBeCloseTo(
          result.value!,
          8,
        );
        for (let index = 0; index < result.curve.length; index += 1) {
          const sample = result.curve[index];
          expect(sample.y).toBeCloseTo(polynomial(sample.x), 7);
          if (method === 'lagrange') {
            const sum = result.steps.reduce(
              (value, step) => value + step.contribution![index].y!,
              0,
            );
            expect(sum).toBeCloseTo(sample.y!, 9);
          }
        }
      }
    },
  );
  test.each(['newton-divided', 'lagrange'] as const)(
    '%s retains a constant polynomial with the maximum twenty nodes',
    method => {
      const points = Array.from({ length: 20 }, (_, index) => ({
        x: index - 10,
        y: -3.5,
      }));
      const result = calculate(interpolation({ method, points, targetX: 0.5 }));
      expect(result.status).toBe('calculated');
      expect(result.value).toBeCloseTo(-3.5, 8);
      expect(result.steps).toHaveLength(20);
      expectFiniteRecords(result);
    },
  );
});

describe('independent QA: reproduced precision regressions', () => {
  test('a small legitimate interpolation value is retained without snapping to zero', () => {
    const result = calculate(interpolation({ targetX: 1e-10 }));
    expect(result.status).toBe('calculated');
    expect(result.value! / 1e-20).toBeCloseTo(1, 5);
  });
  test('an absorbed target coordinate cannot create an exact interpolation zero', () => {
    const result = calculate(interpolation({ targetX: 1e-20 }));
    expect(result.status).toBe('failed');
    expect(result.value).toBeNull();
  });
  test.each(['newton', 'secant', 'fixed-point'] as const)(
    '%s rejects a strictly positive scaled quadratic with a tiny apparent step',
    method => {
      const result = calculate(
        root({
          method,
          expression: '1e20*x^2+1',
          x0: 1e-10,
          x1: 2e-10,
          gExpression: 'x/2',
        }),
      );
      expect(result.status).toBe('failed');
    },
  );
  test.each(['log', 'log10'])(
    'Newton rejects a strictly positive squared %s near its zero',
    fn => {
      const result = calculate(
        root({
          method: 'newton',
          expression: `1e20*${fn}(x)^2+1`,
          x0: 1.0000000001,
        }),
      );
      expect(result.status).toBe('failed');
    },
  );
  test('cosine rounding does not create an exact root at a false starting value', () => {
    const result = calculate(
      root({ method: 'newton', expression: 'cos(1e-20*x)-1', x0: 1 }),
    );
    if (result.status === 'converged') {
      expect(Math.abs(result.value!)).toBeLessThan(1e-9);
    } else {
      expect(result.status).toBe('failed');
    }
  });
  test('Newton interpolation detects cancellation and underflow instead of returning a wrong sign', () => {
    const result = calculate(
      interpolation({
        points: [
          { x: 0, y: 0 },
          { x: 1e-150, y: 1 },
          { x: 2e-150, y: 4 },
        ],
        targetX: 1e-200,
      }),
    );
    if (result.status === 'calculated') {
      expect(result.value! / 1e-100).toBeCloseTo(1, 8);
      expect(
        (result.steps[result.steps.length - 1].cells[5] as number) / 1e-100,
      ).toBeCloseTo(1, 8);
    } else {
      expect(result.status).toBe('failed');
      expect(result.value).toBeNull();
    }
  });
});
