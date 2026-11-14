import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { Problem } from '../../core/numerics/types';
import { useNotebook } from '../../shared/storage';
import { NotebookWriteError } from '../../shared/storage/notebook';
import { useTheme } from '../../shared/theme';
import {
  Body,
  Button,
  Disclosure,
  Heading,
  Notice,
  Screen,
  Section,
} from '../../shared/ui';
import { pageTitle } from './page';
import { ProblemSummary } from './ProblemSummary';

type Mutation = 'pin' | 'duplicate' | 'delete';
const failures: Record<Mutation, string> = {
  pin: 'The pin could not be changed. Please try again.',
  duplicate: 'The page could not be duplicated. Please try again.',
  delete: 'The page could not be deleted. Please try again.',
};

export function NotebookPageScreen({
  entryId,
  onEdit,
  onCalculate,
  onOpen,
  onDeleted,
}: {
  entryId: string;
  onEdit: (id: string) => void;
  onCalculate: (problem: Problem, savedId: string) => void;
  onOpen: (id: string) => void;
  onDeleted: () => void;
}) {
  const { entries, loading, warning, readOnly, update, duplicate, remove } =
    useNotebook();
  const { colors } = useTheme();
  const entry = entries.find(page => page.id === entryId);
  const [busy, setBusy] = useState<Mutation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const writing = useRef(false);
  const confirming = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const mutate = async (action: Mutation, task: () => Promise<void>) => {
    if (!mounted.current || writing.current || readOnly || loading || !entry) {
      return;
    }
    writing.current = true;
    setBusy(action);
    setError(null);
    try {
      await task();
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof NotebookWriteError
            ? cause.userMessage
            : failures[action],
        );
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(null);
    }
  };

  const confirmDelete = () => {
    if (!entry || writing.current || confirming.current || readOnly) {
      return;
    }
    confirming.current = true;
    Alert.alert(
      'Delete this page?',
      'This deletes the saved problem and its notes from this device.',
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
          onPress: () => {
            confirming.current = false;
            return mutate('delete', async () => {
              await remove(entry.id);
              if (mounted.current) onDeleted();
            });
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

  return (
    <Screen>
      {warning ? <Notice message={warning} tone="warning" /> : null}
      {loading ? (
        <Body muted>Opening notebook…</Body>
      ) : !entry ? (
        <>
          <Heading title="Page not found" />
          <Body muted>
            This page may have been deleted. Go back to your notebook to open
            another.
          </Body>
        </>
      ) : (
        <>
          <Heading
            title={pageTitle(entry)}
            subtitle={entry.pinned ? 'Pinned page' : undefined}
            action={
              <Button
                label={entry.pinned ? 'Unpin' : 'Pin'}
                accessibilityLabel={`${
                  entry.pinned ? 'Unpin' : 'Pin'
                } ${pageTitle(entry)}`}
                tone="quiet"
                disabled={readOnly || busy !== null}
                busy={busy === 'pin'}
                onPress={() =>
                  mutate('pin', async () => {
                    await update(entry.id, {
                      problem: entry.problem,
                      title: pageTitle(entry),
                      notes: entry.notes ?? '',
                      tags: entry.tags ?? [],
                      pinned: !entry.pinned,
                    });
                  })
                }
              />
            }
          />
          {readOnly && !warning ? (
            <Notice
              message="Your notebook is read-only. You can still calculate this problem."
              tone="warning"
            />
          ) : null}
          {error ? <Notice message={error} tone="error" /> : null}
          <ProblemSummary problem={entry.problem} />
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                label="Calculate"
                disabled={busy !== null}
                onPress={() => onCalculate(entry.problem, entry.id)}
              />
            </View>
            <View style={styles.action}>
              <Button
                label="Edit"
                tone="secondary"
                disabled={readOnly || busy !== null}
                onPress={() => onEdit(entry.id)}
              />
            </View>
          </View>
          {entry.notes?.trim() ? (
            <Section title="Notes">
              <Body>{entry.notes}</Body>
            </Section>
          ) : null}
          {entry.tags?.length ? (
            <View style={styles.tags} accessibilityLabel="Tags">
              {entry.tags.map(tag => (
                <Text
                  key={tag}
                  style={[
                    styles.tag,
                    { color: colors.muted, backgroundColor: colors.surfaceAlt },
                  ]}
                >
                  {tag}
                </Text>
              ))}
            </View>
          ) : null}
          <Disclosure title="More">
            <Button
              label="Duplicate page"
              tone="quiet"
              disabled={readOnly || busy !== null}
              busy={busy === 'duplicate'}
              onPress={() =>
                mutate('duplicate', async () => {
                  const saved = await duplicate(entry.id);
                  if (mounted.current) onOpen(saved.id);
                })
              }
            />
            <Button
              label="Delete page"
              tone="quiet"
              disabled={readOnly || busy !== null}
              busy={busy === 'delete'}
              onPress={confirmDelete}
            />
          </Disclosure>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  action: { flex: 1, minWidth: 120 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});
