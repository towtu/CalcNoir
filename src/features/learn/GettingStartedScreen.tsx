import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { methodInfo, presetsFor } from '../../core/methods';
import { calculate } from '../../core/numerics';
import type { Calculation, MethodId } from '../../core/numerics/types';
import { Body, Brand, Button, Heading, Notice, Screen } from '../../shared/ui';
import { useReducedMotion } from '../../shared/ui/useReducedMotion';
import { useTheme } from '../../shared/theme';
import { formatNumber } from '../../shared/ui/format';
import { MethodChoices } from '../methods/MethodsScreen';
import { ProblemEditor } from '../solver/components/ProblemEditor';
import { draftFor, problemFor } from '../solver/draft';

export function GettingStartedScreen({
  onComplete,
  onSkip,
  warning,
}: {
  onComplete: (calculation: Calculation) => void;
  onSkip: () => void;
  warning?: string | null;
}) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const entrance = useRef(new Animated.Value(1)).current;
  const [stage, setStage] = useState(0);
  const [draft, setDraft] = useState<ReturnType<typeof draftFor> | null>(null);
  const [result, setResult] = useState<Calculation | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (reducedMotion) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, stage, reducedMotion]);
  const back = () => {
    setError(null);
    setStage(value => Math.max(0, value - 1));
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (Keyboard.isVisible() || TextInput.State.currentlyFocusedInput()) {
          Keyboard.dismiss();
          return true;
        }
        if (stage === 0) return false;
        setError(null);
        setStage(value => value - 1);
        return true;
      },
    );
    return () => subscription.remove();
  }, [stage]);
  const choose = (method: MethodId) => {
    setDraft(current =>
      current?.method === method
        ? current
        : draftFor(
            presetsFor(method)[methodInfo(method).category === 'root' ? 2 : 0]
              .problem,
          ),
    );
    setError(null);
  };
  const solve = () => {
    if (!draft) return;
    try {
      const calculation = calculate(problemFor(draft));
      setResult(calculation);
      setError(null);
      setStage(2);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Check your values and try again.',
      );
    }
  };
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            opacity: entrance,
            transform: [
              {
                translateX: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Screen key={stage}>
          <Brand compact />
          <View style={styles.progressHeader}>
            <Body muted>Getting started</Body>
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.progressText, { color: colors.text }]}
            >
              {`Step ${stage + 1} of 3`}
            </Text>
          </View>
          <View accessible={false} style={styles.progressTrack}>
            {[0, 1, 2].map(index => (
              <View
                key={index}
                style={[
                  styles.progressSegment,
                  {
                    backgroundColor:
                      index <= stage ? colors.text : colors.border,
                  },
                ]}
              />
            ))}
          </View>
          {warning ? <Notice tone="warning" message={warning} /> : null}
          {error ? <Notice tone="error" message={error} /> : null}
          {stage === 0 ? (
            <>
              <Heading
                title="What will you solve?"
                subtitle="Choose a method to try. We’ll start with an editable example."
              />
              <MethodChoices onChoose={choose} selectedMethod={draft?.method} />
            </>
          ) : stage === 1 && draft ? (
            <>
              <Heading
                title="Enter your values"
                subtitle={`${
                  methodInfo(draft.method).title
                } · Change the example or calculate it as it is.`}
              />
              <ProblemEditor
                draft={draft}
                disabled={false}
                onChange={setDraft}
                onPreset={problem => setDraft(draftFor(problem))}
              />
            </>
          ) : result ? (
            <>
              <Heading
                title={
                  result.status === 'failed'
                    ? 'Check the result'
                    : 'Your first result'
                }
                subtitle={methodInfo(result.problem.method).title}
              />
              {result.value !== null && Number.isFinite(result.value) ? (
                <Text
                  selectable
                  style={[styles.answer, { color: colors.text }]}
                >
                  {formatNumber(result.value, result.problem.precision)}
                </Text>
              ) : null}
              <Notice
                tone={result.status === 'failed' ? 'warning' : 'info'}
                message={result.message}
              />
              <Body>
                Open your result to move through each step, explore the graph,
                or save this problem to your notebook.
              </Body>
            </>
          ) : null}
          {stage === 0 ? (
            <Body muted>
              No account needed. Replay this anytime in Settings.
            </Body>
          ) : null}
        </Screen>
      </Animated.View>
      <SafeAreaView
        edges={['bottom', 'left', 'right']}
        style={[styles.footer, { borderTopColor: colors.border }]}
      >
        <View style={styles.footerRow}>
          {stage > 0 ? (
            <Button label="Back" tone="secondary" onPress={back} />
          ) : null}
          <View style={styles.primaryAction}>
            <Button
              label={
                stage === 0
                  ? 'Next'
                  : stage === 1
                  ? 'Calculate'
                  : 'Open my result'
              }
              disabled={!draft}
              onPress={() => {
                if (stage === 0) setStage(1);
                else if (stage === 1) solve();
                else if (result) onComplete(result);
              }}
            />
          </View>
          <Button
            label="Skip"
            accessibilityLabel="Skip tutorial"
            tone="quiet"
            onPress={onSkip}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  primaryAction: { flex: 1, minWidth: 64 },
  progressHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressText: { fontSize: 14, lineHeight: 24, fontWeight: '600' },
  progressTrack: { flexDirection: 'row', gap: 8 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  answer: {
    fontSize: 36,
    lineHeight: 48,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
