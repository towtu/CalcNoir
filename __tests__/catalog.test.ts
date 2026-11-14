import { METHODS, presetsFor } from '../src/core/methods';
import { calculate } from '../src/core/numerics';

const expected: Record<string, number> = {
  'A cubic equation': 1.5213797068045676,
  'Where cosine meets x': 0.7390851332151607,
  'Finding √2': Math.SQRT2,
  'A quadratic from points': 2.25,
  'Uneven measurements': 5.25,
};
test.each(
  METHODS.flatMap(method =>
    presetsFor(method.id).map(preset => ({
      method: method.title,
      label: preset.label,
      problem: preset.problem,
    })),
  ),
)(
  '$method: shipped preset "$label" produces its known answer',
  ({ label, problem }) => {
    const result = calculate(problem);
    expect(result.status).toBe(
      problem.kind === 'root' ? 'converged' : 'calculated',
    );
    expect(result.value).toBeCloseTo(expected[label], 5);
  },
);
