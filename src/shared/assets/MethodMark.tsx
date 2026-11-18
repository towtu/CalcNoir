import React from 'react';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import type { MethodId } from '../../core/numerics/types';

/**
 * The six method marks.
 *
 * These replace the generated monochrome PNGs from the CalcNoir identity. They
 * are monoline SVG at a shared 48 viewBox with one stroke weight and one dot
 * radius, so the six read as a family and take the theme's colour in both
 * appearances — the PNGs could not, because their black background was opaque
 * rather than transparent and so could not be tinted.
 *
 * Each mark is a visual identifier, not a plot; the method name carries the
 * meaning. Geometry follows the descriptions the original artwork was drawn
 * from, with tangent and secant contact points solved against the curve so the
 * lines actually touch where they should.
 */
const STROKE = 1.9;
const DOT = 2.4;

function Mark({ children }: { children: React.ReactNode }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 48 48" accessible={false}>
      {children}
    </Svg>
  );
}

export function MethodMark({
  method,
  color,
}: {
  method: MethodId;
  color: string;
}) {
  const line = {
    stroke: color,
    strokeWidth: STROKE,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  switch (method) {
    // An interval with end stops, halved at its midpoint.
    case 'bisection':
      return (
        <Mark>
          <Path d="M12,24 H36" {...line} />
          <Path d="M12,18.5 V29.5" {...line} />
          <Path d="M36,18.5 V29.5" {...line} />
          <Path d="M24,16.5 V31.5" {...line} />
          <Circle cx={24} cy={24} r={DOT} fill={color} />
        </Mark>
      );

    // One curve, one tangent, touching at a single point.
    case 'newton':
      return (
        <Mark>
          <Path d="M12,34 Q26,34 36,12" {...line} />
          <Path d="M16,37 L34,20.5" {...line} />
          <Circle cx={25} cy={28.5} r={DOT} fill={color} />
        </Mark>
      );

    // One curve, one secant, crossing at two points.
    case 'secant':
      return (
        <Mark>
          <Path d="M12,34 Q26,34 36,12" {...line} />
          <Path d="M15.5,36 L35,17" {...line} />
          <Circle cx={18.8} cy={32.6} r={DOT} fill={color} />
          <Circle cx={31.8} cy={19.9} r={DOT} fill={color} />
        </Mark>
      );

    // A full turn back to the same value.
    case 'fixed-point':
      return (
        <Mark>
          <Path d="M24,13 A11,11 0 1 1 15.3,17.9" {...line} />
          <Polygon points="28.6,13 23.3,10.3 23.3,15.7" fill={color} />
          <Circle cx={24} cy={24} r={DOT} fill={color} />
        </Mark>
      );

    // A difference table: three values, then two, then one.
    case 'newton-divided':
      return (
        <Mark>
          <Path d="M13,15 L18.5,24 M24,15 L18.5,24" {...line} />
          <Path d="M24,15 L29.5,24 M35,15 L29.5,24" {...line} />
          <Path d="M18.5,24 L24,33 M29.5,24 L24,33" {...line} />
          <Circle cx={13} cy={15} r={DOT} fill={color} />
          <Circle cx={24} cy={15} r={DOT} fill={color} />
          <Circle cx={35} cy={15} r={DOT} fill={color} />
          <Circle cx={18.5} cy={24} r={DOT} fill={color} />
          <Circle cx={29.5} cy={24} r={DOT} fill={color} />
          <Circle cx={24} cy={33} r={DOT} fill={color} />
        </Mark>
      );

    // One polynomial through every given point.
    case 'lagrange':
      return (
        <Mark>
          <Path d="M11,32 C16,32 18,24 24,24 S32,16 37,16" {...line} />
          <Circle cx={11} cy={32} r={DOT} fill={color} />
          <Circle cx={17.1} cy={28} r={DOT} fill={color} />
          <Circle cx={30.9} cy={20} r={DOT} fill={color} />
          <Circle cx={37} cy={16} r={DOT} fill={color} />
        </Mark>
      );
  }
}
