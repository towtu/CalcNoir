import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Calculation } from '../../core/numerics/types';
import { Body, Button, Disclosure, Heading, Screen } from '../../shared/ui';
import { useTheme } from '../../shared/theme';
import { formatNumber } from '../../shared/ui/format';
import { stepValue } from './stepValue';
import { ExplanationModal } from './components/ExplanationModal';

export function StepsScreen({
  calculation,
  initialStep = 0,
  onGraph,
}: {
  calculation: Calculation;
  initialStep?: number;
  onGraph: (step: number) => void;
}) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState(
    Math.max(
      0,
      Math.min(
        Number.isFinite(initialStep) ? Math.trunc(initialStep) : 0,
        calculation.steps.length - 1,
      ),
    ),
  );
  const [explaining, setExplaining] = useState(false);
  const step = calculation.steps[selected];
  const currentValue = step ? stepValue(calculation, step) : null;
  return (
    <>
      <Screen>
        <Heading
          title={
            step
              ? `Step ${step.index} of ${calculation.steps.length}`
              : 'No recorded steps'
          }
          subtitle="Move through the calculation at your own pace."
        />
        {step ? (
          <>
            <View style={[styles.currentValue, { borderColor: colors.border }]}>
              <Body muted>{currentValue?.label}</Body>
              <Text
                testID="step-value"
                accessibilityLiveRegion="polite"
                accessibilityLabel={`${currentValue?.label}: ${currentValue?.formatted}`}
                selectable
                style={[styles.number, { color: colors.text }]}
              >
                {currentValue?.formatted}
              </Text>
            </View>
            <Text selectable style={[styles.formula, { color: colors.text }]}>
              {step.formula}
            </Text>
            <Body>{step.explanation}</Body>
            <View style={styles.controls}>
              <View style={styles.grow}>
                <Button
                  label="Previous step"
                  tone="secondary"
                  disabled={selected === 0}
                  onPress={() => setSelected(value => Math.max(0, value - 1))}
                />
              </View>
              <View style={styles.grow}>
                <Button
                  label="Next step"
                  tone="secondary"
                  disabled={selected === calculation.steps.length - 1}
                  onPress={() =>
                    setSelected(value =>
                      Math.min(calculation.steps.length - 1, value + 1),
                    )
                  }
                />
              </View>
            </View>
            {selected === calculation.steps.length - 1 ? (
              <Body muted>You have reached the final recorded step.</Body>
            ) : null}
            <Button
              label="Explain this step"
              onPress={() => setExplaining(true)}
            />
            <Button
              label="Show on graph"
              tone="quiet"
              onPress={() => onGraph(selected)}
            />
            <Disclosure title="Values in this step">
              {calculation.columns.map((column, index) => (
                <View
                  key={`${column}-${index}`}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                >
                  <Body muted>{column}</Body>
                  <Text
                    selectable
                    style={[styles.cellValue, { color: colors.text }]}
                  >
                    {typeof step.cells[index] === 'number'
                      ? formatNumber(
                          step.cells[index] as number,
                          calculation.problem.precision,
                        )
                      : step.cells[index] ?? '—'}
                  </Text>
                </View>
              ))}
            </Disclosure>
          </>
        ) : (
          <Body muted>
            No iteration was needed or the calculation stopped before a step
            could be recorded.
          </Body>
        )}
      </Screen>
      <ExplanationModal
        visible={explaining}
        calculation={calculation}
        step={step}
        onClose={() => setExplaining(false)}
      />
    </>
  );
}
const styles = StyleSheet.create({
  currentValue: {
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  number: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cellValue: { fontSize: 15 },
  formula: { fontSize: 20, lineHeight: 32, fontWeight: '500' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  grow: { flex: 1, minWidth: 130 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
