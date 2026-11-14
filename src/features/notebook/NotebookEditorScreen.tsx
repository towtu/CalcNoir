import React, { useEffect, useRef, useState } from 'react';
import { methodInfo } from '../../core/methods';
import type { MethodId, Problem } from '../../core/numerics/types';
import { useNotebook } from '../../shared/storage';
import type { SavedProblem } from '../../shared/storage';
import { NotebookWriteError } from '../../shared/storage/notebook';
import type { NotebookInput } from '../../shared/storage/notebook';
import { Body, Button, Heading, Notice, Screen } from '../../shared/ui';
import { ProblemEditor } from '../solver/components/ProblemEditor';
import { draftFor, problemFor } from '../solver/draft';
import { pageTitle } from './page';
import { PageMetadataEditor } from './PageMetadataEditor';
import { ProblemSummary } from './ProblemSummary';

interface Props {
  entryId?: string;
  initialProblem?: Problem;
  selectedMethod?: MethodId;
  onChooseMethod?: (currentMethod: MethodId) => void;
  onSaved: (id: string) => void;
}

export function NotebookEditorScreen({
  entryId,
  initialProblem,
  selectedMethod,
  onChooseMethod,
  onSaved,
}: Props) {
  const { entries, loading, warning } = useNotebook();
  const entry = entries.find(page => page.id === entryId);
  const problem = initialProblem ?? entry?.problem;
  if (loading || (entryId !== undefined && !entry) || !problem) {
    return (
      <Screen>
        {warning ? <Notice message={warning} tone="warning" /> : null}
        {loading ? (
          <Body muted>Opening notebook…</Body>
        ) : (
          <>
            <Heading
              title={
                entryId !== undefined
                  ? 'Page not found'
                  : 'Choose a problem first'
              }
            />
            <Body muted>
              {entryId !== undefined
                ? 'This page may have been deleted. Go back to your notebook to open another.'
                : 'Calculate a problem, then save it to your notebook.'}
            </Body>
          </>
        )}
      </Screen>
    );
  }
  return (
    <NotebookEditor
      key={entryId ?? 'new-page'}
      entry={entry}
      problem={problem}
      editableProblem={initialProblem === undefined}
      selectedMethod={selectedMethod}
      onChooseMethod={onChooseMethod}
      onSaved={onSaved}
    />
  );
}

function NotebookEditor({
  entry,
  problem,
  editableProblem,
  selectedMethod,
  onChooseMethod,
  onSaved,
}: {
  entry?: SavedProblem;
  problem: Problem;
  editableProblem: boolean;
  selectedMethod?: MethodId;
  onChooseMethod?: (currentMethod: MethodId) => void;
  onSaved: (id: string) => void;
}) {
  const { create, update, readOnly, warning } = useNotebook();
  const [title, setTitle] = useState(
    entry ? pageTitle(entry) : methodInfo(problem.method).title,
  );
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const initialTags = useRef(entry?.tags ?? []);
  const [tags, setTags] = useState((entry?.tags ?? []).join(', '));
  const [draft, setDraft] = useState(() => draftFor(problem));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (editableProblem && selectedMethod) {
      setDraft(current =>
        current.method === selectedMethod
          ? current
          : { ...current, method: selectedMethod },
      );
    }
  }, [editableProblem, selectedMethod]);
  const disabled = readOnly || busy;

  const save = async () => {
    if (writing.current || readOnly) {
      return;
    }
    setError(null);
    let input: NotebookInput;
    try {
      const normalizedTitle = title.trim();
      if (!normalizedTitle || normalizedTitle.length > 80) {
        throw new Error('Enter a page title with 1–80 characters.');
      }
      if (notes.length > 4000) {
        throw new Error('Keep notes within 4000 characters.');
      }
      // Stored tags can contain commas. Preserve them when this field is unchanged.
      const normalizedTags =
        tags === initialTags.current.join(', ')
          ? [...initialTags.current]
          : tags
              .split(',')
              .map(tag => tag.trim())
              .filter(Boolean);
      if (
        normalizedTags.length > 6 ||
        normalizedTags.some(tag => tag.length > 24)
      ) {
        throw new Error('Use up to 6 tags, with 1–24 characters each.');
      }
      if (new Set(normalizedTags).size !== normalizedTags.length) {
        throw new Error('Use each tag only once.');
      }
      input = {
        problem: editableProblem ? problemFor(draft) : problem,
        title: normalizedTitle,
        notes,
        tags: normalizedTags,
        pinned: entry?.pinned ?? false,
      };
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : 'Check your problem and page details.',
      );
      return;
    }
    writing.current = true;
    setBusy(true);
    try {
      const saved = entry ? await update(entry.id, input) : await create(input);
      if (mounted.current) onSaved(saved.id);
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof NotebookWriteError
            ? cause.userMessage
            : 'Your changes could not be saved. They are still here; please try again.',
        );
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <Screen>
      <Heading title={entry ? 'Edit page' : 'Save to notebook'} />
      {warning ? <Notice message={warning} tone="warning" /> : null}
      {readOnly && !warning ? (
        <Notice
          message="Your notebook is read-only. This page cannot be saved right now."
          tone="warning"
        />
      ) : null}
      {error ? <Notice message={error} tone="error" /> : null}
      <PageMetadataEditor
        title={title}
        notes={notes}
        tags={tags}
        disabled={disabled}
        onTitle={setTitle}
        onNotes={setNotes}
        onTags={setTags}
      />
      {editableProblem ? (
        <>
          <Body muted>Method: {methodInfo(draft.method).title}</Body>
          {onChooseMethod ? (
            <Button
              label="Change method"
              tone="quiet"
              disabled={disabled}
              onPress={() => {
                if (!readOnly && !writing.current && mounted.current) {
                  onChooseMethod(draft.method);
                }
              }}
            />
          ) : null}
          <ProblemEditor
            draft={draft}
            disabled={disabled}
            onChange={setDraft}
            onPreset={preset => setDraft(draftFor(preset))}
          />
        </>
      ) : (
        <ProblemSummary problem={problem} />
      )}
      <Button
        label={entry ? 'Save changes' : 'Save page'}
        disabled={disabled}
        busy={busy}
        onPress={save}
      />
    </Screen>
  );
}
