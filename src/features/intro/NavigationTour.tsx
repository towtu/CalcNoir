import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TAB_BAR_EDGE,
  TAB_BAR_HEIGHT,
  TAB_BAR_LIFT,
  tabCenter,
} from '../../app/navigation/tabGeometry';
import type { RootTabs } from '../../app/navigation/types';
import { minTouch, radius, space, typeScale, useTheme } from '../../shared/theme';
import { Button, Notice } from '../../shared/ui';
import { useReducedMotion } from '../../shared/ui/useReducedMotion';

/**
 * The navigation tour: five short stops that name each destination on the real
 * screen rather than describing it on a slide.
 *
 * It is an overlay, not a screen. The app is live underneath — the tour moves
 * the actual tab as it advances, so the raised bar animates its dip across and
 * the screen behind the card is the screen being described. That is the whole
 * point of teaching navigation this way: nothing here is a mock-up of the app.
 */
const STEPS: Array<{
  tab?: keyof RootTabs;
  title: string;
  lead: string;
}> = [
  {
    tab: 'Home',
    title: 'Home',
    lead: 'Where you land. What you last worked on, and how far you have got.',
  },
  {
    tab: 'Solve',
    title: 'Solve',
    lead: 'Pick one of the six methods, change the values, calculate.',
  },
  {
    tab: 'Learn',
    title: 'Learn',
    lead: 'A short lesson and practice for every method.',
  },
  {
    tab: 'Notebook',
    title: 'Notebook',
    lead: 'Problems you saved, kept on this device.',
  },
  {
    title: 'Settings',
    lead: 'Appearance, rounding notes — and this tour again whenever you want.',
  },
];

/** The circle `AppHeader` draws inside its `minTouch` settings button. */
const HEADER_CIRCLE = 40;
/** How far the ring stands off whatever it is pointing at. */
const RING_PAD = 6;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function NavigationTour({
  onFocusTab,
  onDone,
  warning,
}: {
  onFocusTab: (tab: keyof RootTabs) => void;
  onDone: () => void;
  warning?: string | null;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];

  /**
   * The hole in the scrim. For the four tab stops it is the whole bar — the
   * bar is one object and dimming three quarters of it to spotlight a quarter
   * reads as damage. The pointer below picks out the tab instead.
   */
  const bottomPad = Math.max(8, insets.bottom);
  const barBottom = height - bottomPad;
  const barTop = barBottom - TAB_BAR_HEIGHT;
  const barRect: Rect = {
    x: TAB_BAR_EDGE - 6,
    y: barTop - TAB_BAR_LIFT,
    width: width - (TAB_BAR_EDGE - 6) * 2,
    height: barBottom - (barTop - TAB_BAR_LIFT),
  };
  /**
   * The settings shortcut, which every primary screen carries in its header.
   *
   * `Screen` pads its content by `space.edge` inside the top safe area and
   * `AppHeader` lifts its row by `space.md` to meet the header controls on a
   * pushed screen, which leaves the row at `space.sm`. The control is a
   * `minTouch` touch target with a smaller circle drawn centred inside it, and
   * it is that circle the ring has to hug — the target itself is invisible.
   */
  const circleInset = (minTouch - HEADER_CIRCLE) / 2;
  const settingsRect: Rect = {
    x: width - space.edge - minTouch + circleInset - RING_PAD,
    y: insets.top + space.sm + circleInset - RING_PAD,
    width: HEADER_CIRCLE + RING_PAD * 2,
    height: HEADER_CIRCLE + RING_PAD * 2,
  };
  const rect = step.tab ? barRect : settingsRect;
  const pointsDown = Boolean(step.tab);

  const pointerX = step.tab
    ? TAB_BAR_EDGE +
      tabCenter(
        width - TAB_BAR_EDGE * 2,
        STEPS.filter(item => item.tab).length,
        index,
      )
    : settingsRect.x + settingsRect.width / 2;

  const pointer = useRef(new Animated.Value(pointerX)).current;
  useEffect(() => {
    if (reducedMotion) {
      pointer.setValue(pointerX);
      return;
    }
    const animation = Animated.timing(pointer, {
      toValue: pointerX,
      duration: 260,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [pointer, pointerX, reducedMotion]);

  // Moving the tab is what makes this a tour of the app and not of a diagram.
  useEffect(() => {
    if (step.tab) onFocusTab(step.tab);
  }, [step.tab, onFocusTab]);

  const next = () => {
    if (index + 1 < STEPS.length) setIndex(index + 1);
    else onDone();
  };
  const back = () => setIndex(value => Math.max(0, value - 1));

  const scrim = isDark ? 'rgba(0,0,0,0.72)' : 'rgba(16,10,28,0.55)';
  // Light ink either way: the ring is drawn over the violet bar, never over the
  // page, so it follows the bar rather than the theme.
  const ringColor = isDark ? colors.text : colors.onPrimary;
  /** Four panes around the hole, so the real control shows through it. */
  const panes: Array<{ key: string; style: ViewRect }> = [
    { key: 'top', style: { left: 0, top: 0, width, height: rect.y } },
    {
      key: 'bottom',
      style: {
        left: 0,
        top: rect.y + rect.height,
        width,
        height: Math.max(0, height - (rect.y + rect.height)),
      },
    },
    {
      key: 'left',
      style: { left: 0, top: rect.y, width: rect.x, height: rect.height },
    },
    {
      key: 'right',
      style: {
        left: rect.x + rect.width,
        top: rect.y,
        width: Math.max(0, width - (rect.x + rect.width)),
        height: rect.height,
      },
    },
  ];

  const card = pointsDown
    ? { bottom: height - rect.y + 14 }
    : { top: rect.y + rect.height + 14 };
  const caret = pointsDown
    ? { bottom: height - rect.y + 14 - 7 }
    : { top: rect.y + rect.height + 14 - 7 };

  return (
    <View
      accessibilityViewIsModal
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
    >
      {panes.map(pane => (
        <Pressable
          key={pane.key}
          accessible={false}
          onPress={next}
          style={[styles.pane, pane.style, { backgroundColor: scrim }]}
        />
      ))}

      {/* A ring around the control that is being named. */}
      <View
        accessible={false}
        pointerEvents="none"
        style={[
          styles.ring,
          {
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            borderColor: ringColor,
            borderRadius: step.tab ? radius.card + 8 : radius.pill,
          },
        ]}
      />

      <Animated.View
        accessible={false}
        pointerEvents="none"
        style={[
          styles.caret,
          caret,
          {
            backgroundColor: colors.surface,
            // The rotation lives here too: an inline `transform` replaces the
            // stylesheet's array wholesale rather than merging with it.
            transform: [
              { translateX: Animated.subtract(pointer, 7) },
              { rotate: '45deg' },
            ],
          },
        ]}
      />

      <View
        style={[
          styles.card,
          card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.progress}>
          <Text style={[styles.counter, { color: colors.muted }]}>
            {`${index + 1} of ${STEPS.length}`}
          </Text>
          <View accessible={false} style={styles.dots}>
            {STEPS.map((item, dot) => (
              <View
                key={item.title}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      dot === index ? colors.primary : colors.border,
                  },
                ]}
              />
            ))}
          </View>
        </View>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {step.title}
        </Text>
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.lead, { color: colors.muted }]}
        >
          {step.lead}
        </Text>
        {warning ? <Notice tone="warning" message={warning} /> : null}
        <View style={styles.actions}>
          <Button
            label="Skip tour"
            tone="quiet"
            onPress={onDone}
          />
          {index > 0 ? (
            <Button
              label="Previous"
              accessibilityLabel="Previous tour step"
              tone="secondary"
              onPress={back}
            />
          ) : null}
          <View style={styles.grow}>
            <Button
              label={index + 1 === STEPS.length ? 'Done' : 'Continue'}
              accessibilityLabel={
                index + 1 === STEPS.length ? 'Finish tour' : 'Continue tour'
              }
              onPress={next}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

type ViewRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const styles = StyleSheet.create({
  pane: { position: 'absolute' },
  grow: { flex: 1, minWidth: 96 },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    opacity: 0.9,
  },
  caret: {
    position: 'absolute',
    left: 0,
    width: 14,
    height: 14,
  },
  card: {
    position: 'absolute',
    left: space.edge,
    right: space.edge,
    maxWidth: 520,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.sm,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  counter: typeScale.caption,
  dots: { flexDirection: 'row', gap: space.xs, flex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  title: typeScale.section,
  lead: typeScale.body,
  actions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: space.sm,
    marginTop: space.xs,
  },
});
