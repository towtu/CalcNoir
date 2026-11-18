import type { MethodId } from '../../core/numerics/types';

/**
 * The teaching content behind the Learn tab: one lesson per method, each with
 * its own practice questions.
 *
 * This is content, not computation, so it lives beside the Learn feature
 * rather than in `core`, which stays free of anything a screen reads. Every
 * answer below is exact, because the checker compares to within 1e-6 unless a
 * question sets its own tolerance.
 */
export interface LessonSection {
  heading: string;
  body: string;
}

export interface QuizQuestion {
  prompt: string;
  question: string;
  answer: number;
  hint: string;
  explanation: string;
  /** Defaults to 1e-6; loosen it only for answers that do not terminate. */
  tolerance?: number;
}

export interface Lesson {
  method: MethodId;
  summary: string;
  sections: LessonSection[];
  quiz: QuizQuestion[];
}

export const LESSONS: Record<MethodId, Lesson> = {
  bisection: {
    summary:
      'Trap a root between two points, then halve the trap until it is small enough.',
    method: 'bisection',
    sections: [
      {
        heading: 'The idea',
        body: 'If f is continuous and f(a) and f(b) have opposite signs, the curve must cross zero somewhere between them. That is the whole premise: you never need to know where the root is, only that it is boxed in.',
      },
      {
        heading: 'How a step works',
        body: 'Take the midpoint c = (a + b) / 2 and evaluate f(c). Whichever half still shows a sign change becomes the new bracket. One evaluation per step, and the interval halves every time.',
      },
      {
        heading: 'Why you would choose it',
        body: 'It cannot fail once a valid bracket exists, and the error is known in advance: after n steps the root is within (b − a) / 2ⁿ. No other method here gives you that guarantee before you start.',
      },
      {
        heading: 'Where it struggles',
        body: 'It is slow — convergence is linear, worth about one extra binary digit per step. It also needs a genuine sign change, so a root the curve touches without crossing, such as a repeated root, is invisible to it.',
      },
    ],
    quiz: [
      {
        prompt: 'The first midpoint',
        question: 'For f(x) = x³ − x − 2 on [1, 2], what is c = (a + b) / 2?',
        answer: 1.5,
        hint: 'Add the two endpoints and divide by two.',
        explanation: '(1 + 2) / 2 = 1.5. Next you evaluate f(1.5) to pick a half.',
      },
      {
        prompt: 'Narrowing the bracket',
        question:
          'f(1.5) is negative and f(2) is positive, so the root sits in [1.5, 2]. What is the next midpoint?',
        answer: 1.75,
        hint: 'Apply the same midpoint rule to the new interval.',
        explanation: '(1.5 + 2) / 2 = 1.75. The bracket halves again each step.',
      },
      {
        prompt: 'The error bound',
        question: 'Starting from [1, 2], how wide is the bracket after 3 halvings?',
        answer: 0.125,
        hint: 'The width is (b − a) divided by 2 raised to the number of steps.',
        explanation: '1 / 2³ = 0.125. This bound is known before you compute anything.',
      },
    ],
  },

  newton: {
    summary:
      'Follow the tangent at your estimate down to the axis, and land closer to the root.',
    method: 'newton',
    sections: [
      {
        heading: 'The idea',
        body: 'Near a root a smooth curve looks almost straight. Replace f with its tangent at your current estimate, solve that straight line for zero, and use the crossing as your next estimate.',
      },
      {
        heading: 'How a step works',
        body: 'xₙ₊₁ = xₙ − f(xₙ) / f′(xₙ). Each step costs one evaluation of f and one of its derivative, and the tangent does the work of deciding both direction and distance.',
      },
      {
        heading: 'Why you would choose it',
        body: 'Near a simple root it converges quadratically: the number of correct digits roughly doubles every step. Three correct digits become six, then twelve. Nothing else here is that fast.',
      },
      {
        heading: 'Where it struggles',
        body: 'It needs a derivative. A flat tangent, f′(xₙ) = 0, has no crossing and the step is undefined. A poor starting guess can throw it far from the root, and at a repeated root the speed drops to linear.',
      },
    ],
    quiz: [
      {
        prompt: 'One Newton step',
        question:
          'For f(x) = x² − 2 with x₀ = 2, f(2) = 2 and f′(2) = 4. What is x₁?',
        answer: 1.5,
        hint: 'x₁ = x₀ − f(x₀) / f′(x₀).',
        explanation: '2 − 2/4 = 1.5, already much closer to √2 ≈ 1.41421.',
      },
      {
        prompt: 'The step that breaks',
        question:
          'What value must f′(xₙ) never take, or the Newton step is undefined?',
        answer: 0,
        hint: 'Think about what the formula divides by.',
        explanation:
          'A zero derivative is a flat tangent. It never meets the axis, so there is no next estimate.',
      },
      {
        prompt: 'Doubling digits',
        question:
          'Near a simple root Newton roughly doubles the correct digits each step. From 3 correct digits, how many after one step?',
        answer: 6,
        hint: 'Quadratic convergence means the digit count doubles.',
        explanation:
          '3 doubles to about 6. That is what quadratic convergence buys you.',
      },
    ],
  },

  secant: {
    summary:
      'Newton without the derivative: draw a line through your last two estimates instead.',
    method: 'secant',
    sections: [
      {
        heading: 'The idea',
        body: 'Newton needs the tangent. If you cannot differentiate f, or it is expensive, the line through your last two points approximates that tangent well enough.',
      },
      {
        heading: 'How a step works',
        body: 'xₙ₊₁ = xₙ − f(xₙ)(xₙ − xₙ₋₁) / (f(xₙ) − f(xₙ₋₁)). The window slides forward: the newest two estimates define the next line.',
      },
      {
        heading: 'Why you would choose it',
        body: 'No derivative, and only one new evaluation per step. Convergence order is about 1.618, slower than Newton per step but often cheaper overall for the same accuracy.',
      },
      {
        heading: 'Where it struggles',
        body: 'When f(xₙ) and f(xₙ₋₁) are nearly equal the denominator collapses and the step blows up. And because it keeps no bracket, nothing stops it from wandering away from the root.',
      },
    ],
    quiz: [
      {
        prompt: 'What it needs to start',
        question: 'How many starting estimates does the Secant method require?',
        answer: 2,
        hint: 'A line needs more than one point.',
        explanation:
          'Two. The first secant line is drawn through x₀ and x₁; after that each new estimate replaces the oldest.',
      },
      {
        prompt: 'One secant step',
        question:
          'With x₀ = 1, x₁ = 3, f(x₀) = −1 and f(x₁) = 7, what is x₂?',
        answer: 1.25,
        hint: 'x₂ = x₁ − f(x₁)(x₁ − x₀) / (f(x₁) − f(x₀)).',
        explanation: '3 − 7 × 2 / 8 = 3 − 1.75 = 1.25.',
      },
      {
        prompt: 'The step that breaks',
        question:
          'The denominator f(xₙ) − f(xₙ₋₁) must not equal what value?',
        answer: 0,
        hint: 'Two equal function values give a horizontal line.',
        explanation:
          'A zero denominator means the secant is horizontal and never crosses the axis.',
      },
    ],
  },

  'fixed-point': {
    summary:
      'Rewrite the equation as x = g(x), then feed each answer back in until it settles.',
    method: 'fixed-point',
    sections: [
      {
        heading: 'The idea',
        body: 'Any equation can be rearranged into the form x = g(x). A value that satisfies it is a fixed point: putting it through g returns it unchanged. Iterating g from a starting guess may walk you toward one.',
      },
      {
        heading: 'How a step works',
        body: 'xₙ₊₁ = g(xₙ). That is the entire step. The art is in the rearrangement, because the same equation has many valid forms of g and they do not all behave the same.',
      },
      {
        heading: 'Why you would choose it',
        body: 'It is the simplest iteration there is, needs no derivative, and makes the idea of convergence visible — you can watch the values settle, oscillate, or escape.',
      },
      {
        heading: 'Where it struggles',
        body: 'Convergence depends on the slope near the fixed point: it converges when |g′(x)| < 1 and diverges when |g′(x)| > 1. A poor rearrangement of a perfectly good equation will simply fly apart.',
      },
    ],
    quiz: [
      {
        prompt: 'One substitution',
        question: 'With g(x) = cos(x) and x₀ = 0 radians, what is x₁ = g(x₀)?',
        answer: 1,
        hint: 'The cosine of zero.',
        explanation:
          'x₁ = cos(0) = 1. That result becomes the next input; it is not the fixed point yet.',
      },
      {
        prompt: 'The convergence test',
        question:
          'Iteration converges near a fixed point when |g′(x)| is less than what value?',
        answer: 1,
        hint: 'A slope that shrinks the gap each pass is smaller than this.',
        explanation:
          'Below 1, each step shrinks the distance to the fixed point. Above 1, it grows.',
      },
      {
        prompt: 'A second step',
        question: 'With g(x) = (x + 4) / 2 and x₀ = 2, what is x₁?',
        answer: 3,
        hint: 'Substitute 2 and evaluate.',
        explanation: '(2 + 4) / 2 = 3. Repeating this approaches the fixed point at 4.',
      },
    ],
  },

  'newton-divided': {
    summary:
      'Build the interpolating polynomial from a triangle of differences, one point at a time.',
    method: 'newton-divided',
    sections: [
      {
        heading: 'The idea',
        body: 'Instead of writing the polynomial out at once, build it in pieces. Each new point adds one more term, and the coefficient of that term is a divided difference of the data you already have.',
      },
      {
        heading: 'How the table works',
        body: 'The first column is your y values. Each later column divides the difference of neighbouring entries by the span of x values they cover: f[x₀,x₁] = (y₁ − y₀) / (x₁ − x₀), and so on up the triangle.',
      },
      {
        heading: 'Why you would choose it',
        body: 'The leading entry of each column is the next coefficient, so P(x) = f[x₀] + f[x₀,x₁](x − x₀) + … Adding another point extends the table without redoing any of it.',
      },
      {
        heading: 'Where it struggles',
        body: 'It is the same polynomial Lagrange produces, so it inherits the same risk: with many equally spaced points, a high degree curve can oscillate wildly between them.',
      },
    ],
    quiz: [
      {
        prompt: 'A first divided difference',
        question:
          'For the points (0, 1) and (2, 5), what is f[x₀,x₁] = (y₁ − y₀) / (x₁ − x₀)?',
        answer: 2,
        hint: 'Difference in y over difference in x.',
        explanation: '(5 − 1) / (2 − 0) = 2. It is the slope between the two points.',
      },
      {
        prompt: 'Size of the table',
        question: 'With 4 points, how many first divided differences are there?',
        answer: 3,
        hint: 'Each one uses a neighbouring pair.',
        explanation:
          'Four points give three neighbouring pairs, so the column has three entries and the triangle narrows from there.',
      },
      {
        prompt: 'Reading the result',
        question:
          'The points (0, 1), (1, 3) and (2, 5) lie on a straight line. What is P(1.5)?',
        answer: 4,
        hint: 'The values rise by 2 for every step of 1 in x.',
        explanation:
          'The polynomial reduces to P(x) = 2x + 1, so P(1.5) = 4. Higher differences vanish.',
      },
    ],
  },

  lagrange: {
    summary:
      'Write the polynomial directly as a weighted blend of the y values you were given.',
    method: 'lagrange',
    sections: [
      {
        heading: 'The idea',
        body: 'Build one basis polynomial per point, each designed to be worth exactly 1 at its own node and 0 at every other. Multiply each by its y value and add them up.',
      },
      {
        heading: 'How a basis works',
        body: 'Lᵢ(x) multiplies together (x − xⱼ) / (xᵢ − xⱼ) for every other node j. Every factor vanishes at its own xⱼ, which is what forces the zeros, and the denominators normalise it to 1 at xᵢ.',
      },
      {
        heading: 'Why you would choose it',
        body: 'The formula is explicit — no table, no recursion. It also makes each point’s influence visible, which is why the graph here can show one basis contribution at a time.',
      },
      {
        heading: 'Where it struggles',
        body: 'Adding one point means rebuilding every basis polynomial from scratch. And with many equally spaced nodes the curve can swing hard near the ends, the Runge phenomenon.',
      },
    ],
    quiz: [
      {
        prompt: 'Degree of the result',
        question:
          'What is the highest possible degree of the polynomial through 5 points?',
        answer: 4,
        hint: 'One less than the number of points.',
        explanation:
          'n + 1 points determine a polynomial of degree at most n, so 5 points give degree 4.',
      },
      {
        prompt: 'At its own node',
        question: 'What value does the basis polynomial Lᵢ(x) take at x = xᵢ?',
        answer: 1,
        hint: 'Every factor becomes its own denominator.',
        explanation:
          'It equals 1, which is what lets its y value pass through untouched.',
      },
      {
        prompt: 'At the others',
        question: 'And what value does Lᵢ(x) take at any other node xⱼ?',
        answer: 0,
        hint: 'One factor in the product becomes zero.',
        explanation:
          'It equals 0, so no other point contributes there. That is the whole trick.',
      },
    ],
  },
};

export function lessonFor(method: MethodId): Lesson {
  return LESSONS[method];
}

/** Every question, in method order, for the unfiltered practice session. */
export function allQuestions(): Array<QuizQuestion & { method: MethodId }> {
  return (Object.keys(LESSONS) as MethodId[]).flatMap(method =>
    LESSONS[method].quiz.map(question => ({ ...question, method })),
  );
}
