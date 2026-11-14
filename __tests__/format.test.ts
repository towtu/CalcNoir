import { calculationReport, formatNumber } from '../src/shared/ui/format';
import { defaultProblem } from '../src/core/methods';
import { calculate } from '../src/core/numerics';

test('scientific notation honors the requested display precision', () => {
  expect(formatNumber(1.234567890123e-6, 12)).toBe('1.234567890123e-6');
  expect(formatNumber(1.23456789e10, 9)).toBe('1.234567890e+10');
});

test('shared equalities and active settings describe the actual calculation', () => {
  const problem = defaultProblem('bisection');
  if (problem.kind !== 'root') {
    throw new Error('Expected root preset');
  }
  const report = calculationReport(
    calculate({ ...problem, expression: 'x^2=2' }),
  );
  expect(report).toContain('Equation: x^2=2');
  expect(report).toContain('Bracket: [1, 2]');
  expect(report).toContain('Status: converged');
  expect(report).toContain('Tolerance: 0.000001');
  expect(report).not.toContain('f(x) = x^2=2');
  expect(report).not.toContain('g(x) =');
});
