import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Calculation } from '../../core/numerics/types';
import { Body, Button, Disclosure, Heading, Screen } from '../../shared/ui';
import { stepValue } from './stepValue';
import { CalculationGraph } from './components/CalculationGraph';

export function GraphScreen({
  calculation,
  initialStep = 0,
}: {
  calculation: Calculation;
  initialStep?: number;
}) {
  const lastStep = Math.max(0, calculation.steps.length - 1);
  const [position, setPosition] = useState(() =>
    Math.max(
      0,
      Math.min(
        lastStep,
        Number.isFinite(initialStep) ? Math.trunc(initialStep) : 0,
      ),
    ),
  );
  const [playing, setPlaying] = useState(false);
  const selected = Math.min(position, lastStep);
  const step = calculation.steps[selected];
  const currentValue = step ? stepValue(calculation, step) : null;

  useEffect(() => {
    if (!playing || selected >= lastStep) {
      return;
    }
    const timer = setTimeout(() => {
      const next = selected + 1;
      setPosition(next);
      if (next >= lastStep) {
        setPlaying(false);
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [playing, selected, lastStep]);

  const selectStep = (next: number) => {
    setPlaying(false);
    setPosition(Math.max(0, Math.min(lastStep, next)));
  };

  return (
    <Screen>
      <Heading title="Sampled curve" />
      <CalculationGraph calculation={calculation} step={step} interactive />
      {step ? (
        <>
          <Body muted>
            Step {step.index} of {calculation.steps.length} ·{' '}
            {currentValue?.label} = {currentValue?.formatted}
          </Body>
          <View style={styles.controls}>
            <Button
              label="Previous step"
              tone="secondary"
              disabled={selected === 0}
              onPress={() => selectStep(selected - 1)}
            />
            <Button
              label={
                playing
                  ? 'Pause steps'
                  : selected >= lastStep && lastStep > 0
                  ? 'Replay steps'
                  : 'Play steps'
              }
              disabled={lastStep === 0}
              onPress={() => {
                if (selected >= lastStep && lastStep > 0) {
                  setPosition(0);
                  setPlaying(true);
                } else setPlaying(value => !value);
              }}
            />
            <Button
              label="Next step"
              tone="secondary"
              disabled={selected >= lastStep}
              onPress={() => selectStep(selected + 1)}
            />
          </View>
          <Disclosure title="Step details">
            <Body>{step.formula}</Body>
            <Body>{step.explanation}</Body>
          </Disclosure>
        </>
      ) : (
        <Body muted>No recorded steps for this calculation.</Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
