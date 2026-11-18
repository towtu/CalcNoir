import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { Logomark } from '../../shared/assets/Logomark';

/**
 * Ambient lighting behind the home hero.
 *
 * Two soft radial pools — violet above, cyan below — taken from the logomark's
 * own gradient, plus the real logomark held at low opacity so the hero text
 * reads over it. Nothing here is interactive; the whole layer is
 * `pointerEvents="none"` so it cannot intercept a tap meant for the buttons.
 *
 * The mark is the actual brand component, not a redraw: same geometry, same
 * violet-to-blue gradient, just scaled up and dimmed into the background.
 */
export function HeroBackdrop({
  width,
  height,
  isDark,
}: {
  width: number;
  height: number;
  isDark: boolean;
}) {
  if (width <= 0) return null;

  const markSize = Math.min(width * 0.62, 260);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="numelixVioletGlow" cx="50%" cy="50%" r="50%">
            <Stop
              offset="0"
              stopColor="#983FFF"
              stopOpacity={isDark ? 0.34 : 0.22}
            />
            <Stop offset="1" stopColor="#983FFF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="numelixCyanGlow" cx="50%" cy="50%" r="50%">
            <Stop
              offset="0"
              stopColor="#45C4FC"
              stopOpacity={isDark ? 0.26 : 0.18}
            />
            <Stop offset="1" stopColor="#45C4FC" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={width * 0.84}
          cy={height * 0.2}
          rx={width * 0.56}
          ry={height * 0.42}
          fill="url(#numelixVioletGlow)"
        />
        <Ellipse
          cx={width * 0.98}
          cy={height * 0.64}
          rx={width * 0.46}
          ry={height * 0.34}
          fill="url(#numelixCyanGlow)"
        />
      </Svg>
      <View
        style={[
          styles.mark,
          isDark ? styles.markDark : styles.markLight,
          { top: height * 0.06 },
        ]}
      >
        <Logomark size={markSize} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { position: 'absolute', right: -28 },
  markLight: { opacity: 0.17 },
  markDark: { opacity: 0.3 },
});
