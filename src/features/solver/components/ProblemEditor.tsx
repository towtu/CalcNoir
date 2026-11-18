import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { methodInfo, presetsFor } from '../../../core/methods';
import { compileExpression } from '../../../core/numerics/expression';
import type { MethodId, Problem } from '../../../core/numerics/types';
import {
  radius,
  space,
  tabular,
  typeScale,
  useTheme,
} from '../../../shared/theme';
import { Body, Disclosure, Field } from '../../../shared/ui';
import type { Draft } from '../draft';

interface Props {
  draft: Draft;
  disabled: boolean;
  onChange: (draft: Draft) => void;
  onPreset: (problem: Problem) => void;
  onMethod?: (method: MethodId) => void;
}

const PLUS = 'M12 5.2a1.1 1.1 0 0 1 1.1 1.1v4.6h4.6a1.1 1.1 0 1 1 0 2.2h-4.6v4.6a1.1 1.1 0 1 1-2.2 0v-4.6H6.3a1.1 1.1 0 1 1 0-2.2h4.6V6.3A1.1 1.1 0 0 1 12 5.2Z';
const CLOSE =
  'M7.3 7.3a1.05 1.05 0 0 1 1.5 0L12 10.5l3.2-3.2a1.05 1.05 0 1 1 1.5 1.5L13.5 12l3.2 3.2a1.05 1.05 0 0 1-1.5 1.5L12 13.5l-3.2 3.2a1.05 1.05 0 0 1-1.5-1.5L10.5 12 7.3 8.8a1.05 1.05 0 0 1 0-1.5Z';

export function ProblemEditor({ draft, disabled, onChange, onPreset }: Props) {
  const { colors } = useTheme();
  const info = methodInfo(draft.method);
  const presets = presetsFor(draft.method);
  const root = info.category === 'root';

  const update = (key: keyof Draft, value: string) =>
    onChange({ ...draft, [key]: value });

  /**
   * Parse the equation as it is typed so a typo surfaces here instead of after
   * pressing Calculate. It reuses the solver's own parser, so the wording a
   * student sees is the wording the engine would have given them anyway.
   */
  const expressionIssue = useMemo(() => {
    if (!root) return null;
    const source = draft.expression.trim();
    if (!source) return null;
    try {
      compileExpression(source, true);
      return null;
    } catch (cause) {
      return cause instanceof Error ? cause.message : null;
    }
  }, [draft.expression, root]);

  const numberField = (key: keyof Draft, label: string, hint?: string) => (
    <View style={styles.cell}>
      <Field
        mono
        label={label}
        value={String(draft[key])}
        onChangeText={value => update(key, value)}
        editable={!disabled}
        maxLength={40}
        hint={hint}
      />
    </View>
  );

  const updatePoint = (index: number, coordinate: 'x' | 'y', value: string) =>
    onChange({
      ...draft,
      points: draft.points.map((point, row) =>
        row === index ? { ...point, [coordinate]: value } : point,
      ),
    });

  return (
    <>
      {/* What this method needs, and the formula it will step through. Stated
          up front so nobody has to calculate to find out what it expects. */}
      <View style={[styles.brief, { backgroundColor: colors.primarySoft }]}>
        <Text style={[styles.briefLabel, { color: colors.secondary }]}>
          {root ? 'Needs an equation and a starting point' : 'Needs 2–20 points'}
        </Text>
        <Text style={[styles.formula, { color: colors.text }]}>
          {info.formula}
        </Text>
      </View>

      {root ? (
        <>
          <Field
            mono
            label="Equation or f(x)"
            value={draft.expression}
            onChangeText={value => update('expression', value)}
            editable={!disabled}
            maxLength={300}
            hint={
              expressionIssue
                ? undefined
                : 'For example: x^2 = 2. Trigonometric functions use radians.'
            }
          />
          {expressionIssue ? (
            <Text style={[styles.issue, { color: colors.secondary }]}>
              Check this: {expressionIssue}
            </Text>
          ) : null}

          {draft.method === 'fixed-point' ? (
            <Field
              mono
              label="Mapping g(x)"
              value={draft.gExpression}
              onChangeText={value => update('gExpression', value)}
              editable={!disabled}
              maxLength={300}
              hint="Enter the equivalent right-hand expression for x = g(x)."
            />
          ) : null}

          <View style={styles.row}>
            {draft.method === 'bisection' ? (
              <>
                {numberField('a', 'Bracket start a')}
                {numberField('b', 'Bracket end b')}
              </>
            ) : (
              <>
                {numberField('x0', 'First guess x₀')}
                {draft.method === 'secant'
                  ? numberField('x1', 'Second guess x₁')
                  : null}
              </>
            )}
          </View>
        </>
      ) : (
        <>
          <View style={styles.pointsHeader}>
            <Text style={[styles.pointsTitle, { color: colors.text }]}>
              Points
            </Text>
            <Text style={[styles.pointsCount, { color: colors.muted }]}>
              {draft.points.length} of 20
            </Text>
          </View>
          <Body muted>Each x must be different.</Body>

          {draft.points.map((point, index) => (
            <View key={index} style={styles.pointRow}>
              <View style={styles.pointField}>
                <Field
                  mono
                  label={`Point ${index + 1} x`}
                  value={point.x}
                  onChangeText={value => updatePoint(index, 'x', value)}
                  editable={!disabled}
                  maxLength={40}
                />
              </View>
              <View style={styles.pointField}>
                <Field
                  mono
                  label={`Point ${index + 1} y`}
                  value={point.y}
                  onChangeText={value => updatePoint(index, 'y', value)}
                  editable={!disabled}
                  maxLength={40}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove point ${index + 1}`}
                accessibilityState={{
                  disabled: disabled || draft.points.length <= 2,
                }}
                disabled={disabled || draft.points.length <= 2}
                onPress={() =>
                  onChange({
                    ...draft,
                    points: draft.points.filter((_, row) => row !== index),
                  })
                }
                style={[
                  styles.remove,
                  { backgroundColor: colors.surfaceAlt },
                  disabled || draft.points.length <= 2
                    ? styles.disabled
                    : undefined,
                ]}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d={CLOSE} fill={colors.muted} />
                </Svg>
              </Pressable>
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add point (${draft.points.length}/20)`}
            accessibilityState={{
              disabled: disabled || draft.points.length >= 20,
            }}
            disabled={disabled || draft.points.length >= 20}
            onPress={() =>
              onChange({
                ...draft,
                points: [...draft.points, { x: '', y: '' }],
              })
            }
            style={({ pressed }) => [
              styles.addPoint,
              { borderColor: colors.primary },
              disabled || draft.points.length >= 20
                ? styles.disabled
                : pressed
                ? styles.pressed
                : null,
            ]}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d={PLUS} fill={colors.primary} />
            </Svg>
            <Text style={[styles.addPointText, { color: colors.primary }]}>
              Add point
            </Text>
          </Pressable>

          {numberField('targetX', 'Target x')}
        </>
      )}

      {/* Examples sit in the open rather than behind a disclosure: the fastest
          way past a blank equation field is one that is already filled in. */}
      {presets.length ? (
        <View style={styles.presets}>
          <Text style={[styles.presetsLabel, { color: colors.muted }]}>
            Start from an example
          </Text>
          <View style={styles.presetRow}>
            {presets.map(preset => (
              <Pressable
                key={preset.label}
                accessibilityRole="button"
                accessibilityLabel={preset.label}
                disabled={disabled}
                onPress={() => onPreset(preset.problem)}
                style={({ pressed }) => [
                  styles.preset,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  disabled ? styles.disabled : pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.presetText, { color: colors.text }]}>
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Disclosure title="Advanced settings">
        {root ? (
          <View style={styles.row}>
            {numberField('tolerance', 'Tolerance')}
            {numberField('maxIterations', 'Iteration limit', '1–200 iterations')}
          </View>
        ) : null}
        {numberField(
          'precision',
          'Display precision',
          '0–12 decimal places. Calculations keep full precision.',
        )}
        <Body muted>
          Negative numbers and scientific notation, such as -2.5 or 1e-6, are
          supported.
        </Body>
      </Disclosure>
    </>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
  brief: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.card,
  },
  briefLabel: typeScale.caption,
  formula: typeScale.mathDisplay,
  issue: { ...typeScale.caption, marginTop: -space.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { flex: 1, minWidth: 136 },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  pointsTitle: typeScale.section,
  pointsCount: { ...typeScale.numericSmall, ...tabular },
  pointRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  pointField: { flex: 1, minWidth: 0 },
  remove: {
    width: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.control,
  },
  addPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 48,
    borderRadius: radius.control,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addPointText: typeScale.action,
  presets: { gap: space.sm },
  presetsLabel: typeScale.label,
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  preset: {
    paddingHorizontal: space.md,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  presetText: typeScale.label,
});
