import React, { useMemo, useState } from 'react';
import { methodInfo } from '../../core/methods';
import type { MethodId } from '../../core/numerics/types';
import { allQuestions, lessonFor } from '../learn/lessons';
import {
  Body,
  Button,
  Field,
  Heading,
  Notice,
  Screen,
  Section,
} from '../../shared/ui';

/**
 * Practice for one method at a time.
 *
 * Questions belong to their lesson rather than to a single shared pile, so
 * finishing a lesson leads straight into drilling that method. Passing no
 * method keeps the old behaviour — every question, in method order — for the
 * general practice entry on Learn.
 */
export function PracticeScreen({ method }: { method?: MethodId } = {}) {
  const questions = useMemo(
    () =>
      method
        ? lessonFor(method).quiz.map(question => ({ ...question, method }))
        : allQuestions(),
    [method],
  );

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [correct, setCorrect] = useState(false);
  const [hint, setHint] = useState(false);

  const exercise = questions[index];

  const check = () => {
    if (!answer.trim() || !Number.isFinite(Number(answer))) {
      setCorrect(false);
      setFeedback('Enter a finite number first.');
      return;
    }
    const good =
      Math.abs(Number(answer) - exercise.answer) < (exercise.tolerance ?? 1e-6);
    setCorrect(good);
    setFeedback(
      good
        ? `Exactly. ${exercise.explanation}`
        : 'Try again. Think through the substitution one operation at a time.',
    );
  };

  return (
    <Screen>
      <Heading
        title="Your turn."
        subtitle={
          method
            ? `${methodInfo(method).title} · a little practice makes the steps stick.`
            : 'A little practice makes the steps stick.'
        }
      />
      <Notice
        message={`${methodInfo(exercise.method).title} · Exercise ${
          index + 1
        } of ${questions.length}`}
      />
      <Section title={exercise.prompt}>
        <Body>{exercise.question}</Body>
        <Field
          label="Your answer"
          numeric
          mono
          value={answer}
          onChangeText={value => {
            setAnswer(value);
            setFeedback(null);
            setCorrect(false);
          }}
          placeholder="Enter your estimate"
          onSubmitEditing={check}
        />
        <Button label="Check my answer" onPress={check} />
        {feedback ? (
          <Notice message={feedback} tone={correct ? 'info' : 'warning'} />
        ) : null}
        <Button
          label={hint ? 'Hide the hint' : 'A small hint'}
          tone="quiet"
          onPress={() => setHint(!hint)}
        />
        {hint ? <Body muted>{exercise.hint}</Body> : null}
      </Section>
      <Button
        label="Next exercise"
        tone="secondary"
        onPress={() => {
          setIndex((index + 1) % questions.length);
          setAnswer('');
          setFeedback(null);
          setHint(false);
        }}
      />
      <Body muted>
        Practice works offline. Answers are checked against the exercise, with
        no AI request.
      </Body>
    </Screen>
  );
}
