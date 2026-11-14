import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { methodInfo } from '../../core/methods';
import { useNotebook } from '../../shared/storage';
import type { SavedProblem } from '../../shared/storage';
import { NotebookWriteError } from '../../shared/storage/notebook';
import { useTheme } from '../../shared/theme';
import { Body, Button, Field, Heading, Notice, Screen } from '../../shared/ui';
import { matchesPage, pageTitle, problemPreview } from './page';

export function NotebookScreen({
  onOpen,
  onCreate,
}: {
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const { entries, loading, warning, readOnly, update } = useNotebook();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [pinning, setPinning] = useState<string | null>(null);
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
  const pages = entries.filter(
    entry => (!pinnedOnly || entry.pinned) && matchesPage(entry, search),
  );

  return (
    <Screen>
      <Heading title="Notebook" subtitle="Saved problems on this device." />
      {warning ? <Notice message={warning} tone="warning" /> : null}
      {readOnly && !warning ? (
        <Notice
          message="Your notebook is read-only. Saved pages can still be opened."
          tone="warning"
        />
      ) : null}
      {error ? <Notice message={error} tone="error" /> : null}
      <Button label="New problem" onPress={onCreate} />
      {loading ? (
        <Body muted>Opening notebook…</Body>
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Heading title="Your notebook is empty" />
          <Body muted>
            Choose a method, calculate a problem, then save it here to revisit.
          </Body>
        </View>
      ) : (
        <>
          <Field
            label="Search pages"
            placeholder="Title, note, tag or equation"
            value={search}
            onChangeText={setSearch}
            maxLength={300}
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
                      borderColor: selected ? colors.text : colors.border,
                      backgroundColor: selected
                        ? colors.surfaceAlt
                        : colors.surface,
                      opacity: pressed ? 0.65 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.filterText, { color: colors.text }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {pages.length ? (
            <View>
              {pages.map(entry => (
                <View
                  key={entry.id}
                  style={[styles.row, { borderColor: colors.border }]}
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
                    <Text style={[styles.supporting, { color: colors.muted }]}>
                      {methodInfo(entry.problem.method).title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.preview, { color: colors.muted }]}
                    >
                      {problemPreview(entry.problem)}
                    </Text>
                  </Pressable>
                  <Button
                    label={entry.pinned ? 'Unpin' : 'Pin'}
                    accessibilityLabel={`${
                      entry.pinned ? 'Unpin' : 'Pin'
                    } ${pageTitle(entry)}`}
                    tone="quiet"
                    disabled={readOnly || pinning !== null}
                    busy={pinning === entry.id}
                    onPress={() => togglePin(entry)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Heading
                title={search.trim() ? 'No matching pages' : 'No pinned pages'}
              />
              <Body muted>
                {search.trim()
                  ? 'Try another title, note, tag or equation.'
                  : 'Use Pin beside a page to keep it here.'}
              </Body>
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { gap: 12, paddingVertical: 24 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: {
    minHeight: 48,
    minWidth: 72,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  filterText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  row: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
  },
  openArea: { flex: 1, minHeight: 48, gap: 4, paddingVertical: 16 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  supporting: { fontSize: 12, lineHeight: 18 },
  preview: { fontSize: 15, lineHeight: 23 },
});
