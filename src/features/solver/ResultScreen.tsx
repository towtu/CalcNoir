import React, { useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, Text } from 'react-native';
import type { Calculation } from '../../core/numerics/types';
import { methodInfo } from '../../core/methods';
import {
  ActionRow,
  Body,
  Button,
  Disclosure,
  Heading,
  Notice,
  Screen,
  Section,
} from '../../shared/ui';
import { calculationReport, formatNumber } from '../../shared/ui/format';
import { tabular, typeScale, useTheme } from '../../shared/theme';

export interface ResultScreenProps {
  calculation: Calculation;
  savedId?: string;
  notebookReadOnly: boolean;
  notebookWarning?: string | null;
  onSave: () => void;
  onSteps: () => void;
  onGraph: () => void;
  onTable: () => void;
  onCompare: () => void;
}
export function ResultScreen({
  calculation,
  savedId,
  notebookReadOnly,
  notebookWarning,
  onSave,
  onSteps,
  onGraph,
  onTable,
  onCompare,
}: ResultScreenProps) {
  const { colors } = useTheme();
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const sharingRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const failed = calculation.status === 'failed';
  const root = calculation.problem.kind === 'root';
  const share = async () => {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);
    setError('');
    try {
      await Share.share({
        title: 'Numelix calculation',
        message: calculationReport(calculation),
      });
    } catch {
      if (mounted.current)
        setError('The share sheet could not open. Your result is still here.');
    } finally {
      sharingRef.current = false;
      if (mounted.current) setSharing(false);
    }
  };
  return (
    <Screen>
      <Heading
        title={failed ? 'Calculation stopped' : 'Your answer'}
        subtitle={methodInfo(calculation.problem.method).title}
      />
      <Section>
        <Text
          accessibilityLiveRegion="polite"
          selectable
          style={[styles.value, { color: colors.text }]}
        >
          {formatNumber(calculation.value, calculation.problem.precision)}
        </Text>
        <Body muted>
          {root
            ? failed
              ? 'Last estimate · not converged'
              : 'Root estimate · converged'
            : failed
            ? 'No reliable interpolated value'
            : `Value at x = ${
                calculation.problem.kind === 'interpolation'
                  ? calculation.problem.targetX
                  : '—'
              }`}
        </Body>
        {root && calculation.residual !== null ? (
          <Body muted>
            Residual |f(x)| ={' '}
            {formatNumber(calculation.residual, calculation.problem.precision)}
          </Body>
        ) : null}
      </Section>
      <Notice
        message={calculation.message}
        tone={failed ? 'warning' : 'info'}
      />
      {calculation.steps.length ? (
        <ActionRow
          title="View steps"
          subtitle={`${calculation.steps.length} recorded steps, one at a time.`}
          onPress={onSteps}
        />
      ) : (
        <Body muted>
          {failed
            ? 'No steps were recorded before the calculation stopped.'
            : 'Your starting value already satisfies the equation. No iteration was needed.'}
        </Body>
      )}
      {calculation.curve.some(point => point.y !== null) ? (
        <ActionRow
          title="Explore graph"
          subtitle="Inspect values, zoom and play the steps."
          onPress={onGraph}
        />
      ) : null}
      {notebookReadOnly ? (
        <Notice
          tone="warning"
          message={
            notebookWarning ||
            'Your notebook is read-only. Its original data is preserved.'
          }
        />
      ) : null}
      <Button
        label={savedId ? 'Update saved page' : 'Save problem'}
        disabled={notebookReadOnly}
        onPress={() => {
          if (!notebookReadOnly) onSave();
        }}
      />
      <Disclosure title="More actions">
        <Button
          label="View table"
          tone="secondary"
          disabled={!calculation.steps.length}
          onPress={onTable}
        />
        <Button label="Compare methods" tone="secondary" onPress={onCompare} />
        <Button
          label="Share calculation"
          tone="quiet"
          busy={sharing}
          onPress={share}
        />
        <Body muted>
          Display rounding changes what you see, not the calculation's internal
          precision.
        </Body>
      </Disclosure>
      {error ? <Notice tone="error" message={error} /> : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  value: { ...typeScale.display, ...tabular, lineHeight: 44 },
});
