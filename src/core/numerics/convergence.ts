/**
 * Convergence measurement for iterative methods.
 *
 * These functions observe a recorded error sequence; they never re-run an
 * algorithm and never evaluate user input. An iterative method satisfies
 * e(n+1) ~= C * e(n)^p near the root, so two consecutive error ratios expose
 * the order p and the asymptotic error constant C.
 */

/** The smallest number of recorded errors that can produce two ratios. */
const MINIMUM_SAMPLES = 3;

function usableTriple(
  errors: number[],
  end: number,
): [number, number, number] | null {
  const third = errors[end];
  const second = errors[end - 1];
  const first = errors[end - 2];
  if (!(first > 0 && second > 0 && third > 0)) {
    return null;
  }
  if (!Number.isFinite(first + second + third)) {
    return null;
  }
  // Equal consecutive errors give a zero denominator and no measurable order.
  if (second === first) {
    return null;
  }
  return [first, second, third];
}

/** How many of the most recent estimates are combined into the reported order. */
const WINDOW = 3;

/** Every order estimate the recorded sequence supports, oldest first. */
function orderSamples(errors: number[]): number[] {
  const samples: number[] = [];
  for (let end = MINIMUM_SAMPLES - 1; end < errors.length; end += 1) {
    const triple = usableTriple(errors, end);
    if (!triple) {
      continue;
    }
    const [first, second, third] = triple;
    const denominator = Math.log(second / first);
    const numerator = Math.log(third / second);
    if (denominator === 0 || !Number.isFinite(denominator)) {
      continue;
    }
    if (!Number.isFinite(numerator)) {
      continue;
    }
    const order = numerator / denominator;
    if (Number.isFinite(order) && order > 0) {
      samples.push(order);
    }
  }
  return samples;
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Estimate the observed order of convergence from recorded errors.
 *
 * A single triple is fragile: early iterations are pre-asymptotic, and the
 * secant method's two-term recurrence makes consecutive estimates alternate
 * around its true order. Reporting the median of the most recent estimates
 * resists both effects without inventing a value. Returns null when the
 * record is too short or too degenerate to support a claim.
 */
export function estimateOrder(errors: number[]): number | null {
  const samples = orderSamples(errors);
  if (samples.length === 0) {
    return null;
  }
  return median(samples.slice(-WINDOW));
}

/**
 * Estimate the asymptotic error constant C in e(n+1) ~= C * e(n)^p, using the
 * same triple the order came from. Returns null when no order is measurable.
 */
export function estimateErrorConstant(
  errors: number[],
  order: number | null,
): number | null {
  if (order === null) {
    return null;
  }
  for (let end = errors.length - 1; end >= MINIMUM_SAMPLES - 1; end -= 1) {
    const triple = usableTriple(errors, end);
    if (!triple) {
      continue;
    }
    const [, second, third] = triple;
    const constant = third / Math.pow(second, order);
    if (Number.isFinite(constant) && constant > 0) {
      return constant;
    }
  }
  return null;
}

/**
 * Work performed per accepted iteration. Reported alongside the order so a
 * cheaper method with a lower order can still be compared honestly.
 */
export function efficiencyIndex(
  order: number | null,
  evaluationsPerIteration: number,
): number | null {
  if (order === null || !(order > 0)) {
    return null;
  }
  if (!(evaluationsPerIteration > 0)) {
    return null;
  }
  const index = Math.pow(order, 1 / evaluationsPerIteration);
  return Number.isFinite(index) ? index : null;
}
