import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle, TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ICONS } from '../assets/icons';
import Svg, { Path } from 'react-native-svg';
import { Logomark } from '../assets/Logomark';
import { Wordmark } from '../assets/Wordmark';
import { minTouch, radius, space, tabular, typeScale, useTheme } from '../theme';

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={styles.fill}
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
      <Logomark size={compact ? 38 : 48} />
      <View style={styles.grow}>
        <View accessibilityRole="header" accessibilityLabel="Numelix">
          {/* Proportions follow the brand's horizontal lockup: the mark is
              0.39x the wordmark, set a third of a mark-width apart. */}
          <Wordmark width={compact ? 98 : 124} color={colors.text} />
        </View>
        {compact ? null : (
          <Text style={[styles.brandLine, { color: colors.muted }]}>
            Numerical methods, clearly.
          </Text>
        )}
      </View>
    </View>
  );
}
/**
 * The header every primary destination carries: the brand on the left, and the
 * settings shortcut on the right. Settings is a secondary destination reached
 * only from here, so this appears on all four primary screens rather than just
 * on Home — otherwise Settings would be unreachable from three of them.
 */
export function AppHeader({ onSettings }: { onSettings?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.appHeader}>
      <View style={styles.grow}>
        <Brand compact />
      </View>
      {/* Omitted on Settings itself, which still shows the brand. */}
      {onSettings ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={onSettings}
          style={({ pressed }) => [
            styles.appHeaderButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <View
            style={[
              styles.appHeaderCircle,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" accessible={false}>
              <Path d={ICONS.settings} fill={colors.text} fillRule="evenodd" />
            </Svg>
          </View>
        </Pressable>
      ) : null}
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
  icon,
}: {
  label: string;
  onPress: () => void;
  /**
   * `accent` is `quiet`'s blue on a blue ground rather than on grey — the
   * same pairing the metadata chips use, so an accent control reads as part
   * of that family instead of as a dimmer version of it.
   */
  tone?: 'primary' | 'secondary' | 'quiet' | 'accent' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  /**
   * An icon path from the shared set. When present the button shows only the
   * icon; `label` still names it for assistive tech and still identifies it
   * in tests, so swapping text for a glyph changes nothing but the pixels.
   */
  icon?: string;
}) {
  const { colors } = useTheme();
  const color =
    tone === 'primary'
      ? colors.onPrimary
      : tone === 'secondary'
      ? colors.secondary
      : tone === 'danger'
      ? colors.danger
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
        icon ? styles.buttonIconOnly : null,
        {
          backgroundColor:
            tone === 'primary'
              ? colors.primary
              : tone === 'secondary'
              ? colors.secondarySoft
              : tone === 'danger'
              ? colors.dangerSoft
              : tone === 'accent'
              ? colors.accentSoft
              : colors.surfaceAlt,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {busy ? <ActivityIndicator color={color} size="small" /> : null}
      {icon && !busy ? (
        <Svg width={19} height={19} viewBox="0 0 24 24" accessible={false}>
          <Path d={icon} fill={color} fillRule="evenodd" />
        </Svg>
      ) : null}
      {icon ? null : (
        <Text style={[styles.buttonText, { color }]}>{label}</Text>
      )}
    </Pressable>
  );
}
export function Field({
  label,
  hint,
  numeric = false,
  mono = false,
  hideLabel = false,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
  numeric?: boolean;
  /** Sets the field in JetBrains Mono — equations, bounds, points, tolerances. */
  mono?: boolean;
  /**
   * Drops the visible label where a placeholder already says the same thing,
   * as on a search field. The label still reaches assistive tech.
   */
  hideLabel?: boolean;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {hideLabel ? null : (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}
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
          mono ? styles.inputMono : styles.inputProse,
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
        style={[styles.actionArrow, { color: colors.accent }]}
      >
        ›
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  fill: { flex: 1 },
  disclosureOpen: { gap: space.lg },
  disclosureSymbol: { fontSize: 22 },
  actionCopy: { flex: 1, gap: space.xs },
  actionTitle: typeScale.action,
  actionSubtitle: typeScale.caption,
  actionArrow: { fontSize: 24 },
  disclosure: {
    minHeight: minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionRowCompact: { minHeight: 56, paddingVertical: space.md },
  actionRow: {
    minHeight: 72,
    paddingVertical: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    padding: space.edge,
    gap: space.lg,
    paddingBottom: space.xxl,
  },
  grow: { flex: 1 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  heading: { ...typeScale.title, letterSpacing: -0.8 },
  subtitle: { ...typeScale.label, marginTop: space.sm },
  /**
   * A grouped block reads as a card now that screens sit on the mesh. A flat
   * surface fill with only a bottom rule looked like a torn white slab over
   * the gradient.
   */
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.lg,
  },
  sectionTitle: { ...typeScale.section, marginBottom: space.xs },
  body: typeScale.body,
  button: {
    minHeight: minTouch,
    borderRadius: radius.control,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.sm,
  },
  buttonIconOnly: {
    width: minTouch,
    minWidth: minTouch,
    paddingHorizontal: 0,
  },
  buttonText: {
    ...typeScale.action,
    flexShrink: 1,
    textAlign: 'center',
  },
  field: { gap: space.sm, flexGrow: 1 },
  label: typeScale.label,
  input: {
    ...tabular,
    borderWidth: 1,
    borderRadius: radius.control,
    minHeight: minTouch,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  /** Prose fields: notebook titles, notes, tags. */
  inputProse: typeScale.body,
  /** Anything mathematical, so the field matches how the result renders it. */
  inputMono: typeScale.numeric,
  multiline: { minHeight: 136, textAlignVertical: 'top' },
  hint: typeScale.caption,
  notice: { padding: space.lg, borderRadius: radius.control },
  noticeText: typeScale.label,
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  brandLine: { ...typeScale.caption, marginTop: space.xs },
  pressed: { opacity: 0.7 },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    /**
     * `Screen` pads its content by `space.edge`, which put this row 12 px
     * below where a pushed screen's header controls sit. The lift aligns the
     * settings shortcut with the back and home controls, so neither moves
     * when a screen is pushed over a tab.
     */
    marginTop: -space.md,
  },
  /** 48 to the finger, 40 to the eye — the same split as the home control. */
  appHeaderButton: {
    width: minTouch,
    height: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appHeaderCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
