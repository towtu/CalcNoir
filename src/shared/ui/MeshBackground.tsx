import React, { useId } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme';

/**
 * The soft lavender mesh every screen sits on.
 *
 * Four wide, low-opacity pools — violet and cyan drawn from the logomark's own
 * gradient — overlap to give the page depth without becoming a pattern you
 * have to read past. Opacity stays low enough that body text keeps its
 * contrast against the base background underneath.
 *
 * Ids are generated per instance: SVG ids are document-global, and several
 * screens are mounted at once during a tab or stack transition.
 */
export function MeshBackground() {
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const uid = useId().replace(/:/g, '');

  const violet = `violet${uid}`;
  const cyan = `cyan${uid}`;
  const deep = `deep${uid}`;

  // Dark surfaces swallow colour, so the pools carry a little more there.
  const strong = isDark ? 0.4 : 0.26;
  const soft = isDark ? 0.3 : 0.2;

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
      pointerEvents="none"
    >
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={violet} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#983FFF" stopOpacity={strong} />
            <Stop offset="1" stopColor="#983FFF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={cyan} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#45C4FC" stopOpacity={soft} />
            <Stop offset="1" stopColor="#45C4FC" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={deep} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#57129E" stopOpacity={soft} />
            <Stop offset="1" stopColor="#57129E" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Ellipse
          cx={width * 0.9}
          cy={height * 0.04}
          rx={width * 0.78}
          ry={height * 0.22}
          fill={`url(#${violet})`}
        />
        <Ellipse
          cx={width * 0.06}
          cy={height * 0.3}
          rx={width * 0.6}
          ry={height * 0.2}
          fill={`url(#${cyan})`}
        />
        <Ellipse
          cx={width * 0.95}
          cy={height * 0.62}
          rx={width * 0.62}
          ry={height * 0.22}
          fill={`url(#${deep})`}
        />
        <Ellipse
          cx={width * 0.2}
          cy={height * 0.95}
          rx={width * 0.8}
          ry={height * 0.2}
          fill={`url(#${violet})`}
        />
      </Svg>
    </View>
  );
}
