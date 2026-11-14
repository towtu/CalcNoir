import { calculate, validateProblem } from '../src/core/numerics';
import type {
  InterpolationProblem,
  RootProblem,
} from '../src/core/numerics/types';

const root = (overrides: Partial<RootProblem> = {}): RootProblem => ({
  kind: 'root',
  method: 'bisection',
  expression: 'x^2 - 2',
  a: 0,
  b: 2,
  x0: 1,
  x1: 2,
  tolerance: 1e-9,
  maxIterations: 100,
  precision: 6,
  ...overrides,
});
const interpolation = (
  overrides: Partial<InterpolationProblem> = {},
): InterpolationProblem => ({
  kind: 'interpolation',
  method: 'newton-divided',
  points: [
    { x: 0, y: 1 },
    { x: 1, y: 4 },
    { x: 2, y: 9 },
  ],
  targetX: 1.5,
  precision: 6,
  ...overrides,
});

describe('validated numerical inputs', () => {
  test.each([
    'x = y',
    'a=2',
    'constructor(x)',
    'log(x,2,3)',
    'sin(x,x)',
    'x=2=3',
    '1e999',
    'x[1]',
    'x.constructor',
    '[1,2]',
    'x;2',
    'random()',
    'import("a")',
    'x < 2',
    'x!',
    '"hello"',
    '2 cm',
    'f(x)=x',
  ])('rejects unsafe expression %s', expression => {
    expect(() => validateProblem(root({ expression }))).toThrow();
  });
  test('bounds work and requires finite numerical settings', () => {
    expect(() =>
      validateProblem(root({ expression: 'x'.repeat(301) })),
    ).toThrow();
    expect(() =>
      validateProblem(root({ expression: Array(52).fill('x').join('+') })),
    ).toThrow();
    expect(() => validateProblem(root({ maxIterations: 201 }))).toThrow();
    expect(() => validateProblem(root({ tolerance: 0 }))).toThrow();
    expect(() => validateProblem(root({ x0: Infinity }))).toThrow();
    expect(() => validateProblem(root({ precision: 1.5 }))).toThrow();
    expect(() =>
      validateProblem(root({ method: 'fixed-point', gExpression: '' })),
    ).toThrow();
    expect(() =>
      validateProblem({
        ...interpolation(),
        points: [
          { x: 0, y: 1 },
          { x: 0, y: 2 },
        ],
      }),
    ).toThrow();
    expect(() =>
      validateProblem(
        interpolation({
          points: [
            { x: NaN, y: 1 },
            { x: 2, y: 3 },
          ],
        }),
      ),
    ).toThrow();
    expect(() =>
      validateProblem(
        interpolation({
          points: Array.from({ length: 21 }, (_, x) => ({ x, y: x })),
        }),
      ),
    ).toThrow();
  });
  test('takes a detached input snapshot', () => {
    const problem = interpolation();
    const result = calculate(problem);
    problem.points[0].y = 999;
    expect((result.problem as InterpolationProblem).points[0].y).toBe(1);
  });
});

describe('root methods', () => {
  test.each(['bisection', 'newton', 'secant'] as const)(
    '%s finds sqrt(2) and keeps table and plot records consistent',
    method => {
      const result = calculate(root({ method }));
      expect(result.status).toBe('converged');
      expect(result.value).toBeCloseTo(Math.SQRT2, 8);
      expect(result.residual).toBeLessThan(1e-8);
      expect(result.steps.length).toBeGreaterThan(0);
      expect(
        result.steps.every(step => step.cells.length === result.columns.length),
      ).toBe(true);
      expect(
        result.steps.every(
          step => step.formula.length > 0 && step.explanation.length > 0,
        ),
      ).toBe(true);
      expect(result.curve.length).toBeGreaterThan(50);
      expect(result.functionEvaluations).toBeGreaterThan(0);
      expect(result.xDomain[0]).toBeLessThan(result.xDomain[1]);
      if (method === 'bisection') {
        expect(
          result.steps.every(
            step =>
              step.interval &&
              step.interval[0] <= step.marker!.x &&
              step.interval[1] >= step.marker!.x,
          ),
        ).toBe(true);
      } else {
        expect(result.steps[0].helper.some(point => point.y === 0)).toBe(true);
      }
    },
  );
  test.each([
    'x² = 4',
    '2x = 4',
    'x = sqrt(4)',
    'sin(x) = 0',
    'ln(e) + cos(pi) + x = 2',
  ])('accepts editable algebra %s', expression => {
    const result = calculate(root({ method: 'newton', expression, x0: 1.9 }));
    expect(result.status).toBe('converged');
    expect(result.residual).toBeLessThan(1e-7);
  });
  test.each(['bisection', 'newton', 'secant'] as const)(
    '%s is invariant under large or tiny equation scaling',
    method => {
      for (const factor of ['1e-200', '1e200']) {
        const result = calculate(
          root({ method, expression: `${factor}*(x^2-2)` }),
        );
        expect(result.status).toBe('converged');
        expect(result.value).toBeCloseTo(Math.SQRT2, 8);
      }
    },
  );
  test('fixed point does not accept a root reached by a mapping that immediately leaves it', () => {
    const result = calculate(
      root({
        method: 'fixed-point',
        expression: 'x-2',
        gExpression: 'x+1',
        x0: 1,
      }),
    );
    expect(result.status).toBe('failed');
  });
  test('fixed point checks the mapping even when the supplied estimate solves f', () => {
    expect(
      calculate(
        root({
          method: 'fixed-point',
          expression: 'x-2',
          gExpression: '1',
          x0: 2,
        }),
      ).status,
    ).toBe('failed');
    const valid = calculate(
      root({
        method: 'fixed-point',
        expression: 'x-2',
        gExpression: 'x/2+1',
        x0: 2,
      }),
    );
    expect(valid.status).toBe('converged');
    expect(valid.steps).toHaveLength(1);
  });
  test('Newton handles a removable zero-power derivative term at x = 0', () => {
    const result = calculate(
      root({ method: 'newton', expression: 'x^0 + x - 2', x0: 0 }),
    );
    expect(result.status).toBe('converged');
    expect(result.value).toBe(1);
  });
  test('display precision does not round the solution', () => {
    const first = calculate(root({ method: 'newton', precision: 0 }));
    const second = calculate(root({ method: 'newton', precision: 12 }));
    expect(first.value).toBe(second.value);
    expect(first.value).not.toBe(1);
  });
  test.each([
    { method: 'bisection', expression: 'x-2', a: 2, b: 5 },
    { method: 'bisection', expression: 'x-2', a: -1, b: 2 },
    { method: 'newton', expression: 'x^3', x0: 0 },
    { method: 'secant', expression: 'x-2', x0: 2, x1: 2 },
    { method: 'secant', expression: 'x-2', x0: 1, x1: 2 },
  ] as const)(
    'accepts an exact initial or endpoint root before checking method hazards: %p',
    overrides => {
      const result = calculate(root(overrides));
      expect(result.status).toBe('converged');
      expect(result.residual).toBe(0);
      expect(result.steps).toHaveLength(1);
    },
  );
  test('does not mistake a small scaled endpoint for an exact root', () => {
    const result = calculate(root({ expression: '1e-20*(x-1)', a: 0, b: 3 }));
    expect(result.status).toBe('converged');
    expect(result.value).toBeCloseTo(1, 8);
    expect(result.steps.length).toBeGreaterThan(1);
  });
  test.each([
    { expression: 'x^2+1', a: -1, b: 1 },
    { expression: '1/(x-0.1)', a: -1, b: 1 },
    { expression: '1/x', a: -1, b: 1 },
    { method: 'newton', expression: 'x^2+1', x0: 0 },
    { method: 'newton', expression: 'sqrt(x)', x0: -1 },
    { method: 'secant', expression: 'x^2+1', x0: -1, x1: 1 },
    { method: 'newton', expression: 'x^2-2', maxIterations: 1 },
  ] as const)('reports numerical failure for %p', overrides => {
    const result = calculate(root(overrides));
    expect(result.status).toBe('failed');
    expect(result.message.length).toBeGreaterThan(5);
    expect(result.steps.length).toBeLessThanOrEqual(
      root(overrides).maxIterations,
    );
  });
  test('fixed point verifies both the mapping and original equation', () => {
    const result = calculate(
      root({
        method: 'fixed-point',
        expression: 'x^2-2',
        gExpression: '(x+2/x)/2',
      }),
    );
    expect(result.status).toBe('converged');
    expect(result.value).toBeCloseTo(Math.SQRT2, 8);
    expect(result.plotKind).toBe('mapping');
    expect(result.steps[0].helper).toEqual([
      { x: 1, y: 1 },
      { x: 1, y: 1.5 },
      { x: 1.5, y: 1.5 },
    ]);
    expect(
      calculate(
        root({ method: 'fixed-point', expression: 'x-2', gExpression: '1' }),
      ).status,
    ).toBe('failed');
    expect(
      calculate(
        root({
          method: 'fixed-point',
          expression: 'x^2-2',
          gExpression: 'x+1',
        }),
      ).status,
    ).toBe('failed');
  });
  test.each([
    { method: 'bisection', expression: '1/x', a: -1e-20, b: 1 },
    { method: 'newton', expression: 'exp(1e10*x)+1', x0: 1e-8 },
    { method: 'secant', expression: 'exp(1e10*x)+1', x0: 1e-8, x1: 1.01e-8 },
    { method: 'secant', expression: 'exp(1e10*x)+1', x0: 1e-8, x1: 9.9e-9 },
    { method: 'fixed-point', expression: 'x^2+1', gExpression: '0', x0: 1e6 },
    { method: 'newton', expression: 'exp(-1000)', x0: 1 },
    { method: 'newton', expression: '1e-400', x0: 1 },
    { method: 'newton', expression: '1e-200 * 1e-200', x0: 1 },
    { method: 'newton', expression: '1e-200 / 1e200', x0: 1 },
    { method: 'newton', expression: '1e-200 ^ 2', x0: 1 },
    { method: 'newton', expression: '1e-320*(x-1)', x0: 1.0001 },
  ] as const)(
    'does not declare convergence after scale loss or underflow: %p',
    overrides => {
      const result = calculate(root(overrides));
      expect(result.status).toBe('failed');
    },
  );
  test.each([
    {
      method: 'fixed-point',
      expression: '(x-x)+1',
      gExpression: 'x',
      x0: 1e12,
    },
    {
      method: 'fixed-point',
      expression: '(x-x)+1e-200',
      gExpression: 'x',
      x0: 1e12,
    },
    {
      method: 'fixed-point',
      expression: 'x^2+1e-20',
      gExpression: '0',
      x0: 1e6,
    },
    { method: 'newton', expression: 'x+(1-x)', x0: 1e20 },
    { method: 'secant', expression: 'x+(1-x)', x0: 1e20, x1: 2e20 },
    { method: 'bisection', expression: 'x+(1-x)', a: 1e20, b: 2e20 },
  ] as const)(
    'rejects absorbed arithmetic and algebraically rootless cancellations: %p',
    overrides => {
      expect(calculate(root(overrides)).status).toBe('failed');
    },
  );
  test.each([
    'exp(-1e-20*x)-1',
    'tanh(100*x)-1',
    'atan(1e20*x)-pi/2',
    'cosh(1e-20*x)-1',
    '2^(1e-20*x)-1',
  ])(
    'rejects function saturation that could create a false exact root: %s',
    expression => {
      expect(
        calculate(root({ method: 'newton', expression, x0: 1 })).status,
      ).toBe('failed');
    },
  );
  test.each(['sin(pi)', 'cos(pi/2)', 'sin(1e-20*x)^2+1e-40'])(
    'fixed point does not accept a tiny positive equation: %s',
    expression => {
      expect(
        calculate(
          root({ method: 'fixed-point', expression, gExpression: 'x', x0: 1 }),
        ).status,
      ).toBe('failed');
    },
  );
  test.each(['newton', 'secant'] as const)(
    '%s retains ordinary exponential convergence before function saturation',
    method => {
      const result = calculate(
        root({ method, expression: 'exp(x)-1', x0: 0.1, x1: 0.2 }),
      );
      expect(result.status).toBe('converged');
      expect(Math.abs(result.value!)).toBeLessThan(1e-9);
    },
  );
  test('a returned column array cannot mutate another calculation', () => {
    const result = calculate(root());
    result.columns[0] = 'changed';
    expect(calculate(root()).columns[0]).toBe('n');
  });
  test('graph samples keep domain gaps instead of inventing real values', () => {
    const result = calculate(
      root({ method: 'newton', expression: 'sqrt(x)-1', x0: 1 }),
    );
    expect(result.curve.some(point => point.x < 0 && point.y === null)).toBe(
      true,
    );
    expect(
      result.curve.some(point => point.x > 0 && typeof point.y === 'number'),
    ).toBe(true);
  });
});

describe('polynomial interpolation', () => {
  test.each(['newton-divided', 'lagrange'] as const)(
    '%s reproduces a quadratic, nodes, and the actual polynomial curve',
    method => {
      const result = calculate(interpolation({ method }));
      expect(result.status).toBe('calculated');
      expect(result.value).toBeCloseTo(6.25, 12);
      expect(result.plotKind).toBe('polynomial');
      expect(result.steps).toHaveLength(3);
      expect(
        result.steps.every(step => step.cells.length === result.columns.length),
      ).toBe(true);
      for (const sample of result.curve) {
        expect(sample.y).toBeCloseTo((sample.x + 1) ** 2, 9);
      }
      for (const point of interpolation().points) {
        expect(
          calculate(interpolation({ method, targetX: point.x })).value,
        ).toBe(point.y);
      }
      if (method === 'lagrange') {
        expect(
          result.steps.every(
            step => step.contribution && step.contribution.length > 50,
          ),
        ).toBe(true);
        result.curve.forEach((sample, index) => {
          const sum = result.steps.reduce(
            (total, step) => total + (step.contribution![index].y ?? 0),
            0,
          );
          expect(sum).toBeCloseTo(sample.y!, 9);
        });
      }
    },
  );
  test.each(['newton-divided', 'lagrange'] as const)(
    '%s reproduces a quartic with five unsorted nodes',
    method => {
      const polynomial = (x: number) => x ** 4 - 2 * x ** 3 + 3 * x - 7;
      const result = calculate(
        interpolation({
          method,
          points: [2, -2, 0, -1, 1].map(x => ({ x, y: polynomial(x) })),
          targetX: 0.25,
        }),
      );
      expect(result.status).toBe('calculated');
      expect(result.value).toBeCloseTo(polynomial(0.25), 10);
    },
  );
  test('accepts unsorted points and negative targets', () => {
    const result = calculate(
      interpolation({
        points: [
          { x: 2, y: 9 },
          { x: 0, y: 1 },
          { x: 1, y: 4 },
        ],
        targetX: -2,
      }),
    );
    expect(result.value).toBeCloseTo(1, 12);
  });
  test('rejects an overflowing divided-difference denominator', () => {
    const result = calculate(
      interpolation({
        points: [
          { x: -1.7e308, y: -1 },
          { x: 1.7e308, y: 1 },
        ],
        targetX: 0,
      }),
    );
    expect(result.status).toBe('failed');
    expect(result.value).toBeNull();
  });
  test('huge Lagrange extrapolation is accurate or reports conditioning failure', () => {
    const result = calculate(
      interpolation({
        method: 'lagrange',
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        targetX: 1e14,
      }),
    );
    if (result.status === 'calculated') {
      expect(result.value).toBeCloseTo(1e14, 0);
    } else {
      expect(result.value).toBeNull();
    }
  });
  test('reports overflow without leaking NaN into table cells', () => {
    const result = calculate(
      interpolation({
        points: [
          { x: 0, y: 1e308 },
          { x: 1e-308, y: -1e308 },
        ],
      }),
    );
    expect(result.status).toBe('failed');
    expect(result.value).toBeNull();
    expect(
      result.steps.every(step =>
        step.cells.every(
          cell => typeof cell !== 'number' || Number.isFinite(cell),
        ),
      ),
    ).toBe(true);
  });
});
