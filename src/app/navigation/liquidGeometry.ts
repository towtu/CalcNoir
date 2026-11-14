export interface LiquidFrame {
  width: number;
  height: number;
  center: number;
  lift: number;
  path: string;
}
const number = (value: number) => String(Math.round(value * 1000) / 1000);
const numbers = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

/** One closed silhouette: the top edge dips into a real, transparent U-shaped opening. */
export function liquidFrame(
  width: number,
  height: number,
  center: number,
  spread = 0,
  lift = 0,
): LiquidFrame {
  const radius = 14;
  const top = 24;
  const half = Math.min(39 + spread, center - radius, width - radius - center);
  const bowl = Math.min(26 + spread * 0.25, half - 6);
  const shoulder = Math.min(10, half - bowl);
  const depth = 26 + spread * 0.25;
  const n = number;
  return {
    width,
    height,
    center,
    lift,
    path: `M ${radius} ${top} H ${n(center - half)} C ${n(
      center - half + shoulder,
    )} ${top} ${n(center - bowl - 4)} ${top} ${n(center - bowl)} ${
      top + 12
    } C ${n(center - bowl + 4)} ${n(top + depth)} ${n(center + bowl - 4)} ${n(
      top + depth,
    )} ${n(center + bowl)} ${top + 12} C ${n(center + bowl + 4)} ${top} ${n(
      center + half - shoulder,
    )} ${top} ${n(center + half)} ${top} H ${n(width - radius)} Q ${n(
      width,
    )} ${top} ${n(width)} ${top + radius} V ${n(height - radius)} Q ${n(
      width,
    )} ${n(height)} ${n(width - radius)} ${n(height)} H ${radius} Q 0 ${n(
      height,
    )} 0 ${n(height - radius)} V ${top + radius} Q 0 ${top} ${radius} ${top} Z`,
  };
}

/** Snapshot exactly the same numeric path interpolation used by Animated, including interruptions. */
export function betweenFrames(
  from: LiquidFrame,
  to: LiquidFrame,
  progress: number,
): LiquidFrame {
  const t = Math.max(0, Math.min(1, progress));
  const target = to.path.match(numbers)!.map(Number);
  let index = 0;
  return {
    ...to,
    center: from.center + (to.center - from.center) * t,
    lift: from.lift + (to.lift - from.lift) * t,
    path: from.path.replace(numbers, value =>
      number(Number(value) + (target[index++] - Number(value)) * t),
    ),
  };
}
export function motionFrame(
  from: LiquidFrame,
  middle: LiquidFrame,
  to: LiquidFrame,
  progress: number,
): LiquidFrame {
  return progress <= 0.45
    ? betweenFrames(from, middle, progress / 0.45)
    : betweenFrames(middle, to, (progress - 0.45) / 0.55);
}
