import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * The brand sweep as a fill behind a control.
 *
 * Two things here are load-bearing.
 *
 * `width`/`height` must be **props**, not style. `StyleSheet.absoluteFill`
 * positions the element but gives react-native-svg no size, so the `<svg>`
 * falls back to its intrinsic 300x150 default — which left a 56 dp tall,
 * 335 dp wide button filled for only its first 300 dp and looking cut off.
 *
 * `pointerEvents="none"` is equally required: without it this layer sits over
 * the whole Pressable and swallows every tap.
 */
/**
 * The violet sweep behind the two primary calls to action.
 *
 * The same hue family the tab bar carries, and violet alone — no blue in it.
 * Violet is the colour of the things you press in this app; blue is reserved
 * for the accents that point and report, so a call to action never borrows it.
 *
 * White type is safe here: 4.7:1 at the light end of the sweep and better as
 * it darkens.
 */
export const CTA_SWEEP = {
  from: '#983FFF',
  to: '#4F2BC9',
  ink: '#FFFFFF',
} as const;

export function GradientSurface({
  id,
  from = '#983FFF',
  to = '#45C4FC',
  horizontal = true,
}: {
  /** Gradient ids share one document namespace, so each usage needs its own. */
  id: string;
  from?: string;
  to?: string;
  horizontal?: boolean;
}) {
  return (
    <Svg
      pointerEvents="none"
      accessible={false}
      width="100%"
      height="100%"
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <LinearGradient
          id={id}
          x1="0"
          y1="0"
          x2={horizontal ? '1' : '0'}
          y2={horizontal ? '0' : '1'}
        >
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
