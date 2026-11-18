import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Calculation } from '../../../core/numerics/types';
import { brandFace, tabular, typeScale, useTheme } from '../../../shared/theme';
import { Body } from '../../../shared/ui';
import { formatNumber } from '../../../shared/ui/format';

export function StepTable({
  calculation,
  selected,
  onSelect,
}: {
  calculation: Calculation;
  selected: number;
  onSelect: (index: number) => void;
}) {
  const { colors } = useTheme();
  if (!calculation.steps.length) {
    return (
      <Body muted>
        {calculation.status === 'failed'
          ? 'No iteration rows were recorded before computation stopped.'
          : 'No iteration rows were needed. The supplied starting value is already an exact root.'}
      </Body>
    );
  }
  const precision = calculation.problem.precision;
  return (
    <View style={styles.container}>
      <Body muted>
        Swipe across to see every column. Tap a row to inspect that step.
      </Body>
      <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
        <View>
          <View style={[styles.row, { backgroundColor: colors.surfaceAlt }]}>
            {calculation.columns.map((column, index) => (
              <Text
                key={`${column}-${index}`}
                style={[styles.cell, styles.heading, { color: colors.muted }]}
              >
                {column}
              </Text>
            ))}
          </View>
          {calculation.steps.map((step, index) => (
            <Pressable
              key={step.index}
              accessibilityRole="button"
              accessibilityLabel={`Show step ${step.index}: ${step.cells
                .map(cell =>
                  typeof cell === 'number'
                    ? formatNumber(cell, precision)
                    : cell ?? 'unavailable',
                )
                .join(', ')}`}
              accessibilityState={{ selected: selected === index }}
              onPress={() => onSelect(index)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor:
                    selected === index ? colors.secondarySoft : colors.surface,
                  borderBottomColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {step.cells.map((cell, column) => (
                <Text
                  key={column}
                  selectable={false}
                  style={[
                    styles.cell,
                    {
                      color:
                        selected === index ? colors.secondary : colors.text,
                    },
                    selected === index ? styles.selected : undefined,
                  ]}
                >
                  {typeof cell === 'number'
                    ? formatNumber(cell, precision)
                    : cell ?? '—'}
                </Text>
              ))}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: 12 },
  row: {
    flexDirection: 'row',
    minHeight: 46,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    width: 116,
    paddingHorizontal: 12,
    paddingVertical: 12,
    ...typeScale.numericSmall,
    ...tabular,
    fontSize: 11,
    lineHeight: 16,
  },
  heading: typeScale.caption,
  selected: brandFace('inter', 'semibold'),
});
