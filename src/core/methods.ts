import type {
  MethodId,
  Problem,
  RootMethod,
  InterpolationMethod,
} from './numerics/types';
export const METHODS: ReadonlyArray<{
  id: MethodId;
  title: string;
  description: string;
  symbol: string;
  category: 'root' | 'interpolation';
  formula: string;
}> = [
  {
    id: 'bisection',
    title: 'Bisection',
    description: 'Narrow an interval, one decision at a time.',
    symbol: '[÷]',
    category: 'root',
    formula: 'c = (a + b) / 2',
  },
  {
    id: 'newton',
    title: 'Newton-Raphson',
    description: 'Follow a tangent toward your next estimate.',
    symbol: 'f′',
    category: 'root',
    formula: 'xₙ₊₁ = xₙ − f(xₙ) / f′(xₙ)',
  },
  {
    id: 'secant',
    title: 'Secant',
    description: 'Use two estimates to draw the next line.',
    symbol: '↗',
    category: 'root',
    formula: 'xₙ₊₁ = xₙ − f(xₙ)(xₙ − xₙ₋₁) / (f(xₙ) − f(xₙ₋₁))',
  },
  {
    id: 'fixed-point',
    title: 'Fixed-Point',
    description: 'Repeat a mapping and watch where it settles.',
    symbol: '↻',
    category: 'root',
    formula: 'xₙ₊₁ = g(xₙ)',
  },
  {
    id: 'newton-divided',
    title: 'Divided Differences',
    description: 'Build a polynomial from the difference table.',
    symbol: 'Δ',
    category: 'interpolation',
    formula: 'P(x) = f[x₀] + f[x₀,x₁](x − x₀) + …',
  },
  {
    id: 'lagrange',
    title: 'Lagrange',
    description: 'See how each point contributes to the curve.',
    symbol: 'Σ',
    category: 'interpolation',
    formula: 'P(x) = Σ yᵢ Lᵢ(x)',
  },
];
export function methodInfo(id: MethodId) {
  return METHODS.find(method => method.id === id) || METHODS[0];
}
export function presetsFor(
  method: MethodId,
): Array<{ label: string; problem: Problem }> {
  const info = methodInfo(method);
  if (info.category === 'interpolation') {
    return [
      {
        label: 'A quadratic from points',
        problem: {
          kind: 'interpolation',
          method: method as InterpolationMethod,
          precision: 6,
          targetX: 1.5,
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 2, y: 4 },
            { x: 3, y: 9 },
          ],
        },
      },
      {
        label: 'Uneven measurements',
        problem: {
          kind: 'interpolation',
          method: method as InterpolationMethod,
          precision: 6,
          targetX: 3,
          points: [
            { x: 1, y: 2 },
            { x: 2, y: 3.5 },
            { x: 4, y: 8 },
            { x: 5, y: 12.5 },
          ],
        },
      },
    ];
  }
  const base = {
    kind: 'root' as const,
    method: method as RootMethod,
    precision: 6,
    tolerance: 1e-6,
    maxIterations: 80,
  };
  return [
    {
      label: 'A cubic equation',
      problem: {
        ...base,
        expression: 'x^3-x-2',
        gExpression: '(x+2)^(1/3)',
        a: 1,
        b: 2,
        x0: 1.5,
        x1: 2,
      },
    },
    {
      label: 'Where cosine meets x',
      problem: {
        ...base,
        expression: 'cos(x)-x',
        gExpression: 'cos(x)',
        a: 0,
        b: 1,
        x0: 0.5,
        x1: 1,
      },
    },
    {
      label: 'Finding √2',
      problem: {
        ...base,
        expression: 'x^2-2',
        gExpression: '(x+2/x)/2',
        a: 1,
        b: 2,
        x0: 1.5,
        x1: 2,
      },
    },
  ];
}
export function defaultProblem(method: MethodId = 'bisection'): Problem {
  return presetsFor(method)[0].problem;
}
