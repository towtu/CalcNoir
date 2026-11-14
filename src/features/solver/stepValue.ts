import type {
  Calculation,
  CalculationStep,
  MethodId,
} from '../../core/numerics/types';
import { formatNumber } from '../../shared/ui/format';
const valueColumns: Record<MethodId, number> = {
  bisection: 3,
  newton: 4,
  secant: 4,
  'fixed-point': 2,
  'newton-divided': 5,
  lagrange: 5,
};
export function stepValue(calculation: Calculation, step: CalculationStep) {
  const column = valueColumns[calculation.problem.method];
  const value = step.cells[column];
  return {
    label: calculation.columns[column] ?? 'Value',
    formatted:
      typeof value === 'number'
        ? formatNumber(value, calculation.problem.precision)
        : value ?? '—',
  };
}
