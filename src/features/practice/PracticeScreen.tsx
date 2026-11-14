import React, { useState } from 'react';
import {
  Body,
  Button,
  Field,
  Heading,
  Notice,
  Screen,
  Section,
} from '../../shared/ui';
const exercises = [
  {
    method: 'Bisection',
    title: 'Find the first midpoint.',
    question: 'For f(x) = x³ − x − 2 on [1, 2], what is c = (a + b) / 2?',
    answer: 1.5,
    hint: 'Add 1 and 2, then divide by 2.',
    explanation:
      '(1 + 2) / 2 = 1.5. Next, evaluate f(1.5) to choose which half to keep.',
  },
  {
    method: 'Interpolation',
    title: 'Recognize the pattern.',
    question:
      'The points (0, 1), (1, 3), and (2, 5) lie on a line. What is P(1.5)?',
    answer: 4,
    hint: 'The value increases by 2 each time x increases by 1.',
    explanation: 'The polynomial is P(x) = 2x + 1, so P(1.5) = 4.',
  },
  {
    method: 'Fixed-Point',
    title: 'Make one substitution.',
    question: 'With g(x) = cos(x) and x₀ = 0 radians, what is x₁?',
    answer: 1,
    hint: 'Use x₁ = g(x₀). Cosine of zero is 1.',
    explanation:
      'x₁ = cos(0) = 1. The result becomes the next input; it is not the final fixed point yet.',
  },
];
export function PracticeScreen() {
  const [index, setIndex] = useState(0),
    [answer, setAnswer] = useState(''),
    [feedback, setFeedback] = useState<string | null>(null),
    [correct, setCorrect] = useState(false),
    [hint, setHint] = useState(false);
  const exercise = exercises[index];
  const check = () => {
    if (!answer.trim() || !Number.isFinite(Number(answer))) {
      setCorrect(false);
      setFeedback('Enter a finite number first.');
      return;
    }
    const good = Math.abs(Number(answer) - exercise.answer) < 1e-6;
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
        subtitle="A little practice makes the steps stick."
      />
      <Notice
        message={`${exercise.method} · Exercise ${index + 1} of ${
          exercises.length
        }`}
      />
      <Section title={exercise.title}>
        <Body>{exercise.question}</Body>
        <Field
          label="Your answer"
          numeric
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
          setIndex((index + 1) % exercises.length);
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
