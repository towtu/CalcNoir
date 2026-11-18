import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { METHODS } from '../../core/methods';
import type { MethodId } from '../../core/numerics/types';
import { MethodMark } from '../../shared/assets/MethodMark';
import { lessonFor } from './lessons';
import { useNotebook } from '../../shared/storage';
import {
  radius,
  space,
  tabular,
  typeScale,
  useTheme,
} from '../../shared/theme';
import { AppHeader, Screen } from '../../shared/ui';
import { GradientWord } from '../../shared/ui/GradientWord';

const ARROW_ICON = 'M4 12h14M13 6l6 6-6 6';

/**
 * A ring showing a share of a whole. At zero it draws only the track: a round
 * cap on a zero-length arc renders as a stray dot.
 */
function ProgressRing({
  value,
  total,
  color,
  track,
  ink,
}: {
  value: number;
  total: number;
  color: string;
  track: string;
  ink: string;
}) {
  const r = 25;
  const circumference = 2 * Math.PI * r;
  const share = total === 0 ? 0 : value / total;
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64" accessible={false}>
      <Circle cx={32} cy={32} r={r} stroke={track} strokeWidth={6} fill="none" />
      {share > 0 ? (
        <Circle
          cx={32}
          cy={32}
          r={r}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * share} ${circumference}`}
          transform="rotate(-90 32 32)"
        />
      ) : null}
      <SvgText
        x={32}
        y={37}
        fontSize={14}
        fontFamily="JetBrains Mono"
        fontWeight="600"
        fill={ink}
        textAnchor="middle"
      >
        {`${Math.round(share * 100)}%`}
      </SvgText>
    </Svg>
  );
}

export function LearnScreen({
  onLesson,
  onSettings,
}: {
  onLesson?: (method: MethodId) => void;
  onSettings?: () => void;
}) {
  const { colors } = useTheme();
  const { entries } = useNotebook();

  /**
   * Progress is counted from work that actually exists. The app persists no
   * lesson state, so instead of a fabricated "3 of 5 lessons" this reports how
   * many of the six methods you have genuinely solved and saved.
   */
  const methodsTried = new Set(entries.map(entry => entry.problem.method)).size;
  const lessons = METHODS;

  const surface = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  return (
    <Screen style={styles.content}>
      {onSettings ? <AppHeader onSettings={onSettings} /> : null}

      <View style={styles.hero}>
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel="Learn at your own pace."
          style={styles.heroTitle}
        >
          <Text style={[styles.heading, { color: colors.text }]}>
            Learn at your
          </Text>
          <View style={styles.heroRow}>
            <Text style={[styles.heading, { color: colors.text }]}>own</Text>
            <GradientWord word="pace." size={34} id="numelixLearnPace" />
          </View>
        </View>
        <Text style={[styles.heroLead, { color: colors.muted }]}>
          Build your foundation in numerical analysis through concise lessons and guided practice.
        </Text>
      </View>

      <View style={styles.group}>
        <Text
          accessibilityRole="header"
          style={[styles.sectionTitle, { color: colors.text }]}
        >
          Your progress
        </Text>
        <View style={[styles.progress, surface]}>
          <ProgressRing
            value={methodsTried}
            total={METHODS.length}
            color={colors.accent}
            track={colors.accentSoft}
            ink={colors.text}
          />
          <View style={styles.progressCopy}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Methods explored
            </Text>
            <Text style={[styles.progressValue, { color: colors.muted }]}>
              {methodsTried} / {METHODS.length} solved and saved
            </Text>
            <Text style={[styles.cardLead, { color: colors.muted }]}>
              {methodsTried === 0
                ? 'Save a calculation to start tracking this.'
                : 'Counted from your notebook, not from lessons.'}
            </Text>
          </View>
        </View>
      </View>

      {onLesson && lessons.length ? (
        <View style={styles.group}>
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: colors.text }]}
          >
            Lessons
          </Text>
          <View style={styles.list}>
            {lessons.map(method => (
              <Pressable
                key={method.id}
                accessibilityRole="button"
                accessibilityLabel={'Read ' + method.title}
                onPress={() => onLesson(method.id)}
                style={({ pressed }) => [
                  styles.row,
                  surface,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <MethodMark method={method.id} color={colors.primary} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {method.title}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[styles.cardLead, { color: colors.muted }]}
                  >
                    {lessonFor(method.id).summary}
                  </Text>
                </View>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path
                    d={ARROW_ICON}
                    stroke={colors.accent}
                    strokeWidth={1.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: space.lg },
  pressed: { opacity: 0.78 },
  hero: { paddingTop: space.md },
  heroTitle: { gap: space.xs },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  heading: { ...typeScale.hero, letterSpacing: -0.6 },
  heroLead: { ...typeScale.body, marginTop: space.sm },
  group: { gap: space.md },
  sectionTitle: typeScale.section,
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  progressCopy: { flex: 1, gap: 2 },
  progressValue: { ...typeScale.numericSmall, ...tabular },
  list: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 72,
    padding: space.md,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, gap: 2 },
  cardTitle: typeScale.action,
  cardLead: typeScale.caption,
});
