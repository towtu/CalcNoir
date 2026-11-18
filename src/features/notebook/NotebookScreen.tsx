import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { methodInfo } from '../../core/methods';
import { useNotebook } from '../../shared/storage';
import type { SavedProblem } from '../../shared/storage';
import { NotebookWriteError } from '../../shared/storage/notebook';
import { minTouch, radius, space, typeScale, useTheme } from '../../shared/theme';
import {
  AppHeader,
  Body,
  Button,
  Field,
  Notice,
  Screen,
} from '../../shared/ui';
import { CTA_SWEEP, GradientSurface } from '../../shared/ui/GradientSurface';
import { GradientWord } from '../../shared/ui/GradientWord';
import { ICONS } from '../../shared/assets/icons';
import { matchesPage, pageTitle, problemPreview } from './page';


/** The notebook glyph used for the empty state. */

export function NotebookScreen({
  onOpen,
  onCreate,
  onSettings,
}: {
  onOpen: (id: string) => void;
  onCreate: () => void;
  onSettings?: () => void;
}) {
  const { entries, loading, warning, readOnly, update, remove } =
    useNotebook();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [pinning, setPinning] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const confirming = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const writing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const togglePin = async (entry: SavedProblem) => {
    if (!mounted.current || writing.current || loading || readOnly) return;
    writing.current = true;
    setPinning(entry.id);
    setError(null);
    try {
      await update(entry.id, {
        problem: entry.problem,
        title: pageTitle(entry),
        notes: entry.notes ?? '',
        tags: entry.tags ?? [],
        pinned: !entry.pinned,
      });
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof NotebookWriteError
            ? cause.userMessage
            : 'The pin could not be changed. Please try again.',
        );
    } finally {
      writing.current = false;
      if (mounted.current) setPinning(null);
    }
  };
  const confirmRemove = (entry: SavedProblem) => {
    if (writing.current || confirming.current || loading || readOnly) return;
    confirming.current = true;
    Alert.alert(
      'Delete this page?',
      'This removes the saved problem and its notes from this device.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            confirming.current = false;
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            confirming.current = false;
            if (writing.current) return;
            writing.current = true;
            setRemoving(entry.id);
            setError(null);
            try {
              await remove(entry.id);
            } catch (cause) {
              if (mounted.current)
                setError(
                  cause instanceof NotebookWriteError
                    ? cause.userMessage
                    : 'The page could not be deleted. Please try again.',
                );
            } finally {
              writing.current = false;
              if (mounted.current) setRemoving(null);
            }
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          confirming.current = false;
        },
      },
    );
  };
  // Both filters narrow the same list: the chips choose the set, the query
  // searches inside it — title, notes, tags, method and the equation itself.
  const pages = entries.filter(
    entry => (!pinnedOnly || entry.pinned) && matchesPage(entry, search),
  );

  const benefits = [
    { key: 'save', icon: ICONS.bolt, label: 'Save Solutions' },
    { key: 'review', icon: ICONS.clock, label: 'Review Later' },
    { key: 'track', icon: ICONS.chart, label: 'Track Your Work' },
  ];

  return (
    <Screen style={styles.content}>
      {onSettings ? <AppHeader onSettings={onSettings} /> : null}

      <View style={styles.hero}>
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel="Every solution, worth revisiting."
          style={styles.heroTitle}
        >
          <Text style={[styles.heading, { color: colors.text }]}>
            Every solution,
          </Text>
          <View style={styles.heroRow}>
            <Text style={[styles.heading, { color: colors.text }]}>worth</Text>
            <GradientWord
              word="revisiting."
              size={34}
              id="numelixNotebookRevisiting"
            />
          </View>
        </View>
        <Text style={[styles.heroLead, { color: colors.muted }]}>
          Keep your calculations and saved problems organized, right on your device.
        </Text>
      </View>

      {warning ? <Notice message={warning} tone="warning" /> : null}
      {readOnly && !warning ? (
        <Notice
          message="Your notebook is read-only. Saved pages can still be opened."
          tone="warning"
        />
      ) : null}
      {error ? <Notice message={error} tone="error" /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New problem"
        onPress={onCreate}
        style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
      >
        <GradientSurface
          id="numelixNewProblem"
          from={CTA_SWEEP.from}
          to={CTA_SWEEP.to}
        />
        <View style={styles.ctaContent}>
          <Svg width={16} height={16} viewBox="0 0 24 24" accessible={false}>
            <Path
              d="M12 5v14M5 12h14"
              stroke={CTA_SWEEP.ink}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
          <Text style={styles.ctaText}>New Problem</Text>
        </View>
      </Pressable>

      {loading ? (
        <Body muted>Opening notebook…</Body>
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <View
            style={[
              styles.emptyArtFrame,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <View
              style={[styles.emptyArt, { backgroundColor: colors.surface }]}
            >
              <Svg
                width={44}
                height={44}
                viewBox="0 0 24 24"
                accessible={false}
              >
                <Path
                  d={ICONS.journal}
                  fill={colors.primary}
                  fillRule="evenodd"
                />
              </Svg>
            </View>
          </View>
          <Text
            accessibilityRole="header"
            style={[styles.emptyTitle, { color: colors.text }]}
          >
            Your notebook is empty
          </Text>
          <Text style={[styles.emptyLead, { color: colors.muted }]}>
            Create a new problem, calculate a result, then save it here for
            quick access.
          </Text>
          <View
            style={[styles.benefits, { backgroundColor: colors.primarySoft }]}
          >
            {benefits.map((benefit, index) => (
              <React.Fragment key={benefit.key}>
                {index > 0 ? (
                  <View
                    style={[styles.benefitRule, { backgroundColor: colors.border }]}
                  />
                ) : null}
                <View style={styles.benefit}>
                  <View
                    style={[
                      styles.benefitIcon,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Svg width={21} height={21} viewBox="0 0 24 24">
                      <Path
                        d={benefit.icon}
                        fill={colors.primary}
                        fillRule="evenodd"
                      />
                    </Svg>
                  </View>
                  <Text
                    style={[styles.benefitText, { color: colors.primary }]}
                  >
                    {benefit.label}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>
      ) : (
        <>
          <Field
            label="Search pages"
            hideLabel
            placeholder="Search titles, notes, tags or equations"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          <View style={styles.filters}>
            {['All', 'Pinned'].map(label => {
              const selected = (label === 'Pinned') === pinnedOnly;
              return (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected }}
                  onPress={() => setPinnedOnly(label === 'Pinned')}
                  style={({ pressed }) => [
                    styles.filter,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected
                        ? colors.primarySoft
                        : colors.surface,
                      opacity: pressed ? 0.65 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: selected ? colors.primary : colors.text },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {pages.length ? (
            <View style={styles.list}>
              {pages.map(entry => (
                <View
                  key={entry.id}
                  style={[
                    styles.row,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${pageTitle(entry)}`}
                    onPress={() => onOpen(entry.id)}
                    style={({ pressed }) => [
                      styles.openArea,
                      { opacity: pressed ? 0.65 : 1 },
                    ]}
                  >
                    <Text
                      numberOfLines={2}
                      style={[styles.title, { color: colors.text }]}
                    >
                      {pageTitle(entry)}
                    </Text>
                    <View
                      style={[
                        styles.methodChip,
                        { backgroundColor: colors.accentSoft },
                      ]}
                    >
                      <Text
                        style={[styles.methodChipText, { color: colors.accent }]}
                      >
                        {methodInfo(entry.problem.method).title}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[styles.preview, { color: colors.muted }]}
                    >
                      {problemPreview(entry.problem)}
                    </Text>
                  </Pressable>
                  <View style={styles.rowActions}>
                    <Button
                      label={entry.pinned ? 'Unpin' : 'Pin'}
                      accessibilityLabel={`${
                        entry.pinned ? 'Unpin' : 'Pin'
                      } ${pageTitle(entry)}`}
                      tone="accent"
                      icon={ICONS.pin}
                      disabled={readOnly || pinning !== null}
                      busy={pinning === entry.id}
                      onPress={() => togglePin(entry)}
                    />
                    <Button
                      label="Delete"
                      accessibilityLabel={`Delete ${pageTitle(entry)}`}
                      tone="danger"
                      icon={ICONS.trash}
                      disabled={readOnly || removing !== null}
                      busy={removing === entry.id}
                      onPress={() => confirmRemove(entry)}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Text
                accessibilityRole="header"
                style={[styles.emptyTitle, { color: colors.text }]}
              >
                {search.trim() ? 'No matching pages' : 'No pinned pages'}
              </Text>
              <Text style={[styles.emptyLead, { color: colors.muted }]}>
                {search.trim()
                  ? 'Try another title, note, tag or equation.'
                  : 'Use Pin beside a page to keep it here.'}
              </Text>
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: space.lg },
  hero: { paddingTop: space.md },
  heroTitle: { gap: space.xs },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  heading: { ...typeScale.hero, letterSpacing: -0.6 },
  heroLead: { ...typeScale.body, marginTop: space.sm },
  /**
   * Deliberately identical to Home's `primaryAction`: the same height, radius,
   * padding and gap. These are the app's two gradient calls to action and they
   * sit one tab apart, so a difference of eight pixels reads as a mistake.
   */
  cta: {
    minHeight: minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  ctaText: { ...typeScale.action, color: CTA_SWEEP.ink },
  empty: { gap: space.md, paddingVertical: space.lg, alignItems: 'center' },
  /**
   * Exactly the benefits strip's arrangement, one size up: a tinted ground
   * with a surface tile on it, and the glyph on the surface.
   */
  emptyArtFrame: {
    padding: space.md,
    borderRadius: radius.card + 6,
  },
  emptyArt: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...typeScale.title, textAlign: 'center' },
  emptyLead: { ...typeScale.body, textAlign: 'center', maxWidth: 320 },
  benefits: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    padding: space.lg,
    borderRadius: radius.card,
    marginTop: space.sm,
  },
  benefit: { flex: 1, alignItems: 'center', gap: space.sm },
  /** A surface disc under each glyph: the strip is tinted, so the icons need
      their own ground to read as objects rather than as printing on it. */
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitRule: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  benefitText: { ...typeScale.caption, textAlign: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  filter: {
    minHeight: 44,
    minWidth: 72,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  filterText: typeScale.label,
  list: { gap: space.sm },
  rowActions: { flexDirection: 'row', gap: space.xs, alignItems: 'center' },
  row: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
  },
  openArea: { flex: 1, minHeight: 48, gap: space.xs, paddingVertical: space.lg },
  title: typeScale.action,
  methodChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  methodChipText: typeScale.caption,
  preview: typeScale.caption,
});
