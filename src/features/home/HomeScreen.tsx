import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { METHODS, methodInfo } from '../../core/methods';
import { useNotebook } from '../../shared/storage';
import {
  minTouch,
  radius,
  space,
  tabular,
  typeScale,
  useTheme,
} from '../../shared/theme';
import { AppHeader, Notice } from '../../shared/ui';
import { ICONS } from '../../shared/assets/icons';
import { CTA_SWEEP, GradientSurface } from '../../shared/ui/GradientSurface';
import { GradientWord } from '../../shared/ui/GradientWord';
import { HeroBackdrop } from './HeroBackdrop';

/** A small axes-and-curve illustration for the recent-activity card. */
function LessonGraph({ color, muted }: { color: string; muted: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 96" accessible={false}>
      <Path
        d="M18,10 V78 H112"
        stroke={muted}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M18,52 H66 M66,52 V78"
        stroke={muted}
        strokeWidth={1.2}
        strokeDasharray="3 4"
        fill="none"
      />
      <Path
        d="M22,72 C50,70 68,56 96,16"
        stroke={color}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
      />
      <Circle cx={66} cy={52} r={4.4} fill={color} />
    </Svg>
  );
}

/**
 * Home is a dashboard, not a second copy of the other tabs. It carries the
 * brand, one clear next action, what you were last working on, honest progress,
 * and a door into each of the three other destinations. It deliberately does
 * not list the methods — that is what Solve is for.
 */
export function HomeScreen({
  onSolve,
  onLearn,
  onNotebook,
  onOpenSaved,
  onSettings,
  warning,
}: {
  onSolve: () => void;
  onLearn: () => void;
  onNotebook: () => void;
  onOpenSaved: (entryId: string) => void;
  onSettings: () => void;
  warning?: string | null;
}) {
  const { colors, isDark } = useTheme();
  const { entries } = useNotebook();

  /**
   * The hero measures itself rather than carrying a fixed height: the two
   * actions wrap to separate rows on narrow screens and the lead copy reflows,
   * so a hardcoded height spills the buttons into the section below it.
   */
  const [hero, setHero] = React.useState({ width: 0, height: 0 });

  /**
   * Progress is counted, never invented. The app persists no lesson state, so
   * these come from the notebook: what you last opened, how much you have
   * saved, and how many of the six methods you have actually tried.
   */
  const recent = entries
    .slice()
    .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))
    .at(0);

  const methodsTried = new Set(entries.map(entry => entry.problem.method)).size;
  const recentTitle = recent
    ? recent.title ?? methodInfo(recent.problem.method).title
    : null;

  const surface = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  const destinations = [
    {
      key: 'Solve',
      icon: ICONS.calculator,
      title: 'Solve',
      lead: 'Six methods, each with its own editor.',
      onPress: onSolve,
    },
    {
      key: 'Learn',
      icon: ICONS.graduationCap,
      title: 'Learn',
      lead: 'Guided walkthrough and practice.',
      onPress: onLearn,
    },
    {
      key: 'Notebook',
      icon: ICONS.journal,
      title: 'Notebook',
      lead: 'Everything you have saved.',
      onPress: onNotebook,
    },
  ];

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.fill}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={styles.hero}
          onLayout={event => {
            const { width: w, height: h } = event.nativeEvent.layout;
            setHero(current =>
              current.width === w && current.height === h
                ? current
                : { width: w, height: h },
            );
          }}
        >
          <HeroBackdrop
            width={hero.width}
            height={hero.height}
            isDark={isDark}
          />

          {/* Same component and same insets as every other primary screen, so
              the brand and the settings shortcut never shift between tabs. */}
          <View style={styles.header}>
            <AppHeader onSettings={onSettings} />
          </View>

          <View style={styles.heroCopy}>
            <View
              accessible
              accessibilityRole="header"
              accessibilityLabel="Learn. Solve. Master."
              style={styles.heroTitle}
            >
              <Text style={[styles.heroLine, { color: colors.text }]}>
                Learn. Solve.
              </Text>
              <GradientWord word="Master." size={34} id="numelixHomeMaster" />
            </View>

            <Text style={[styles.heroLead, { color: colors.muted }]}>
              Your journey through numerical analysis starts here.
            </Text>

            <View style={styles.heroActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start learning"
                onPress={onLearn}
                style={({ pressed }) => [
                  styles.primaryAction,
                  { opacity: pressed ? 0.82 : 1 },
                ]}
              >
                <GradientSurface
                  id="numelixStartLearning"
                  from={CTA_SWEEP.from}
                  to={CTA_SWEEP.to}
                />
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path d="M7 4l13 8-13 8Z" fill={CTA_SWEEP.ink} />
                </Svg>
                <Text style={[styles.actionLabel, styles.onGradient]}>
                  Start Learning
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Solve a problem"
                onPress={onSolve}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  surface,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path
                    d={ICONS.calculator}
                    fill={colors.text}
                    fillRule="evenodd"
                  />
                </Svg>
                <Text style={[styles.actionLabel, { color: colors.text }]}>
                  Solve a Problem
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {warning ? (
          <View style={styles.section}>
            <Notice message={warning} tone="warning" />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {recent ? 'Recent activity' : 'Start here'}
          </Text>
        </View>
        <View style={styles.sectionTight}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              recentTitle
                ? 'Open saved problem ' + recentTitle
                : 'Choose a method to solve'
            }
            onPress={() => (recent ? onOpenSaved(recent.id) : onSolve())}
            style={({ pressed }) => [
              styles.lesson,
              surface,
              { opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <View
              style={[styles.lessonArt, { backgroundColor: colors.primarySoft }]}
            >
              <LessonGraph color={colors.primary} muted={colors.border} />
            </View>
            <View style={styles.lessonCopy}>
              <View
                style={[styles.chip, { backgroundColor: colors.accentSoft }]}
              >
                <Text style={[styles.chipText, { color: colors.accent }]}>
                  {recent
                    ? methodInfo(recent.problem.method).title
                    : 'Six methods'}
                </Text>
              </View>
              <Text
                numberOfLines={2}
                style={[styles.lessonTitle, { color: colors.text }]}
              >
                {recentTitle ?? 'Your first solve, step by step'}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.lessonLead, { color: colors.muted }]}
              >
                {recent
                  ? 'Open your saved problem and keep going.'
                  : 'Choose a method, edit the values, read your real result.'}
              </Text>
              <Text style={[styles.lessonAction, { color: colors.accent }]}>
                {recent ? 'Resume →' : 'Start →'}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Your progress
          </Text>
        </View>
        <View style={styles.sectionTight}>
          <View style={[styles.progress, surface]}>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: colors.muted }]}>
                Methods tried
              </Text>
              <Text style={[styles.progressValue, { color: colors.text }]}>
                {methodsTried} of {METHODS.length}
              </Text>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={`${methodsTried} of ${METHODS.length} methods tried`}
              style={[styles.track, { backgroundColor: colors.accentSoft }]}
            >
              <View
                style={[
                  styles.trackFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${(methodsTried / METHODS.length) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressNote, { color: colors.muted }]}>
              {entries.length === 0
                ? 'Save a calculation and it will show up here.'
                : `${entries.length} saved ${
                    entries.length === 1 ? 'problem' : 'problems'
                  } in your notebook.`}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Explore
          </Text>
        </View>
        <View style={[styles.sectionTight, styles.destinations]}>
          {destinations.map(destination => (
            <Pressable
              key={destination.key}
              accessibilityRole="button"
              accessibilityLabel={'Go to ' + destination.title}
              onPress={destination.onPress}
              style={({ pressed }) => [
                styles.destination,
                surface,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View
                style={[
                  styles.destinationIcon,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <Svg width={21} height={21} viewBox="0 0 24 24">
                  <Path
                    d={destination.icon}
                    fill={colors.primary}
                    fillRule="evenodd"
                  />
                </Svg>
              </View>
              <View style={styles.destinationCopy}>
                <Text style={[styles.destinationTitle, { color: colors.text }]}>
                  {destination.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.destinationLead, { color: colors.muted }]}
                >
                  {destination.lead}
                </Text>
              </View>
              <Text
                accessible={false}
                allowFontScaling={false}
                style={[styles.chevron, { color: colors.accent }]}
              >
                ›
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingBottom: space.xxl,
  },
  hero: { justifyContent: 'flex-start' },
  header: { paddingHorizontal: space.edge, paddingTop: space.edge },
  heroCopy: { paddingHorizontal: space.edge, paddingTop: space.xl },
  heroTitle: { gap: space.xs },
  heroLine: { ...typeScale.hero, letterSpacing: -0.6 },
  heroLead: { ...typeScale.body, marginTop: space.sm, maxWidth: 320 },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    marginTop: space.lg,
  },
  primaryAction: {
    flexGrow: 1,
    flexBasis: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: minTouch,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  onGradient: { color: CTA_SWEEP.ink },
  secondaryAction: {
    flexGrow: 1,
    flexBasis: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: minTouch,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: typeScale.action,
  section: { paddingHorizontal: space.edge, marginTop: space.xl },
  sectionTight: { paddingHorizontal: space.edge, marginTop: space.md },
  sectionTitle: typeScale.section,
  lesson: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lessonArt: { width: 108, alignItems: 'center', justifyContent: 'center' },
  lessonCopy: { flex: 1, padding: space.lg, gap: 6 },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  chipText: typeScale.caption,
  lessonTitle: typeScale.action,
  lessonLead: typeScale.caption,
  lessonAction: { ...typeScale.label, marginTop: space.xs },
  progress: {
    padding: space.lg,
    gap: space.sm,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: typeScale.label,
  progressValue: { ...typeScale.numericSmall, ...tabular },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  trackFill: { height: 8, borderRadius: radius.pill },
  progressNote: typeScale.caption,
  destinations: { gap: space.sm },
  destination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    padding: space.md,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  destinationIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationCopy: { flex: 1, gap: 2 },
  destinationTitle: typeScale.action,
  destinationLead: typeScale.caption,
  chevron: { fontSize: 24, lineHeight: 32 },
});
