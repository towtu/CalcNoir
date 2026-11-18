import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ICONS } from '../../shared/assets/icons';
import { Logomark } from '../../shared/assets/Logomark';
import { Wordmark } from '../../shared/assets/Wordmark';
import { radius, space, typeScale, useTheme } from '../../shared/theme';
import { ThemeToggle } from '../../shared/ui/ThemeToggle';
import { Notice, Screen } from '../../shared/ui';


function CardHeader({
  icon,
  title,
  lead,
}: {
  icon: string;
  title: string;
  lead: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.cardHeader}>
      <View style={[styles.cardIcon, { backgroundColor: colors.primarySoft }]}>
        <Svg width={21} height={21} viewBox="0 0 24 24" accessible={false}>
          <Path d={icon} fill={colors.primary} fillRule="evenodd" />
        </Svg>
      </View>
      <View style={styles.cardHeaderCopy}>
        <Text
          accessibilityRole="header"
          style={[styles.cardTitle, { color: colors.text }]}
        >
          {title}
        </Text>
        <Text style={[styles.cardLead, { color: colors.muted }]}>{lead}</Text>
      </View>
    </View>
  );
}

export function SettingsScreen({ onTutorial }: { onTutorial?: () => void }) {
  const { colors, isDark, toggleTheme, storageWarning } = useTheme();

  const surface = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  return (
    <Screen style={styles.content}>
      <Text style={[styles.heroLead, { color: colors.muted }]}>
        Customize your learning experience.
      </Text>

      <View style={[styles.card, surface]}>
        <CardHeader
          icon={ICONS.palette}
          title="Appearance"
          lead="Personalize the look and feel."
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.themeRow}>
          <View style={styles.grow}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {isDark ? 'Dark theme' : 'Light theme'}
            </Text>
            <Text style={[styles.cardLead, { color: colors.muted }]}>
              Remembered on this device.
            </Text>
          </View>
          <ThemeToggle value={isDark} onValueChange={toggleTheme} />
        </View>
        {storageWarning ? (
          <Notice message={storageWarning} tone="warning" />
        ) : null}
      </View>

      <View style={[styles.card, surface]}>
        <CardHeader
          icon={ICONS.help}
          title="Help"
          lead="Get assistance and learn more."
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Replay tutorial"
          accessibilityState={{ disabled: !onTutorial }}
          disabled={!onTutorial}
          onPress={() => onTutorial?.()}
          style={({ pressed }) => [
            styles.replay,
            {
              backgroundColor: colors.accentSoft,
              opacity: !onTutorial ? 0.45 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" accessible={false}>
            <Path d="M7 4l13 8-13 8Z" fill={colors.accent} />
          </Svg>
          <Text style={[styles.replayText, { color: colors.accent }]}>
            Replay Tutorial
          </Text>
        </Pressable>
      </View>

      <View style={[styles.card, surface]}>
        <CardHeader
          icon={ICONS.target}
          title="Accuracy & Rounding"
          lead="Control how results are displayed."
        />
        <Text style={[styles.body, { color: colors.muted }]}>
          Display decimal places affect what you see. The solver keeps unrounded
          values during calculation. Always check the convergence status,
          residual, and stopping explanation.
        </Text>
      </View>

      <View style={[styles.card, surface]}>
        <CardHeader
          icon={ICONS.sparkle}
          title="AI Explanations"
          lead="Planned, and not connected."
        />
        <Text style={[styles.body, { color: colors.muted }]}>
          Current step explanations are built into the numerical engine and work
          offline. No AI service is connected, and nothing you type leaves this
          device.
        </Text>
      </View>

      <View style={[styles.card, surface]}>
        <CardHeader
          icon={ICONS.journal}
          title="Your Notebook"
          lead="Manage your saved problems and data."
        />
        <Text style={[styles.body, { color: colors.muted }]}>
          Saved equations and data stay on this device. There is no account or
          cloud sync. Use the system share sheet to send a readable solution
          when you choose.
        </Text>
      </View>

      <View style={[styles.about, surface]}>
        <Logomark size={52} />
        <View style={styles.aboutCopy}>
          <View accessibilityRole="header" accessibilityLabel="Numelix">
            <Wordmark width={104} color={colors.text} />
          </View>
          <Text style={[styles.cardLead, { color: colors.muted }]}>
            Numerical analysis. Made simple.
          </Text>
          <View
            style={[styles.version, { backgroundColor: colors.primarySoft }]}
          >
            <Text style={[styles.versionText, { color: colors.primary }]}>
              Version 1.0.0
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: space.lg },
  heroLead: { ...typeScale.body, marginTop: space.xs },
  card: {
    padding: space.lg,
    gap: space.md,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderCopy: { flex: 1, gap: 2 },
  cardTitle: typeScale.section,
  cardLead: typeScale.caption,
  body: typeScale.label,
  divider: { height: StyleSheet.hairlineWidth },
  themeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.lg,
  },
  grow: { flex: 1, minWidth: 160, gap: 2 },
  rowTitle: typeScale.action,
  replay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 48,
    borderRadius: radius.control,
  },
  replayText: typeScale.action,
  about: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  aboutCopy: { flex: 1, gap: space.xs },
  version: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  versionText: typeScale.caption,
});
