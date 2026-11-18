import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * The Numelix logotype.
 *
 * Drawn as outlines from the brand file rather than set in live Poppins. A logo
 * must never depend on a font that might not be there: Poppins is not bundled
 * on Android yet, so live text would render the wordmark in Roboto on device —
 * a wrong logo is worse than a slightly synthesised one. Outlines also keep it
 * identical on every platform and locked to the brand artwork.
 *
 * `weight` therefore synthesises rather than swaps a face. `semibold` is the
 * brand outline exactly as drawn; `bold` strokes each glyph in the same colour
 * as its fill, which grows every stem symmetrically. 2.6 units against the
 * 480.81 viewBox works out to roughly a 19% heavier stem — about one weight
 * step — while leaving the counters open.
 */
const RATIO = 94.39 / 480.81;

const STROKE: Record<'semibold' | 'bold', number> = {
  semibold: 0,
  bold: 2.6,
};

const GLYPHS = [
  'M69.19,93.3h-13.81L13.81,30.41v62.89H0V8.97h13.81l41.56,62.77V8.97h13.81v84.34Z',
  'M147.83,26.54v66.77h-13.81v-7.88c-2.18,2.75-5.03,4.91-8.54,6.48-3.51,1.58-7.25,2.36-11.21,2.36-5.25,0-9.96-1.09-14.12-3.27-4.16-2.18-7.43-5.41-9.82-9.69-2.38-4.28-3.57-9.45-3.57-15.51V26.54h13.69v37.2c0,5.98,1.49,10.56,4.48,13.75,2.99,3.19,7.07,4.79,12.24,4.79s9.27-1.59,12.3-4.79c3.03-3.19,4.54-7.77,4.54-13.75V26.54h13.81Z',
  'M260.94,28.72c4.16,2.18,7.43,5.41,9.81,9.69,2.38,4.28,3.58,9.45,3.58,15.51v39.38h-13.69v-37.32c0-5.98-1.5-10.56-4.48-13.75-2.99-3.19-7.07-4.79-12.24-4.79s-9.27,1.6-12.3,4.79c-3.03,3.19-4.54,7.78-4.54,13.75v37.32h-13.69v-37.32c0-5.98-1.5-10.56-4.48-13.75-2.99-3.19-7.07-4.79-12.24-4.79s-9.27,1.6-12.3,4.79c-3.03,3.19-4.54,7.78-4.54,13.75v37.32h-13.81V26.54h13.81v7.63c2.26-2.75,5.13-4.89,8.6-6.42,3.47-1.53,7.19-2.3,11.15-2.3,5.33,0,10.1,1.13,14.3,3.39,4.2,2.26,7.43,5.53,9.69,9.81,2.02-4.04,5.17-7.25,9.45-9.63,4.28-2.38,8.89-3.57,13.81-3.57,5.25,0,9.96,1.09,14.12,3.27Z',
  'M352.61,65.07h-51.01c.4,5.33,2.38,9.61,5.94,12.84,3.55,3.23,7.92,4.85,13.09,4.85,7.43,0,12.68-3.11,15.75-9.33h14.9c-2.02,6.14-5.68,11.17-10.97,15.09-5.29,3.92-11.86,5.88-19.69,5.88-6.38,0-12.1-1.43-17.15-4.3-5.05-2.87-9.01-6.91-11.88-12.12-2.87-5.21-4.3-11.25-4.3-18.12s1.39-12.9,4.18-18.12,6.7-9.23,11.75-12.06c5.05-2.83,10.84-4.24,17.39-4.24s11.92,1.37,16.84,4.12c4.93,2.75,8.76,6.6,11.51,11.57,2.75,4.97,4.12,10.68,4.12,17.15,0,2.5-.16,4.77-.48,6.79ZM338.67,53.92c-.08-5.09-1.9-9.17-5.45-12.24-3.56-3.07-7.96-4.6-13.21-4.6-4.77,0-8.85,1.51-12.24,4.54-3.39,3.03-5.41,7.13-6.06,12.3h36.96Z',
  'M380.48,3.64v89.67h-13.81V3.64h13.81Z',
  'M399.38,15.15c-1.7-1.7-2.54-3.8-2.54-6.3s.85-4.6,2.54-6.3c1.7-1.7,3.8-2.54,6.3-2.54s4.48.85,6.18,2.54c1.7,1.7,2.54,3.8,2.54,6.3s-.85,4.6-2.54,6.3c-1.7,1.7-3.76,2.54-6.18,2.54s-4.6-.85-6.3-2.54ZM412.47,26.54v66.77h-13.81V26.54h13.81Z',
  'M459.24,59.5l21.57,33.81h-15.63l-14.42-22.66-13.57,22.66h-14.42l21.57-32.84-21.57-33.93h15.63l14.42,22.66,13.57-22.66h14.42l-21.57,32.96Z',
];

export function Wordmark({
  width = 120,
  color,
  weight = 'bold',
}: {
  width?: number;
  color: string;
  weight?: 'semibold' | 'bold';
}) {
  const strokeWidth = STROKE[weight];

  return (
    <Svg
      width={width}
      height={width * RATIO}
      viewBox="0 0 480.81 94.39"
      accessible={false}
    >
      {GLYPHS.map(d => (
        <Path
          key={d.slice(0, 12)}
          d={d}
          fill={color}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
