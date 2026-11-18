import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

/**
 * A single headline word filled with the brand's violet-to-cyan sweep.
 *
 * This is the one place the whole logomark gradient appears in the product,
 * which is what makes a headline feel like the brand speaking rather than a
 * tinted word. It is display type at 34 px, so the light end clears the 3:1
 * that large text needs even where the cyan is at its brightest.
 *
 * SVG text is the only way to fill glyphs with a gradient in React Native
 * without adding a masking library, so the word is drawn rather than set. It is
 * hidden from assistive tech — the headline that contains it carries one label
 * for the whole phrase.
 */
export function GradientWord({
  word,
  size,
  id,
  width,
}: {
  word: string;
  size: number;
  /** Gradient ids share one SVG namespace, so each usage needs its own. */
  id: string;
  width?: number;
}) {
  const glyphWidth =
    width ?? Math.max(size * 4, Math.ceil(size * (word.length + 1) * 0.7));
  return (
    <Svg width={glyphWidth} height={size * 1.3} accessible={false}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#983FFF" />
          <Stop offset="0.6" stopColor="#7C5BFF" />
          <Stop offset="1" stopColor="#45C4FC" />
        </LinearGradient>
      </Defs>
      <SvgText
        x={0}
        y={size}
        fontSize={size}
        fontFamily="Poppins"
        fontWeight="500"
        fill={`url(#${id})`}
      >
        {word}
      </SvgText>
    </Svg>
  );
}
