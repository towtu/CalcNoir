import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { liquidFrame, motionFrame } from './liquidGeometry';
import type { LiquidFrame } from './liquidGeometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);
interface Motion {
  from: LiquidFrame;
  middle: LiquidFrame;
  to: LiquidFrame;
  progress: Animated.Value;
  key: string;
  animate: boolean;
}
interface Props {
  width: number;
  height: number;
  center: number;
  selectedKey: string;
  reducedMotion: boolean;
  barColor: string;
  circleColor: string;
  onArrival: (key: string) => void;
  children: React.ReactNode;
  renderTabs: (
    center: Animated.AnimatedInterpolation<number>,
  ) => React.ReactNode;
}
export function LiquidTabSurface({
  width,
  height,
  center,
  selectedKey,
  reducedMotion,
  barColor,
  circleColor,
  onArrival,
  children,
  renderTabs,
}: Props) {
  const makeRest = () => liquidFrame(width, height, center);
  const [motion, setMotion] = useState<Motion>(() => {
    const frame = makeRest();
    return {
      from: frame,
      middle: frame,
      to: frame,
      progress: new Animated.Value(1),
      key: selectedKey,
      animate: false,
    };
  });
  const running = useRef(motion);
  const progress = useRef(1);
  const requested = useRef(selectedKey);
  requested.current = selectedKey;
  useLayoutEffect(() => {
    const previous = running.current;
    const to = liquidFrame(width, height, center);
    const from = motionFrame(
      previous.from,
      previous.middle,
      previous.to,
      progress.current,
    );
    const resize = from.width !== width || from.height !== height;
    const animate =
      !reducedMotion && !resize && Math.abs(from.center - center) > 0.1;
    const middle = animate
      ? liquidFrame(width, height, (from.center + center) / 2, 7, -5)
      : to;
    const next = {
      from: animate ? from : to,
      middle,
      to,
      progress: new Animated.Value(animate ? 0 : 1),
      key: selectedKey,
      animate,
    };
    running.current = next;
    progress.current = animate ? 0 : 1;
    setMotion(next);
    if (!animate) onArrival(selectedKey);
  }, [width, height, center, selectedKey, reducedMotion, onArrival]);
  useEffect(() => {
    if (!motion.animate) return;
    let active = true;
    const listener = motion.progress.addListener(event => {
      if (running.current === motion) progress.current = event.value;
    });
    // SVG path coordinates are not supported by RN's native transform driver.
    // One short JS clock drives both geometry and circle; there is no React render per frame.
    const animation = Animated.timing(motion.progress, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (active && finished && requested.current === motion.key) {
        progress.current = 1;
        onArrival(motion.key);
      }
    });
    return () => {
      active = false;
      animation.stop();
      motion.progress.removeListener(listener);
    };
  }, [motion, onArrival]);
  const range = [0, 0.45, 1];
  const location = motion.progress.interpolate({
    inputRange: range,
    outputRange: [motion.from.center, motion.middle.center, motion.to.center],
  });
  return (
    <>
      <Svg
        pointerEvents="none"
        accessible={false}
        style={StyleSheet.absoluteFill}
        width={width}
        height={height}
      >
        <AnimatedPath
          testID="liquid-tab-outline"
          fill={barColor}
          d={motion.progress.interpolate({
            inputRange: range,
            outputRange: [motion.from.path, motion.middle.path, motion.to.path],
          })}
        />
      </Svg>
      {renderTabs(location)}
      <Animated.View
        testID="floating-navigation"
        pointerEvents="none"
        accessible={false}
        style={[
          styles.floating,
          {
            transform: [
              {
                translateX: motion.progress.interpolate({
                  inputRange: range,
                  outputRange: [
                    motion.from.center - 20,
                    motion.middle.center - 20,
                    motion.to.center - 20,
                  ],
                }),
              },
              {
                translateY: motion.progress.interpolate({
                  inputRange: range,
                  outputRange: [
                    motion.from.lift,
                    motion.middle.lift,
                    motion.to.lift,
                  ],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.circle, { backgroundColor: circleColor }]}>
          {children}
        </View>
      </Animated.View>
    </>
  );
}
const styles = StyleSheet.create({
  floating: { position: 'absolute', top: 0, left: 0, width: 40, height: 40 },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
});
