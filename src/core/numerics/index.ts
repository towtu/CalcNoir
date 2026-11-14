import { calculateInterpolation } from './interpolation';
import { calculateRoot } from './roots';
import { validateProblem } from './validation';
import type { Calculation, Problem } from './types';

export { validateProblem };
export type * from './types';

/** Calculations never round internal values; precision belongs to presentation. */
export function calculate(problem: Problem): Calculation {
  const snapshot = validateProblem(problem);
  return snapshot.kind === 'root'
    ? calculateRoot(snapshot)
    : calculateInterpolation(snapshot);
}
