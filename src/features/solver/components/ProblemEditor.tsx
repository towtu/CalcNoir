import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { methodInfo, presetsFor } from '../../../core/methods';
import type { MethodId, Problem } from '../../../core/numerics/types';
import { useTheme } from '../../../shared/theme';
import { Body, Button, Disclosure, Field, Section } from '../../../shared/ui';
import type { Draft } from '../draft';

interface Props {
  draft: Draft;
  disabled: boolean;
  onChange: (draft: Draft) => void;
  onPreset: (problem: Problem) => void;
  onMethod?: (method: MethodId) => void;
}
export function ProblemEditor({ draft, disabled, onChange, onPreset }: Props) {
  const { colors } = useTheme();
  const info = methodInfo(draft.method);
  const update = (key: keyof Draft, value: string) =>
    onChange({ ...draft, [key]: value });
  const numberField = (key: keyof Draft, label: string, hint?: string) => (
    <View style={styles.cell}>
      <Field
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
      <Section>
        {info.category === 'root' ? (
          <>
            <Field
              label="Equation or f(x)"
              value={draft.expression}
              onChangeText={value => update('expression', value)}
              editable={!disabled}
              maxLength={300}
              hint="For example: x^2 = 2. Trigonometric functions use radians."
            />
            {draft.method === 'fixed-point' ? (
              <Field
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
            <Body muted>Enter 2–20 points. Each x must be different.</Body>
            {draft.points.map((point, index) => (
              <View key={index} style={styles.pointRow}>
                <View style={styles.pointField}>
                  <Field
                    label={`Point ${index + 1} x`}
                    value={point.x}
                    onChangeText={value => updatePoint(index, 'x', value)}
                    editable={!disabled}
                    maxLength={40}
                  />
                </View>
                <View style={styles.pointField}>
                  <Field
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
                    {
                      backgroundColor: colors.surfaceAlt,
                    },
                    disabled || draft.points.length <= 2
                      ? styles.disabled
                      : undefined,
                  ]}
                >
                  <Text
                    accessible={false}
                    style={[styles.removeText, { color: colors.text }]}
                  >
                    ×
                  </Text>
                </Pressable>
              </View>
            ))}
            <Button
              label={`Add point (${draft.points.length}/20)`}
              tone="quiet"
              disabled={disabled || draft.points.length >= 20}
              onPress={() =>
                onChange({
                  ...draft,
                  points: [...draft.points, { x: '', y: '' }],
                })
              }
            />
            {numberField('targetX', 'Target x')}
          </>
        )}
      </Section>
      <Disclosure title="Examples">
        {presetsFor(draft.method).map(preset => (
          <Button
            key={preset.label}
            label={preset.label}
            tone="secondary"
            disabled={disabled}
            onPress={() => onPreset(preset.problem)}
          />
        ))}
      </Disclosure>
      <Disclosure title="Advanced settings">
        {info.category === 'root' ? (
          <View style={styles.row}>
            {numberField('tolerance', 'Tolerance')}
            {numberField(
              'maxIterations',
              'Iteration limit',
              '1–200 iterations',
            )}
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
  removeText: { fontSize: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { flex: 1, minWidth: 136 },
  pointRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  pointField: { flex: 1, minWidth: 0 },
  remove: {
    width: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
});
