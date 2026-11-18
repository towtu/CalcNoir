import React, { useEffect, useId, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Logomark } from '../../shared/assets/Logomark';
import { Wordmark } from '../../shared/assets/Wordmark';
import { MeshBackground } from '../../shared/ui/MeshBackground';
import { space, typeScale, useTheme } from '../../shared/theme';
import { useMotionPreference } from '../../shared/ui/useReducedMotion';

/**
 * How long each beat of the opening runs. The logomark lands first and alone,
 * because it is the one part of the brand that is pure shape; the wordmark then
 * rises under it while the gradient rule draws across, and the line of copy
 * arrives last. `hold` is the pause that lets the finished lockup be read
 * before it lifts away.
 */
const BEAT = {
  mark: 460,
  word: 380,
  rule: 600,
  tag: 280,
  hold: 260,
  exit: 320,
} as const;

/**
 * The whole sequence, start to finish. The app mounts behind the overlay from
 * the first frame, so this is a curtain rather than a loading screen — nothing
 * waits on it, and tapping it drops the curtain early.
 */
export const INTRO_DURATION =
  BEAT.mark + Math.max(BEAT.word, BEAT.rule) + BEAT.tag + BEAT.hold + BEAT.exit;

const RULE_WIDTH = 164;

/**
 * The opening animation.
 *
 * It is painted over the live app rather than in front of it: `RootNavigator`
 * mounts the navigator underneath at the same time, so by the time the curtain
 * lifts the first screen is already laid out and interactive. There is no
 * second cost to showing it.
 *
 * Every animation here runs on the native driver — opacity and transform only.
 * That keeps the sequence off the JS thread while the navigator is doing its
 * first layout, which is exactly when the JS thread is busiest.
 */
export function IntroAnimation({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const reducedMotion = useMotionPreference();
  // SVG ids are document-global; the mesh behind this overlay follows the same
  // rule, so the gradient gets its own suffix rather than a shared name.
  const uid = useId().replace(/:/g, '');

  const mark = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const rule = useRef(new Animated.Value(0)).current;
  const tag = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Still unknown: hold the background for a frame rather than guessing.
    if (reducedMotion === null) return;
    // Reduce motion means no opening at all. A static splash would only delay
    // the app, and the brand is on the first screen anyway.
    if (reducedMotion) {
      onDone();
      return;
    }
    const timing = (
      value: Animated.Value,
      duration: number,
      easing: (value: number) => number,
    ) =>
      Animated.timing(value, {
        toValue: 1,
        duration,
        easing,
        useNativeDriver: true,
      });
    const animation = Animated.sequence([
      timing(mark, BEAT.mark, Easing.out(Easing.back(1.3))),
      Animated.parallel([
        timing(word, BEAT.word, Easing.out(Easing.cubic)),
        timing(rule, BEAT.rule, Easing.inOut(Easing.cubic)),
      ]),
      timing(tag, BEAT.tag, Easing.out(Easing.quad)),
      Animated.delay(BEAT.hold),
      timing(exit, BEAT.exit, Easing.in(Easing.cubic)),
    ]);
    animation.start();
    /**
     * Completion is a timer, not the animation's callback: native-driver
     * animations report back through the native module, and the app must reach
     * the first screen even if that round trip is dropped or the sequence is
     * interrupted. The timer is the single source of truth for "the curtain is
     * up", and `INTRO_DURATION` is summed from the same beats above.
     */
    const timer = setTimeout(onDone, INTRO_DURATION);
    return () => {
      animation.stop();
      clearTimeout(timer);
    };
  }, [reducedMotion, onDone, mark, word, rule, tag, exit]);

  if (reducedMotion) return null;

  return (
    <View
      accessibilityViewIsModal
      style={[styles.fill, { backgroundColor: colors.background }]}
    >
      <MeshBackground />
      {reducedMotion === null ? null : (
        <Animated.View
          style={[
            styles.fill,
            styles.center,
            {
              opacity: exit.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
              transform: [
                {
                  scale: exit.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.08],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={{
              opacity: mark.interpolate({
                inputRange: [0, 0.6, 1],
                outputRange: [0, 1, 1],
              }),
              transform: [
                {
                  scale: mark.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.62, 1],
                  }),
                },
              ],
            }}
          >
            <Logomark size={112} />
          </Animated.View>

          <Animated.View
            accessibilityRole="header"
            accessibilityLabel="Numelix"
            style={[
              styles.word,
              {
                opacity: word,
                transform: [
                  {
                    translateY: word.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Wordmark width={208} color={colors.text} />
          </Animated.View>

          {/* The brand gradient, drawn left to right under the logotype. */}
          <Animated.View
            accessible={false}
            style={{
              opacity: rule.interpolate({
                inputRange: [0, 0.4, 1],
                outputRange: [0, 1, 1],
              }),
              transform: [{ scaleX: rule }],
            }}
          >
            <Svg width={RULE_WIDTH} height={3} accessible={false}>
              <Defs>
                <LinearGradient id={`introRule${uid}`} x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#983FFF" />
                  <Stop offset="0.55" stopColor="#716CFF" />
                  <Stop offset="1" stopColor="#45C4FC" />
                </LinearGradient>
              </Defs>
              <Rect
                x="0"
                y="0"
                width={RULE_WIDTH}
                height="3"
                rx="1.5"
                fill={`url(#introRule${uid})`}
              />
            </Svg>
          </Animated.View>

          <Animated.View
            style={{
              opacity: tag,
              transform: [
                {
                  translateY: tag.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, 0],
                  }),
                },
              ],
            }}
          >
            <Text style={[styles.tagline, { color: colors.muted }]}>
              Numerical analysis. Made simple.
            </Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Anyone who has seen it once can get past it immediately. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip intro"
        onPress={onDone}
        style={styles.fill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.lg },
  word: { marginTop: space.xs },
  tagline: typeScale.label,
});
