import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle, TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.fill, { backgroundColor: colors.background }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, style]}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Heading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.headingRow}>
      <View style={styles.grow}>
        <Text
          accessibilityRole="header"
          style={[styles.heading, { color: colors.text }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.brand}>
      <Image
        source={require('../assets/logo.png')}
        style={[styles.logo, compact ? styles.logoCompact : undefined]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.grow}>
        <Text
          accessibilityRole="header"
          style={[styles.brandName, { color: colors.text }]}
        >
          CalcNoir
        </Text>
        {compact ? null : (
          <Text style={[styles.brandLine, { color: colors.muted }]}>
            Numerical methods, clearly.
          </Text>
        )}
      </View>
    </View>
  );
}
export function Section({
  children,
  title,
  style,
}: {
  children: React.ReactNode;
  title?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {title ? (
        <Text
          accessibilityRole="header"
          style={[styles.sectionTitle, { color: colors.text }]}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
export function Body({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.body, { color: muted ? colors.muted : colors.text }]}>
      {children}
    </Text>
  );
}
export function Button({
  label,
  onPress,
  tone = 'primary',
  disabled = false,
  busy = false,
  testID,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const color =
    tone === 'primary'
      ? colors.onPrimary
      : tone === 'secondary'
      ? colors.secondary
      : colors.accent;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor:
            tone === 'primary'
              ? colors.primary
              : tone === 'secondary'
              ? colors.secondarySoft
              : colors.surfaceAlt,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {busy ? <ActivityIndicator color={color} size="small" /> : null}
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  hint,
  numeric = false,
  ...props
}: TextInputProps & { label: string; hint?: string; numeric?: boolean }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        autoCapitalize="none"
        keyboardType={numeric ? 'numbers-and-punctuation' : 'default'}
        {...props}
        onFocus={event => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={event => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: focused ? colors.accent : colors.inputBorder,
          },
          props.multiline ? styles.multiline : undefined,
          props.style,
        ]}
      />
      {hint ? (
        <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}
export function Notice({
  message,
  tone = 'info',
}: {
  message: string;
  tone?: 'info' | 'error' | 'warning';
}) {
  const { colors } = useTheme();
  const backgroundColor =
    tone === 'error'
      ? colors.dangerSoft
      : tone === 'warning'
      ? colors.warningSoft
      : colors.secondarySoft;
  const color =
    tone === 'error'
      ? colors.danger
      : tone === 'warning'
      ? colors.warning
      : colors.secondary;
  return (
    <View style={[styles.notice, { backgroundColor }]}>
      <Text
        accessibilityRole={tone === 'error' ? 'alert' : 'text'}
        accessibilityLiveRegion="polite"
        style={[styles.noticeText, { color }]}
      >
        {tone === 'error' ? 'Error: ' : tone === 'warning' ? 'Note: ' : ''}
        {message}
      </Text>
    </View>
  );
}
export function Disclosure({
  title,
  children,
  initiallyOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const { colors } = useTheme();
  return (
    <View style={open ? styles.disclosureOpen : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(value => !value)}
        style={[styles.disclosure, { borderColor: colors.border }]}
      >
        <Text style={[styles.label, styles.grow, { color: colors.text }]}>
          {title}
        </Text>
        <Text
          accessible={false}
          style={[styles.disclosureSymbol, { color: colors.text }]}
        >
          {open ? '−' : '+'}
        </Text>
      </Pressable>
      {open ? children : null}
    </View>
  );
}
export function ActionRow({
  title,
  subtitle,
  onPress,
  accessibilityLabel,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        compact ? styles.actionRowCompact : undefined,
        {
          borderBottomColor: colors.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.actionCopy}>
        <Text style={[styles.actionTitle, { color: colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.actionSubtitle, { color: colors.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text
        accessible={false}
        style={[styles.actionArrow, { color: colors.muted }]}
      >
        ›
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  fill: { flex: 1 },
  disclosureOpen: { gap: 16 },
  disclosureSymbol: { fontSize: 22 },
  actionCopy: { flex: 1, gap: 4 },
  actionTitle: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  actionSubtitle: { fontSize: 13, lineHeight: 20 },
  actionArrow: { fontSize: 24 },
  disclosure: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionRowCompact: { minHeight: 56, paddingVertical: 12 },
  actionRow: {
    minHeight: 72,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    padding: 20,
    gap: 16,
    paddingBottom: 32,
  },
  grow: { flex: 1 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heading: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  subtitle: { fontSize: 13, lineHeight: 20, marginTop: 8 },
  section: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 24,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  body: { fontSize: 16, lineHeight: 24 },
  button: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  field: { gap: 8, flexGrow: 1 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  multiline: { minHeight: 136, textAlignVertical: 'top' },
  hint: { fontSize: 12, lineHeight: 18 },
  notice: { padding: 16, borderRadius: 8 },
  noticeText: { fontSize: 14, lineHeight: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#111111' },
  logoCompact: { width: 32, height: 32 },
  brandName: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  brandLine: { fontSize: 12, lineHeight: 18, marginTop: 4 },
});
