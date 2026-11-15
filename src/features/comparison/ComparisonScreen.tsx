import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { calculate } from '../../core/numerics';
import type { Calculation, MethodId, Problem } from '../../core/numerics/types';
import { METHODS, defaultProblem, methodInfo } from '../../core/methods';
import {
  Body,
  Button,
  Heading,
  Notice,
  Screen,
  Section,
} from '../../shared/ui';
import { describeExpression, formatNumber } from '../../shared/ui/format';
import { useTheme } from '../../shared/theme';

interface Comparison {
  method: MethodId;
  problem: Problem;
  calculation: Calculation | null;
  error: string | null;
}
export function ComparisonScreen({
  problem,
  onOpen,
}: {
  problem?: Problem;
  onOpen: (problem: Problem) => void;
}) {
  const { colors } = useTheme();
  const [results, setResults] = useState<Comparison[]>([]),
    [busy, setBusy] = useState(true);
  const selected = problem || defaultProblem();
  useEffect(() => {
    setBusy(true);
    let mounted = true;
    const task = setTimeout(() => {
      const input = problem || defaultProblem();
      const items = METHODS.filter(
        method => method.category === input.kind,
      ).map(method => {
        const candidate = { ...input, method: method.id } as Problem;
        try {
          return {
            method: method.id,
            problem: candidate,
            calculation: calculate(candidate),
            error: null,
          };
        } catch (error: unknown) {
          return {
            method: method.id,
            problem: candidate,
            calculation: null,
            error:
              error instanceof Error
                ? error.message
                : 'This method cannot use those inputs.',
          };
        }
      });
      if (mounted) {
        setResults(items);
        setBusy(false);
      }
    }, 16);
    return () => {
      mounted = false;
      clearTimeout(task);
    };
  }, [problem]);
  return (
    <Screen>
      <Heading
        title="Different paths."
        subtitle="Compare the same problem across compatible methods."
      />
      <Notice
        message={
          selected.kind === 'root'
            ? describeExpression(selected.expression)
            : `${selected.points.length} coordinate pairs · target x = ${selected.targetX}`
        }
      />
      <Body muted>
        Initial settings come from your problem. Fixed-Point needs its own
        equivalent g(x). A failed method stays visible.
      </Body>
      {busy ? (
        <ActivityIndicator
          color={colors.accent}
          accessibilityLabel="Comparing methods"
        />
      ) : (
        results.map(item => (
          <Section key={item.method} title={methodInfo(item.method).title}>
            {item.calculation ? (
              <>
                <View style={styles.metrics}>
                  <View>
                    <Text style={[styles.value, { color: colors.text }]}>
                      {formatNumber(item.calculation.value, selected.precision)}
                    </Text>
                    <Text style={[styles.small, { color: colors.muted }]}>
                      {item.calculation.steps.length} steps ·{' '}
                      {item.calculation.functionEvaluations} evaluations
                      {item.calculation.observedOrder === null
                        ? ''
                        : ` · order p ≈ ${item.calculation.observedOrder.toFixed(
                            2,
                          )}`}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.status,
                      {
                        color:
                          item.calculation.status === 'failed'
                            ? colors.warning
                            : colors.secondary,
                      },
                    ]}
                  >
                    {item.calculation.status === 'failed'
                      ? 'Not converged'
                      : item.calculation.status === 'calculated'
                      ? 'Calculated'
                      : 'Converged'}
                  </Text>
                </View>
                <Body muted>{item.calculation.message}</Body>
                <Button
                  label="View these steps"
                  tone="secondary"
                  onPress={() => onOpen(item.problem)}
                />
              </>
            ) : (
              <Notice
                message={item.error || 'Check the method inputs.'}
                tone="warning"
              />
            )}
          </Section>
        ))
      )}
      <Body muted>
        Fewer iterations do not always mean less work. Newton also evaluates a
        derivative. These methods may find different roots when more than one
        root exists.
      </Body>
    </Screen>
  );
}
const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  value: { fontSize: 25, fontVariant: ['tabular-nums'], fontWeight: '600' },
  small: { fontSize: 11, lineHeight: 18, marginTop: 5 },
  status: { fontSize: 11, fontWeight: '600' },
});
