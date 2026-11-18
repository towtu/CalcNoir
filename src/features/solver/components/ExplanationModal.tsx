import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  Calculation,
  CalculationStep,
} from '../../../core/numerics/types';
import { methodInfo } from '../../../core/methods';
import { tabular, typeScale, useTheme } from '../../../shared/theme';
import { Body, Button, Heading, Notice, Section } from '../../../shared/ui';
import { formatNumber } from '../../../shared/ui/format';

export function ExplanationModal({
  visible,
  calculation,
  step,
  onClose,
}: {
  visible: boolean;
  calculation: Calculation | null;
  step?: CalculationStep;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.fill, { backgroundColor: colors.background }]}
        accessibilityViewIsModal
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Heading
            title="Understand this step"
            subtitle="Built-in explanation · available offline"
            action={<Button label="Close" tone="quiet" onPress={onClose} />}
          />
          {calculation && step ? (
            <>
              <Section
                title={`${
                  methodInfo(calculation.problem.method).title
                } · step ${step.index}`}
              >
                <Text
                  selectable
                  style={[styles.formula, { color: colors.secondary }]}
                >
                  {step.formula}
                </Text>
                <Body>{step.explanation}</Body>
              </Section>
              <Section title="Values in this row">
                {calculation.columns.map((column, index) => {
                  const cell = step.cells[index];
                  return (
                    <View
                      key={`${column}-${index}`}
                      style={[
                        styles.valueRow,
                        { borderBottomColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.label, { color: colors.muted }]}>
                        {column}
                      </Text>
                      <Text
                        selectable
                        style={[styles.value, { color: colors.text }]}
                      >
                        {typeof cell === 'number'
                          ? formatNumber(cell, calculation.problem.precision)
                          : cell ?? '—'}
                      </Text>
                    </View>
                  );
                })}
              </Section>
              <Notice message="This explanation comes from the numerical method and the recorded calculation. It is not a live AI response." />
            </>
          ) : (
            <Body muted>
              Calculate a problem and select a recorded step to see its
              explanation.
            </Body>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 20, gap: 18, paddingBottom: 32 },
  formula: typeScale.math,
  valueRow: {
    minHeight: 42,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  label: typeScale.caption,
  value: { ...typeScale.numericSmall, ...tabular },
});
