import React, { useRef, useState } from 'react';
import { calculate } from '../../core/numerics';
import { defaultProblem, methodInfo } from '../../core/methods';
import type { Calculation, Problem } from '../../core/numerics/types';
import { Button, Heading, Notice, Screen } from '../../shared/ui';
import { draftFor, problemFor } from './draft';
import { ProblemEditor } from './components/ProblemEditor';

export interface SolverScreenProps {
  initialProblem?: Problem;
  onCalculated: (calculation: Calculation) => void;
}
export function SolverScreen({
  initialProblem = defaultProblem(),
  onCalculated,
}: SolverScreenProps) {
  const [draft, setDraft] = useState(() => draftFor(initialProblem));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);
  const mounted = useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const run = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    try {
      if (!mounted.current) return;
      const result = calculate(problemFor(draft));
      if (mounted.current) onCalculated(result);
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Check your equation and numerical inputs.',
        );
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <Screen>
      <Heading
        title="Your problem"
        subtitle={
          methodInfo(draft.method).category === 'root'
            ? 'Enter an equation and starting values.'
            : 'Enter your points and the x value to estimate.'
        }
      />
      <ProblemEditor
        draft={draft}
        disabled={busy}
        onChange={next => {
          setDraft(next);
          setError('');
        }}
        onPreset={problem => {
          setDraft(draftFor(problem));
          setError('');
        }}
      />
      {error ? (
        <Notice tone="error" message={`Input needs attention: ${error}`} />
      ) : null}
      <Button
        label={busy ? 'Calculating…' : 'Calculate'}
        busy={busy}
        onPress={run}
      />
    </Screen>
  );
}
