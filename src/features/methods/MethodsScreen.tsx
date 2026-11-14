import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { METHODS } from '../../core/methods';
import type { MethodId } from '../../core/numerics/types';
import { Brand, Notice, Screen } from '../../shared/ui';
import { useTheme } from '../../shared/theme';

const methodArtwork: Record<MethodId, ImageSourcePropType> = {
  bisection: require('../../shared/assets/methods/bisection.png'),
  newton: require('../../shared/assets/methods/newton.png'),
  secant: require('../../shared/assets/methods/secant.png'),
  'fixed-point': require('../../shared/assets/methods/fixed-point.png'),
  'newton-divided': require('../../shared/assets/methods/newton-divided.png'),
  lagrange: require('../../shared/assets/methods/lagrange.png'),
};

const inputHints: Record<MethodId, string> = {
  bisection: 'Equation · lower and upper bounds',
  newton: 'Equation · one starting guess',
  secant: 'Equation · two starting guesses',
  'fixed-point': 'Equation · mapping · starting guess',
  'newton-divided': 'Point pairs · target x',
  lagrange: 'Point pairs · target x',
};

export function MethodsScreen({
  onChoose,
  warning,
  picker = false,
  selectedMethod,
}: {
  onChoose: (method: MethodId) => void;
  warning?: string | null;
  picker?: boolean;
  selectedMethod?: MethodId;
}) {
  const { colors } = useTheme();
  return (
    <Screen style={styles.content}>
      {picker ? null : <Brand compact />}
      {warning ? <Notice tone="warning" message={warning} /> : null}
      <Text
        accessibilityRole="header"
        style={[styles.heading, { color: colors.text }]}
      >
        Choose a method
      </Text>
      <MethodChoices
        onChoose={onChoose}
        selectedMethod={picker ? selectedMethod : undefined}
      />
    </Screen>
  );
}
export function MethodChoices({
  onChoose,
  selectedMethod,
}: {
  onChoose: (method: MethodId) => void;
  selectedMethod?: MethodId;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.choices}>
      {(['root', 'interpolation'] as const).map(category => (
        <View key={category}>
          <Text
            accessibilityRole="header"
            style={[styles.groupTitle, { color: colors.muted }]}
          >
            {category === 'root' ? 'Root finding' : 'Interpolation'}
          </Text>
          {METHODS.filter(method => method.category === category).map(
            method => {
              const selected = selectedMethod === method.id;
              return (
                <Pressable
                  key={method.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${method.title}`}
                  accessibilityHint={inputHints[method.id]}
                  accessibilityState={{ selected }}
                  onPress={() => onChoose(method.id)}
                  style={({ pressed }) => [
                    styles.methodRow,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: selected
                        ? colors.surfaceAlt
                        : colors.surface,
                      opacity: pressed ? 0.65 : 1,
                    },
                  ]}
                >
                  <Image
                    accessible={false}
                    source={methodArtwork[method.id]}
                    style={styles.methodImage}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                  <View style={styles.copy}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[styles.methodTitle, { color: colors.text }]}
                      >
                        {method.title.replace(/-/g, '-\u200b')}
                      </Text>
                      {selected ? (
                        <Text style={[styles.current, { color: colors.text }]}>
                          Current
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.hint,
                        { color: selected ? colors.text : colors.muted },
                      ]}
                    >
                      {inputHints[method.id]}
                    </Text>
                  </View>
                  <Text
                    accessible={false}
                    allowFontScaling={false}
                    style={[styles.arrow, { color: colors.muted }]}
                  >
                    ›
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 16 },
  choices: { gap: 16 },
  heading: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  groupTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  methodRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  methodImage: { width: 48, height: 48, borderRadius: 8 },
  copy: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  methodTitle: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  current: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  hint: { fontSize: 12, lineHeight: 18 },
  arrow: { fontSize: 24, lineHeight: 32 },
});
