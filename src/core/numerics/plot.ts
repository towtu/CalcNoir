import type { CurvePoint } from './types';

export function domainFor(values: number[]): [number, number] {
  const finite = values.filter(Number.isFinite);
  const low = finite.length ? Math.min(...finite) : -1;
  const high = finite.length ? Math.max(...finite) : 1;
  const margin = Math.max(
    2,
    high / 5 - low / 5,
    low === high ? Math.abs(low) / 4 : 0,
  );
  const start = Number.isFinite(low - margin) ? low - margin : low;
  const end = Number.isFinite(high + margin) ? high + margin : high;
  return start < end ? [start, end] : [-2, 2];
}

/** Convex sampling avoids overflow from computing high - low for wide domains. */
export function sampleCurve(
  evaluate: (x: number) => number,
  domain: [number, number],
): CurvePoint[] {
  return Array.from({ length: 161 }, (_, index) => {
    const fraction = index / 160;
    const x = domain[0] * (1 - fraction) + domain[1] * fraction;
    let y: number | null = null;
    try {
      const evaluated = evaluate(x);
      if (Number.isFinite(evaluated)) {
        y = evaluated;
      }
    } catch {
      // Undefined or complex samples form a visible gap in the curve.
    }
    return { x, y };
  });
}
