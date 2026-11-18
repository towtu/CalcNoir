import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { methodInfo } from '../../core/methods';
import type { Problem } from '../../core/numerics/types';
import { tabular, typeScale, useTheme } from '../../shared/theme';
import { Body, Disclosure, Section } from '../../shared/ui';
import { problemPreview } from './page';

export function ProblemSummary({ problem }: { problem: Problem }) {
  const { colors } = useTheme();
  return (
    <Section title={methodInfo(problem.method).title}>
      <Text selectable style={[styles.expression, { color: colors.text }]}>
        {problemPreview(problem)}
      </Text>
      {problem.kind === 'root' ? (
        <>
          <Body muted>
            {problem.method === 'bisection'
              ? `Bracket ${problem.a} to ${problem.b}`
              : problem.method === 'secant'
              ? `Starting guesses ${problem.x0} and ${problem.x1}`
              : `Starting guess ${problem.x0}`}
          </Body>
          {problem.method === 'fixed-point' ? (
            <Body muted>{`g(x) = ${problem.gExpression ?? ''}`}</Body>
          ) : null}
        </>
      ) : (
        <Disclosure title="Point data">
          <Text selectable style={[styles.points, { color: colors.text }]}>
            {problem.points.map(point => `(${point.x}, ${point.y})`).join('\n')}
          </Text>
        </Disclosure>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  expression: typeScale.math,
  points: { ...typeScale.numericSmall, ...tabular },
});
