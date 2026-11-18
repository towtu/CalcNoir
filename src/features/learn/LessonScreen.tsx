import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { methodInfo } from '../../core/methods';
import type { MethodId } from '../../core/numerics/types';
import { MethodMark } from '../../shared/assets/MethodMark';
import {
  minTouch,
  radius,
  space,
  typeScale,
  useTheme,
} from '../../shared/theme';
import { Body, Heading, Screen, Section } from '../../shared/ui';
import { lessonFor } from './lessons';

const PLAY = 'M7 4l13 8-13 8Z';

/**
 * One method, read like a chapter: what it is, how a step works, why you would
 * reach for it, and where it fails — then straight into practising it.
 */
export function LessonScreen({
  method,
  onPractice,
  onSolve,
}: {
  method: MethodId;
  onPractice: (method: MethodId) => void;
  onSolve: (method: MethodId) => void;
}) {
  const { colors } = useTheme();
  const info = methodInfo(method);
  const lesson = lessonFor(method);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={[styles.mark, { backgroundColor: colors.primarySoft }]}>
          <MethodMark method={method} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Heading title={info.title} subtitle={lesson.summary} />
        </View>
      </View>

      <View style={[styles.formulaCard, { backgroundColor: colors.primarySoft }]}>
        <Text style={[styles.formulaLabel, { color: colors.secondary }]}>
          The step
        </Text>
        <Text style={[styles.formula, { color: colors.text }]}>
          {info.formula}
        </Text>
      </View>

      {lesson.sections.map(section => (
        <Section key={section.heading} title={section.heading}>
          <Body>{section.body}</Body>
        </Section>
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Practise ${info.title}`}
        onPress={() => onPractice(method)}
        style={({ pressed }) => [
          styles.primaryAction,
          { backgroundColor: colors.primary },
          pressed ? styles.pressed : null,
        ]}
      >
        <Svg width={15} height={15} viewBox="0 0 24 24" accessible={false}>
          <Path d={PLAY} fill={colors.onPrimary} />
        </Svg>
        <Text style={[styles.actionLabel, { color: colors.onPrimary }]}>
          Practise this method
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${info.title}`}
        onPress={() => onSolve(method)}
        style={({ pressed }) => [
          styles.secondaryAction,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={[styles.actionLabel, { color: colors.text }]}>
          Try it on a problem
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.78 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mark: {
    width: 56,
    height: 56,
    borderRadius: radius.card,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  formulaCard: { gap: space.xs, padding: space.md, borderRadius: radius.card },
  formulaLabel: typeScale.caption,
  formula: typeScale.mathDisplay,
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: minTouch,
    borderRadius: radius.pill,
  },
  secondaryAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: minTouch,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: typeScale.action,
});
