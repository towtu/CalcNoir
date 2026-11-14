import React from 'react';
import { Disclosure, Field } from '../../shared/ui';

export function PageMetadataEditor({
  title,
  notes,
  tags,
  disabled,
  onTitle,
  onNotes,
  onTags,
}: {
  title: string;
  notes: string;
  tags: string;
  disabled: boolean;
  onTitle: (value: string) => void;
  onNotes: (value: string) => void;
  onTags: (value: string) => void;
}) {
  return (
    <>
      <Field
        label="Page title"
        value={title}
        onChangeText={onTitle}
        maxLength={80}
        editable={!disabled}
        autoCapitalize="sentences"
      />
      <Disclosure title="Notes and tags">
        <Field
          label="Notes"
          value={notes}
          onChangeText={onNotes}
          maxLength={4000}
          multiline
          editable={!disabled}
          autoCapitalize="sentences"
        />
        <Field
          label="Tags"
          value={tags}
          onChangeText={onTags}
          maxLength={160}
          editable={!disabled}
          hint="Separate with commas. Up to 6 tags, 24 characters each."
        />
      </Disclosure>
    </>
  );
}
