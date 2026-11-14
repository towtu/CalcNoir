import React from 'react';
import { ActionRow, Heading, Screen } from '../../shared/ui';
export function LearnScreen({
  onGuide,
  onPractice,
}: {
  onGuide: () => void;
  onPractice: () => void;
}) {
  return (
    <Screen>
      <Heading
        title="Learn at your pace"
        subtitle="A quick introduction and a little practice."
      />
      <ActionRow
        title="Getting started"
        subtitle="Learn the flow with a worked example."
        onPress={onGuide}
      />
      <ActionRow
        title="Practice"
        subtitle="Three short exercises with feedback."
        onPress={onPractice}
      />
    </Screen>
  );
}
