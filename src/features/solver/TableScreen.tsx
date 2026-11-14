import React from 'react';
import type { Calculation } from '../../core/numerics/types';
import { Heading, Screen } from '../../shared/ui';
import { StepTable } from './components/StepTable';
export function TableScreen({
  calculation,
  onStep,
}: {
  calculation: Calculation;
  onStep: (step: number) => void;
}) {
  return (
    <Screen>
      <Heading
        title="Calculation table"
        subtitle="Swipe across for more columns. Tap a row to inspect its step."
      />
      <StepTable calculation={calculation} selected={-1} onSelect={onStep} />
    </Screen>
  );
}
