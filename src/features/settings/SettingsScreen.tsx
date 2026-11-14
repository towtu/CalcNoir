import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../shared/theme';
import { ThemeToggle } from '../../shared/ui/ThemeToggle';
import {
  Body,
  Brand,
  Button,
  Heading,
  Notice,
  Screen,
  Section,
} from '../../shared/ui';
export function SettingsScreen({ onTutorial }: { onTutorial?: () => void }) {
  const { isDark, toggleTheme, storageWarning } = useTheme();
  return (
    <Screen>
      <Heading title="Settings" />
      <Section title="Appearance">
        <View style={styles.row}>
          <View style={styles.grow}>
            <Body>{isDark ? 'Dark theme' : 'Light theme'}</Body>
            <Body muted>Remembered on this device.</Body>
          </View>
          <ThemeToggle value={isDark} onValueChange={toggleTheme} />
        </View>
        {storageWarning ? (
          <Notice message={storageWarning} tone="warning" />
        ) : null}
      </Section>
      <Section title="Help">
        <Button
          label="Replay tutorial"
          tone="secondary"
          disabled={!onTutorial}
          onPress={() => onTutorial?.()}
        />
      </Section>
      <Section title="Accuracy & rounding">
        <Body muted>
          Display decimal places affect what you see. The solver keeps unrounded
          values during calculation. Always check the convergence status,
          residual, and stopping explanation.
        </Body>
      </Section>
      <Section title="AI explanations">
        <Body muted>
          Planned as the final feature. Current step explanations are built into
          the numerical engine and work offline. No AI service is connected.
        </Body>
      </Section>
      <Section title="Your notebook">
        <Body muted>
          Saved equations and data stay on this device. There is no account or
          cloud sync. Use the system share sheet to send a readable solution
          when you choose.
        </Body>
      </Section>
      <Section>
        <Brand />
        <Body muted>
          Six numerical methods, one space to understand them. Version 1.0.0.
        </Body>
      </Section>
    </Screen>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
  },
  grow: { flex: 1, minWidth: 160 },
});
