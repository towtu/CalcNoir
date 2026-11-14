import type { Calculation } from '../../core/numerics/types';
export function formatNumber(value: number | null, precision = 6): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }
  if (value !== 0 && (Math.abs(value) < 1e-4 || Math.abs(value) >= 1e7)) {
    return value.toExponential(precision);
  }
  return String(Number(value.toFixed(precision)));
}
export function describeExpression(expression: string): string {
  return expression.includes('=')
    ? `Equation: ${expression}`
    : `f(x) = ${expression}`;
}
export function calculationReport(value: Calculation): string {
  const problem = value.problem;
  const input =
    problem.kind === 'root'
      ? `${describeExpression(problem.expression)}${
          problem.method === 'fixed-point'
            ? '\ng(x) = ' + problem.gExpression
            : ''
        }\n${
          problem.method === 'bisection'
            ? `Bracket: [${problem.a}, ${problem.b}]`
            : problem.method === 'secant'
            ? `Initial guesses: ${problem.x0}, ${problem.x1}`
            : `Initial guess: ${problem.x0}`
        }\nTolerance: ${problem.tolerance}\nIteration limit: ${
          problem.maxIterations
        }`
      : `Points: ${problem.points
          .map(p => `(${p.x}, ${p.y})`)
          .join(', ')}\nTarget x: ${problem.targetX}`;
  const csv = [
    value.columns.join(','),
    ...value.steps.map(step =>
      step.cells.map(cell => (cell === null ? '' : String(cell))).join(','),
    ),
  ].join('\n');
  return `CalcNoir — ${problem.method}\n${input}\nDisplay precision: ${
    problem.precision
  }\n\nStatus: ${value.status}\nResult: ${formatNumber(
    value.value,
    problem.precision,
  )}\n${
    value.message
  }\n\n${csv}\n\nDisplay rounding does not change the calculation.`;
}
