import { derivative, parse } from 'mathjs';
import type { MathNode } from 'mathjs';

const FUNCTIONS: Readonly<Record<string, readonly number[]>> = {
  sin: [1],
  cos: [1],
  tan: [1],
  asin: [1],
  acos: [1],
  atan: [1],
  sinh: [1],
  cosh: [1],
  tanh: [1],
  asinh: [1],
  acosh: [1],
  atanh: [1],
  exp: [1],
  log: [1, 2],
  log10: [1],
  log2: [1],
  sqrt: [1],
  cbrt: [1],
  abs: [1],
};
const OPERATORS = new Set([
  'add',
  'subtract',
  'multiply',
  'divide',
  'pow',
  'unaryMinus',
  'unaryPlus',
]);
const SUPERSCRIPT: Readonly<Record<string, string>> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁻': '-',
  '⁺': '+',
};

function normalize(expression: string, allowEquality: boolean): string {
  if (!expression.trim() || expression.length > 300) {
    throw new Error('Enter an expression with 1–300 characters.');
  }
  let normalized = expression
    .trim()
    .replace(/[−–]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, ' pi ')
    .replace(/\bln\s*(?=\()/g, 'log')
    .replace(
      /[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g,
      value =>
        `^(${Array.from(value, character => SUPERSCRIPT[character]).join('')})`,
    );
  if (normalized.includes('=')) {
    const sides = normalized.split('=');
    if (
      !allowEquality ||
      sides.length !== 2 ||
      sides.some(side => !side.trim())
    ) {
      throw new Error(
        allowEquality
          ? 'Use one equality with an expression on each side.'
          : 'Enter g(x) as an expression, without an equality.',
      );
    }
    normalized = `(${sides[0]})-(${sides[1]})`;
  }
  return normalized;
}

function validateTree(root: MathNode): void {
  let count = 0;
  const visit = (node: MathNode): void => {
    count += 1;
    if (count > 100) {
      throw new Error(
        'Expression is too complex; use at most 100 syntax nodes.',
      );
    }
    switch (node.type) {
      case 'ConstantNode': {
        const { value } = node as MathNode & { value: unknown };
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new Error('Use finite numeric constants only.');
        }
        break;
      }
      case 'SymbolNode': {
        const { name } = node as MathNode & { name: string };
        if (!['x', 'e', 'pi'].includes(name)) {
          throw new Error(
            'The only variables and constants allowed are x, e, and pi.',
          );
        }
        break;
      }
      case 'ParenthesisNode':
        visit((node as MathNode & { content: MathNode }).content);
        break;
      case 'OperatorNode': {
        const operator = node as MathNode & { fn: string; args: MathNode[] };
        if (!OPERATORS.has(operator.fn)) {
          throw new Error('Use arithmetic operators +, −, ×, ÷, and ^ only.');
        }
        operator.args.forEach(visit);
        break;
      }
      case 'FunctionNode': {
        const call = node as MathNode & {
          fn: MathNode & { name?: string };
          args: MathNode[];
        };
        const name = call.fn.name;
        if (
          call.fn.type !== 'SymbolNode' ||
          !name ||
          !Object.prototype.hasOwnProperty.call(FUNCTIONS, name) ||
          !FUNCTIONS[name].includes(call.args.length)
        ) {
          throw new Error(
            'Use supported real math functions with the correct number of arguments.',
          );
        }
        count += 1; // Include the function symbol in the node budget.
        if (count > 100) {
          throw new Error(
            'Expression is too complex; use at most 100 syntax nodes.',
          );
        }
        call.args.forEach(visit);
        break;
      }
      default:
        throw new Error(
          'Only arithmetic expressions and supported math functions are allowed.',
        );
    }
  };
  visit(root);
}

export interface RealExpression {
  evaluate: (x: number) => number;
  derivative: () => (x: number) => number;
  normalizedResidual: (x: number) => number;
}

function realEvaluator(node: MathNode): (x: number) => number {
  const compiled = node.compile();
  return (x: number): number => {
    if (!Number.isFinite(x)) {
      throw new Error('The estimate left the finite real number range.');
    }
    let value: unknown;
    try {
      value = compiled.evaluate({ x, e: Math.E, pi: Math.PI });
    } catch {
      throw new Error(
        'The expression is undefined at this estimate. Choose a starting value in its real domain.',
      );
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(
        'The expression produced a nonfinite or nonreal value. Choose inputs in its real domain.',
      );
    }
    return value;
  };
}

interface ScaledValue {
  value: number;
  logScale: number;
}
type ScaledEvaluator = (x: number) => ScaledValue;
const MIN_NORMAL = 2 ** -1022;
const NUMERIC_FUNCTIONS: Readonly<
  Record<string, (...args: number[]) => number>
> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  asinh: Math.asinh,
  acosh: Math.acosh,
  atanh: Math.atanh,
  exp: Math.exp,
  log: (value, base) =>
    base === undefined ? Math.log(value) : Math.log(value) / Math.log(base),
  log10: Math.log10,
  log2: Math.log2,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
};

function supportedNumber(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(
      'The expression produced a nonfinite or nonreal value. Choose inputs in its real domain.',
    );
  }
  if (value !== 0 && Math.abs(value) < MIN_NORMAL) {
    throw new Error(
      'The expression entered the subnormal number range, where precision is insufficient. Rescale the equation.',
    );
  }
  return value;
}
function logSum(left: number, right: number): number {
  if (left === -Infinity) {
    return right;
  }
  if (right === -Infinity) {
    return left;
  }
  const largest = Math.max(left, right);
  return largest + Math.log1p(Math.exp(Math.min(left, right) - largest));
}

/** Carry an arithmetic magnitude alongside each value. Unlike an initial f(x),
 * this scale cannot become misleading merely because an iterate moves away from
 * an enormous pole or exponential. Logarithms keep the scale itself finite. */
function scaledEvaluator(node: MathNode): ScaledEvaluator {
  if (node.type === 'ParenthesisNode') {
    return scaledEvaluator((node as MathNode & { content: MathNode }).content);
  }
  if (node.type === 'ConstantNode') {
    const value = (node as MathNode & { value: number }).value;
    return () => ({
      value: supportedNumber(value),
      logScale: Math.log(Math.abs(value)),
    });
  }
  if (node.type === 'SymbolNode') {
    const name = (node as MathNode & { name: string }).name;
    return x => {
      const value = supportedNumber(
        name === 'x' ? x : name === 'pi' ? Math.PI : Math.E,
      );
      return {
        value,
        logScale:
          value === 0
            ? -Infinity
            : Math.log(
                name === 'x' ? Math.max(1, Math.abs(value)) : Math.abs(value),
              ),
      };
    };
  }
  if (node.type === 'FunctionNode') {
    const call = node as MathNode & {
      fn: MathNode & { name: string };
      args: MathNode[];
    };
    const name = call.fn.name;
    const args = call.args.map(scaledEvaluator);
    // Keep conventional exact identities such as cos(pi), while rejecting
    // cosine values rounded to ±1 near a nonzero, non-special argument.
    const constantPiArgument =
      name === 'cos' &&
      call.args[0].filter(
        child =>
          child.type === 'SymbolNode' &&
          (child as MathNode & { name: string }).name === 'pi',
      ).length > 0 &&
      call.args[0].filter(
        child =>
          child.type === 'SymbolNode' &&
          (child as MathNode & { name: string }).name === 'x',
      ).length === 0;
    return x => {
      const arguments_ = args.map(evaluate => evaluate(x));
      const values = arguments_.map(argument => argument.value);
      const value = supportedNumber(NUMERIC_FUNCTIONS[name](...values));
      if (name === 'exp' && value === 0) {
        throw new Error(
          'The exponential underflowed to zero. Rescale the equation or choose another estimate.',
        );
      }
      const saturated =
        ((name === 'exp' || name === 'cosh') &&
          value === 1 &&
          values[0] !== 0) ||
        (name === 'cos' &&
          Math.abs(value) === 1 &&
          values[0] !== 0 &&
          !(constantPiArgument && Number.isSafeInteger(values[0] / Math.PI))) ||
        (name === 'tanh' && Math.abs(value) === 1) ||
        (name === 'atan' && Math.abs(value) === Math.PI / 2);
      if (saturated) {
        throw new Error(
          'A function rounded to a limiting value at machine precision. Rescale or reformulate the equation.',
        );
      }
      let logScale = Math.log(Math.max(1, Math.abs(value)));
      if (name === 'exp' || name === 'cosh') {
        logScale = Math.log(Math.abs(value));
      } else if (
        ['sin', 'tan', 'sinh', 'tanh', 'asin', 'atan', 'asinh'].includes(name)
      ) {
        // Keep a tiny scaled argument's magnitude instead of assuming unit output.
        logScale = Math.max(
          Math.log(Math.abs(value)),
          Math.min(0, arguments_[0].logScale),
        );
      } else if (name === 'abs') {
        logScale = arguments_[0].logScale;
      } else if (name === 'sqrt' || name === 'cbrt') {
        logScale = arguments_[0].logScale / (name === 'sqrt' ? 2 : 3);
      }
      return { value, logScale: value === 0 ? -Infinity : logScale };
    };
  }
  const operation = node as MathNode & { fn: string; args: MathNode[] };
  const args = operation.args.map(scaledEvaluator);
  return x => {
    const left = args[0](x);
    if (operation.fn === 'unaryMinus' || operation.fn === 'unaryPlus') {
      return {
        value: operation.fn === 'unaryMinus' ? -left.value : left.value,
        logScale: left.logScale,
      };
    }
    const right = args[1](x);
    let value: number;
    let logScale: number;
    switch (operation.fn) {
      case 'add':
      case 'subtract':
        value =
          operation.fn === 'add'
            ? left.value + right.value
            : left.value - right.value;
        // Only current operand values can cancel at this operation. A recursive
        // magnitude can otherwise disguise a strictly positive sum as zero.
        // Preserve neutral +0/-0 identities, including normalized equations.
        logScale =
          left.value === 0
            ? right.logScale
            : right.value === 0
            ? left.logScale
            : logSum(
                Math.log(Math.abs(left.value)),
                Math.log(Math.abs(right.value)),
              );
        break;
      case 'multiply':
        value = left.value * right.value;
        logScale = left.logScale + right.logScale;
        if (value === 0 && left.value !== 0 && right.value !== 0) {
          throw new Error(
            'Multiplication underflowed to zero. Rescale the equation.',
          );
        }
        break;
      case 'divide':
        value = left.value / right.value;
        logScale = left.logScale - Math.log(Math.abs(right.value));
        if (value === 0 && left.value !== 0) {
          throw new Error(
            'Division underflowed to zero. Rescale the equation.',
          );
        }
        break;
      default:
        value = left.value ** right.value;
        if (value === 1 && Math.abs(left.value) !== 1 && right.value !== 0) {
          throw new Error(
            'Exponentiation rounded to one at machine precision. Rescale or reformulate the equation.',
          );
        }
        logScale =
          right.value >= 0
            ? right.value * left.logScale
            : Math.log(Math.abs(value));
        if (value === 0 && left.value !== 0) {
          throw new Error(
            'Exponentiation underflowed to zero. Rescale the equation.',
          );
        }
    }
    supportedNumber(value);
    const absorbed =
      operation.fn === 'add'
        ? (left.value !== 0 && value === right.value) ||
          (right.value !== 0 && value === left.value)
        : operation.fn === 'subtract' &&
          ((right.value !== 0 && value === left.value) ||
            (left.value !== 0 && value === -right.value));
    if (absorbed) {
      throw new Error(
        'The arithmetic absorbed a nonzero term at machine precision. Rescale or simplify the equation.',
      );
    }
    // Exactly cancelled terms no longer contribute to the remaining expression's
    // magnitude; otherwise (x-x)+1 would inherit an unrelated huge x scale.
    if (value === 0) {
      logScale = -Infinity;
    }
    // An unrepresentable scale must never make a nonzero residual look zero.
    if (!Number.isFinite(logScale) && logScale !== -Infinity) {
      logScale = Math.log(Math.abs(value));
    }
    return { value, logScale };
  };
}

export function compileExpression(
  expression: string,
  allowEquality = true,
): RealExpression {
  let node: MathNode;
  const source = normalize(expression, allowEquality);
  const tokens =
    source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g) ?? [];
  const literalUnderflow = tokens.some(
    token => Number(token) === 0 && /[1-9]/.test(token.split(/[eE]/)[0]),
  );
  try {
    node = parse(source);
  } catch (error) {
    if (error instanceof Error && !error.name.startsWith('Syntax')) {
      throw error;
    }
    throw new Error(
      'The expression could not be parsed. Check its operators and parentheses.',
    );
  }
  validateTree(node);
  const containsX =
    node.filter(
      child =>
        child.type === 'SymbolNode' &&
        (child as MathNode & { name: string }).name === 'x',
    ).length > 0;
  const evaluateTree = scaledEvaluator(node);
  const scaled: ScaledEvaluator = x => {
    if (literalUnderflow) {
      throw new Error(
        'A numeric literal underflowed to zero. Rescale the equation.',
      );
    }
    return evaluateTree(x);
  };
  return {
    evaluate: x => scaled(x).value,
    normalizedResidual: x => {
      const { value, logScale } = scaled(x);
      return value === 0
        ? 0
        : containsX
        ? Math.exp(Math.log(Math.abs(value)) - logScale)
        : 1;
    },
    derivative: () => {
      try {
        // Default simplification treats tiny coefficients (for example 1e-200)
        // as zero, which would change the derivative of a scaled equation.
        return realEvaluator(derivative(node, 'x', { simplify: false }));
      } catch {
        throw new Error(
          'A derivative is unavailable for this expression. Try Secant or Bisection.',
        );
      }
    },
  };
}
