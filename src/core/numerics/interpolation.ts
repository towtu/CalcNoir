import { domainFor, sampleCurve } from './plot';
import type {
  Calculation,
  CurvePoint,
  InterpolationProblem,
  Point,
} from './types';

function finite(value: number): number {
  if (
    !Number.isFinite(value) ||
    (value !== 0 && Math.abs(value) < 2 ** -1022)
  ) {
    throw new Error(
      'The interpolation exceeded finite precision. Rescale the coordinates or choose points with better spacing.',
    );
  }
  return value;
}

function multiply(left: number, right: number): number {
  const value = finite(left * right);
  if (value === 0 && left !== 0 && right !== 0) {
    throw new Error(
      'An interpolation product underflowed to zero. Rescale the coordinates.',
    );
  }
  return value;
}

function coordinateDifference(left: number, right: number): number {
  const value = finite(left - right);
  if ((right !== 0 && value === left) || (left !== 0 && value === -right)) {
    throw new Error(
      'An interpolation coordinate was absorbed at machine precision. Rescale the coordinates.',
    );
  }
  return value;
}

function hornerSum(left: number, right: number, inputScale: number): number {
  const value = finite(left + right);
  const scale = Math.max(Math.abs(left), Math.abs(right));
  // A small polynomial value can be perfectly ordinary near a zero. Reject
  // cancellation only when its operands also amplify the supplied data enough
  // to consume roughly half of double precision's significant digits.
  if (
    scale > 0 &&
    Math.abs(value) / scale < 1e-12 &&
    scale / inputScale > 1e8
  ) {
    throw new Error(
      'Interpolation lost precision through cancellation. Rescale the coordinates or choose a target farther from this cancellation.',
    );
  }
  return value;
}

/** Log-scaled barycentric weights avoid overflow from large coordinate products. */
function lagrangeBasis(points: Point[]): (x: number) => number[] {
  const center =
    Math.min(...points.map(point => point.x)) / 2 +
    Math.max(...points.map(point => point.x)) / 2;
  const radius = Math.max(...points.map(point => Math.abs(point.x - center)));
  const normalized = points.map(point => (point.x - center) / radius);
  if (new Set(normalized).size !== points.length) {
    throw new Error(
      'The coordinate spacing is too uneven for finite precision. Rescale the x coordinates.',
    );
  }
  const logWeights = normalized.map((xi, i) => {
    let sign = 1;
    let logarithm = 0;
    normalized.forEach((xj, j) => {
      if (i !== j) {
        const difference = xi - xj;
        sign *= Math.sign(difference);
        logarithm -= Math.log(Math.abs(difference));
      }
    });
    return { sign, logarithm };
  });
  return (x: number): number[] => {
    const node = points.findIndex(point => point.x === x);
    if (node >= 0) {
      return points.map((_, index) => (index === node ? 1 : 0));
    }
    const difference = x - center;
    const z = Number.isFinite(difference)
      ? difference / radius
      : x / radius - center / radius;
    finite(z);
    const terms = logWeights.map((weight, i) => {
      const distance = z - normalized[i];
      if (distance === 0) {
        throw new Error(
          'This target cannot be distinguished from an interpolation node at machine precision. Rescale the coordinates.',
        );
      }
      return {
        sign: weight.sign * Math.sign(distance),
        logarithm: weight.logarithm - Math.log(Math.abs(distance)),
      };
    });
    const maxLog = Math.max(...terms.map(term => term.logarithm));
    const scaled = terms.map(
      term => term.sign * Math.exp(term.logarithm - maxLog),
    );
    // Compensated summation reduces cancellation in the barycentric denominator.
    let sum = 0;
    let correction = 0;
    scaled.forEach(term => {
      const adjusted = term - correction;
      const next = sum + adjusted;
      correction = next - sum - adjusted;
      sum = next;
    });
    const absoluteSum = scaled.reduce(
      (total, term) => total + Math.abs(term),
      0,
    );
    if (sum === 0 || Math.abs(sum) / absoluteSum < 1e-8) {
      throw new Error(
        'Interpolation is numerically unstable at this target. Choose a target closer to the nodes.',
      );
    }
    return scaled.map(term => finite(term / sum));
  };
}

export function calculateInterpolation(
  problem: InterpolationProblem,
): Calculation {
  const { points, targetX } = problem;
  const result: Calculation = {
    problem,
    status: 'failed',
    message: '',
    value: null,
    residual: null,
    steps: [],
    columns:
      problem.method === 'lagrange'
        ? ['i', 'xᵢ', 'yᵢ', 'Lᵢ(target)', 'yᵢLᵢ(target)', 'Partial sum']
        : ['i', 'xᵢ', 'yᵢ', 'Divided difference', 'Newton term', 'Partial sum'],
    curve: [],
    xDomain: domainFor([...points.map(point => point.x), targetX]),
    plotKind: 'polynomial',
    functionEvaluations: 0,
  };
  try {
    if (problem.method === 'newton-divided') {
      const inputScale = Math.max(...points.map(point => Math.abs(point.y)));
      const coefficients = points.map(point => point.y);
      for (let order = 1; order < points.length; order += 1) {
        for (let row = points.length - 1; row >= order; row -= 1) {
          const numerator = finite(coefficients[row] - coefficients[row - 1]);
          const denominator = coordinateDifference(
            points[row].x,
            points[row - order].x,
          );
          coefficients[row] = finite(numerator / denominator);
          if (coefficients[row] === 0 && numerator !== 0) {
            throw new Error(
              'A divided difference underflowed to zero. Rescale the coordinates.',
            );
          }
        }
      }
      const evaluate = (x: number, requireConditioning = false): number => {
        const node = points.find(point => point.x === x);
        if (node) {
          return node.y;
        }
        let value = coefficients[coefficients.length - 1];
        for (let index = coefficients.length - 2; index >= 0; index -= 1) {
          const term = multiply(
            value,
            coordinateDifference(x, points[index].x),
          );
          // The requested answer needs a precision check. A graph sample may
          // legitimately cancel exactly at a polynomial root.
          value = requireConditioning
            ? hornerSum(term, coefficients[index], inputScale)
            : finite(term + coefficients[index]);
        }
        return value;
      };
      const value = finite(evaluate(targetX, true));
      let product = 1;
      let sum = 0;
      points.forEach((point, index) => {
        if (index > 0) {
          product = multiply(
            product,
            coordinateDifference(targetX, points[index - 1].x),
          );
        }
        const term = multiply(coefficients[index], product);
        sum = finite(sum + term);
        result.steps.push({
          index: index + 1,
          formula:
            index === 0
              ? 'a₀ = y₀; P₀(x) = a₀'
              : `a${index} = f[x₀, …, x${index}]; add a${index} ∏(x − xⱼ), j < ${index}`,
          explanation:
            index === 0
              ? 'Start with the first y value. Each subsequent coefficient is a divided difference: the difference of adjacent lower-order values divided by the distance between their outer x coordinates.'
              : `Add the order-${index} Newton term. Its product vanishes at every earlier node, so the new term preserves those points.`,
          cells: [index, point.x, point.y, coefficients[index], term, sum],
          marker: { x: point.x, y: point.y },
          helper: [],
        });
      });
      const agreementScale = Math.max(
        inputScale,
        Math.abs(sum),
        Math.abs(value),
      );
      if (
        agreementScale > 0 &&
        Math.abs(sum - value) / agreementScale > 1e-10
      ) {
        throw new Error(
          'The interpolation table and polynomial disagree at finite precision. Rescale the coordinates or choose better-spaced points.',
        );
      }
      result.value = value;
      result.curve = sampleCurve(evaluate, result.xDomain);
    } else {
      const basis = lagrangeBasis(points);
      const contributions = (x: number): number[] =>
        basis(x).map((weight, index) => finite(weight * points[index].y));
      const evaluate = (x: number): number => {
        const node = points.find(point => point.x === x);
        if (node) {
          return node.y;
        }
        return finite(
          contributions(x).reduce((sum, value) => finite(sum + value), 0),
        );
      };
      const weights = basis(targetX);
      const terms = contributions(targetX);
      result.value = finite(evaluate(targetX));
      result.curve = sampleCurve(evaluate, result.xDomain);
      let sum = 0;
      points.forEach((point, index) => {
        sum = finite(sum + terms[index]);
        const contribution: CurvePoint[] = result.curve.map(sample => {
          try {
            return { x: sample.x, y: contributions(sample.x)[index] };
          } catch {
            return { x: sample.x, y: null };
          }
        });
        result.steps.push({
          index: index + 1,
          formula: `L${index}(x) = ∏(x − xⱼ)/(x${index} − xⱼ), j ≠ ${index}; P(x) = Σ yᵢLᵢ(x)`,
          explanation: `Basis ${index} is 1 at its own node and 0 at every other node. Multiply it by y = ${point.y} and add its weighted contribution to the polynomial.`,
          cells: [index, point.x, point.y, weights[index], terms[index], sum],
          marker: { x: point.x, y: point.y },
          helper: [],
          contribution,
        });
      });
    }
    result.status = 'calculated';
    result.message =
      'The unique polynomial through the supplied points was evaluated at the target. Extrapolation and tightly spaced nodes can amplify rounding error.';
  } catch (error) {
    result.status = 'failed';
    result.value = null;
    result.message =
      error instanceof Error
        ? error.message
        : 'Interpolation could not be calculated with these inputs.';
  }
  return result;
}
