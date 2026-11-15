/**
 * Measures convergence order on the app's own starter problems and prints a
 * report. Assertions cover the classical orders; the printed table is what a
 * reader checks against theory.
 */
import { presetsFor } from '../src/core/methods';
import { efficiencyIndex } from '../src/core/numerics/convergence';
import { calculate } from '../src/core/numerics';
import type { RootMethod, RootProblem } from '../src/core/numerics/types';

const METHODS: RootMethod[] = ['bisection', 'newton', 'secant', 'fixed-point'];

function run(method: RootMethod, label: string) {
  const preset = presetsFor(method).find(entry => entry.label === label);
  if (!preset) {
    throw new Error(`missing preset ${label}`);
  }
  return calculate(preset.problem as RootProblem);
}

const LABELS = ['Finding √2', 'Where cosine meets x', 'A cubic equation'];

describe('measured convergence', () => {
  it('prints a convergence report for every starter problem', () => {
    const lines: string[] = [];
    for (const label of LABELS) {
      lines.push('');
      lines.push(`=== ${label} ===`);
      lines.push(
        'method        iters  evals  order p   C          efficiency  diagnosis',
      );
      for (const method of METHODS) {
        const c = run(method, label);
        const p = c.observedOrder;
        const e = efficiencyIndex(p, c.evaluationsPerIteration ?? 1);
        lines.push(
          [
            method.padEnd(13),
            String(c.steps.length).padStart(5),
            String(c.functionEvaluations).padStart(6),
            (p === null ? '—' : p.toFixed(4)).padStart(8),
            (c.errorConstant === null
              ? '—'
              : c.errorConstant.toExponential(2)
            ).padStart(10),
            (e === null ? '—' : e.toFixed(4)).padStart(11),
            '  ' + c.diagnosis,
          ].join(' '),
        );
      }
    }

    lines.push('');
    lines.push('=== error sequence, Newton on √2 ===');
    const newton = run('newton', 'Finding √2');
    newton.errors.forEach((err, i) => {
      lines.push(
        `  n=${i + 1}  e=${err.toExponential(4)}  |f|=${newton.residuals[
          i
        ].toExponential(4)}`,
      );
    });

    lines.push('');
    lines.push('=== error sequence, bisection on √2 ===');
    const bisection = run('bisection', 'Finding √2');
    bisection.errors.slice(0, 8).forEach((err, i) => {
      lines.push(`  n=${i + 1}  e=${err.toExponential(4)}`);
    });

    console.log(lines.join('\n'));
    expect(lines.length).toBeGreaterThan(0);
  });

  it('measures the classical orders on x^2 - 2', () => {
    const bisection = run('bisection', 'Finding √2');
    const newton = run('newton', 'Finding √2');
    const secant = run('secant', 'Finding √2');

    expect(bisection.observedOrder).toBeCloseTo(1, 6);
    expect(newton.observedOrder).toBeGreaterThan(1.7);
    expect(newton.observedOrder).toBeLessThan(2.3);
    // Secant obeys a two-term recurrence, so step-difference estimates
    // straddle the golden ratio rather than settling on it. See
    // docs/convergence-measurement.md.
    expect(secant.observedOrder).toBeGreaterThan(1.2);
    expect(secant.observedOrder).toBeLessThan(2.2);
  });

  it('keeps error and residual records aligned per iteration', () => {
    for (const method of METHODS) {
      const c = run(method, 'Finding √2');
      expect(c.errors.length).toBe(c.residuals.length);
      expect(c.errors.every(value => value >= 0)).toBe(true);
      expect(c.diagnosis).toBe('converged');
    }
  });

  it('reports a specific diagnosis instead of a generic failure', () => {
    const noSignChange = calculate({
      kind: 'root',
      method: 'bisection',
      expression: 'x^2+1',
      a: 1,
      b: 2,
      x0: 1,
      x1: 2,
      tolerance: 1e-6,
      maxIterations: 80,
      precision: 6,
    });
    expect(noSignChange.status).toBe('failed');
    expect(noSignChange.diagnosis).toBe('no-sign-change');
  });
});
