import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { METHODS } from '../../core/methods';
import type { MethodId } from '../../core/numerics/types';
import { ICONS } from '../../shared/assets/icons';
import { MethodMark } from '../../shared/assets/MethodMark';
import {
  minTouch,
  radius,
  space,
  typeScale,
  useTheme,
} from '../../shared/theme';
import { AppHeader, Notice, Screen } from '../../shared/ui';
import { GradientWord } from '../../shared/ui/GradientWord';

const ARROW_ICON = 'M4 12h14M13 6l6 6-6 6';

const inputHints: Record<MethodId, string> = {
  bisection: 'Equation · lower and upper bounds',
  newton: 'Equation · one starting guess',
  secant: 'Equation · two starting guesses',
  'fixed-point': 'Equation · mapping · starting guess',
  'newton-divided': 'Point pairs · target x',
  lagrange: 'Point pairs · target x',
};

function SectionHeader({
  icon,
  title,
  color,
  tint,
}: {
  icon: string;
  title: string;
  color: string;
  tint: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: tint }]}>
        <Svg width={19} height={19} viewBox="0 0 24 24" accessible={false}>
          <Path d={icon} fill={color} fillRule="evenodd" />
        </Svg>
      </View>
      <Text
        accessibilityRole="header"
        style={[styles.sectionTitle, { color }]}
      >
        {title}
      </Text>
    </View>
  );
}

export function MethodsScreen({
  onChoose,
  warning,
  picker = false,
  selectedMethod,
  onSettings,
}: {
  onChoose: (method: MethodId) => void;
  warning?: string | null;
  picker?: boolean;
  selectedMethod?: MethodId;
  onSettings?: () => void;
}) {
  const { colors } = useTheme();
  const matches = METHODS;

  if (picker) {
    return (
      <Screen style={styles.content}>
        {warning ? <Notice tone="warning" message={warning} /> : null}
        <Text
          accessibilityRole="header"
          style={[styles.heading, { color: colors.text }]}
        >
          Choose a method
        </Text>
        <MethodChoices onChoose={onChoose} selectedMethod={selectedMethod} />
      </Screen>
    );
  }

  const groups = [
    { key: 'root' as const, title: 'Root Finding', icon: ICONS.target },
    {
      key: 'interpolation' as const,
      title: 'Interpolation',
      icon: ICONS.chart,
    },
  ];

  return (
    <Screen style={styles.content}>
      {onSettings ? <AppHeader onSettings={onSettings} /> : null}
      {warning ? <Notice tone="warning" message={warning} /> : null}

      <View style={styles.hero}>
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel="Find the solution, step by step."
          style={styles.heroTitle}
        >
          <Text style={[styles.heading, { color: colors.text }]}>
            Find the solution,
          </Text>
          <GradientWord
            word="step by step."
            size={34}
            id="numelixSolveStep"
          />
        </View>
        <Text style={[styles.heroLead, { color: colors.muted }]}>
          Explore numerical methods and work through mathematical problems with clear, guided solutions.
        </Text>
      </View>

      {groups.map(group => {
        const items = matches.filter(method => method.category === group.key);
        if (items.length === 0) return null;
        return (
          <View key={group.key} style={styles.group}>
            <SectionHeader
              icon={group.icon}
              title={group.title}
              color={colors.text}
              tint={colors.primarySoft}
            />
            <View style={styles.grid}>
              {items.map(method => (
                <Pressable
                  key={method.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${method.title}`}
                  accessibilityHint={inputHints[method.id]}
                  onPress={() => onChoose(method.id)}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.cardMark,
                      { backgroundColor: colors.primarySoft },
                    ]}
                  >
                    <MethodMark method={method.id} color={colors.primary} />
                  </View>
                  <Text
                    style={[styles.cardTitle, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {method.title.replace(/-/g, '-​')}
                  </Text>
                  <Text
                    style={[styles.cardLead, { color: colors.muted }]}
                    numberOfLines={3}
                  >
                    {method.description}
                  </Text>
                  <View
                    style={[
                      styles.cardArrow,
                      { backgroundColor: colors.accentSoft },
                    ]}
                  >
                    <Svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      accessible={false}
                    >
                      <Path
                        d={ARROW_ICON}
                        stroke={colors.accent}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </Svg>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

/**
 * The compact list used when picking a method for a saved problem. Kept
 * separate from the Solve landing on purpose: the picker needs a dense,
 * selectable list, not a browsing surface.
 */
export function MethodChoices({
  onChoose,
  selectedMethod,
}: {
  onChoose: (method: MethodId) => void;
  selectedMethod?: MethodId;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.choices}>
      {(['root', 'interpolation'] as const).map(category => (
        <View key={category}>
          <Text
            accessibilityRole="header"
            style={[styles.groupTitle, { color: colors.muted }]}
          >
            {category === 'root' ? 'Root finding' : 'Interpolation'}
          </Text>
          {METHODS.filter(method => method.category === category).map(
            method => {
              const selected = selectedMethod === method.id;
              return (
                <Pressable
                  key={method.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${method.title}`}
                  accessibilityHint={inputHints[method.id]}
                  accessibilityState={{ selected }}
                  onPress={() => onChoose(method.id)}
                  style={({ pressed }) => [
                    styles.methodRow,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: selected
                        ? colors.surfaceAlt
                        : colors.surface,
                      opacity: pressed ? 0.65 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.methodMark,
                      {
                        backgroundColor: selected
                          ? colors.primary
                          : colors.primarySoft,
                      },
                    ]}
                  >
                    <MethodMark
                      method={method.id}
                      color={selected ? colors.onPrimary : colors.primary}
                    />
                  </View>
                  <View style={styles.copy}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[styles.methodTitle, { color: colors.text }]}
                      >
                        {method.title.replace(/-/g, '-​')}
                      </Text>
                      {selected ? (
                        <Text
                          style={[styles.current, { color: colors.accent }]}
                        >
                          Current
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.hint,
                        { color: selected ? colors.text : colors.muted },
                      ]}
                    >
                      {inputHints[method.id]}
                    </Text>
                  </View>
                  <Text
                    accessible={false}
                    allowFontScaling={false}
                    style={[styles.arrow, { color: colors.accent }]}
                  >
                    ›
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: space.lg },
  hero: { paddingTop: space.md },
  heroTitle: { gap: space.xs },
  heading: { ...typeScale.hero, letterSpacing: -0.6 },
  heroLead: { ...typeScale.body, marginTop: space.sm },
  group: { gap: space.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: typeScale.section,
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  card: {
    flexGrow: 1,
    flexBasis: 150,
    maxWidth: '100%',
    padding: space.md,
    gap: space.sm,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardMark: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: typeScale.action,
  cardLead: typeScale.caption,
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  featureMark: {
    width: 56,
    height: 56,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: { flex: 1, gap: space.xs },
  featureTitle: typeScale.section,
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  chipText: typeScale.caption,
  empty: { ...typeScale.body, paddingVertical: space.lg },
  choices: { gap: space.lg },
  groupTitle: { ...typeScale.label, marginBottom: space.xs },
  methodRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  methodMark: {
    width: minTouch,
    height: minTouch,
    borderRadius: radius.control,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  methodTitle: { flex: 1, ...typeScale.action },
  current: typeScale.caption,
  hint: typeScale.caption,
  arrow: { fontSize: 24, lineHeight: 32 },
});
