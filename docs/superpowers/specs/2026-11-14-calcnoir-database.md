# CalcNoir on-device database and interaction refinements

The user requested database integration after explicitly choosing on-device saved problems. Use Android's built-in SQLite through a typed React Native TurboModule; no backend, account, cloud credential or extra native package is needed. Keep the original Android application IDs and existing storage untouched for rollback.

## Native boundary

`src/native/specs/NativeNotebookDatabase.ts` defines module `CalcNoirNotebookDatabase`, with `readNotebook(): Promise<string | null>` and `writeNotebook(serialized: string): Promise<void>`. The module returns null only before initialization. Once initialized, an empty notebook returns the version-1 empty envelope, preventing deleted pages from being re-imported from legacy storage.

SQLite file: `calcnoir-notebook.db`, app-private, schema version 1. `notebook_pages` has id primary key, created_at, updated_at, method, problem_json, title, notes, tags_json and pinned. Optional legacy metadata remains null/absent rather than invented. A singleton state table records initialization. Reads return the existing version-1 envelope to preserve the tested domain repository. Writes validate bounds and use parameter binding/ContentValues in a single transaction; replacement of up to 40 rows and the initialized marker commit together. No interpolated SQL, user-controlled paths, destructive upgrades, arbitrary queries or diagnostic data logs. Database I/O runs on one owned worker, closed on module invalidation.

## Migration

The JS driver first reads the database. Only if uninitialized does it read the legacy AsyncStorage key. Validate the entire legacy envelope with the current decoder; read-only/unknown/corrupt/over-cap data is returned unchanged and never imported or overwritten. Valid legacy pages are imported transactionally; the old value is retained. No legacy data means initialize an empty notebook. Failed migration propagates failure and preserves the legacy source. New CRUD writes go to SQLite only. iOS retains the old storage adapter and remains unverified in this Android task.

Tests cover valid import, no legacy rewrite/delete, malformed-data preservation, initialized-empty behavior, migration/write failures, and rejection of invalid writes. Native verification must inspect the real SQLite file and exercise migration/CRUD/persistence on the owned emulator after a guarded rebuild.

## Latest UI requests

- Navigation uses short native slide/fade transitions; the reduced-motion preference overrides them.
- Editing a notebook opens a separate method picker while keeping typed title, notes, tags and alternate drafts.
- Pin/Unpin is directly visible on list rows and open pages.
- Getting Started is first-launch guidance; Settings has Replay tutorial.
- Appearance includes sun/moon icons. Method selection uses a consistent native type scale and 8 dp spacing rhythm, readable hints, and compact rows; no recorded process appears under the chooser.
- Steps must show a visibly changing numerical value as Previous/Next advances. Endpoint states and replay must be clear, and graph helper selection must stay linked.

## Sources

- [React Native 0.88 Turbo Native Modules](https://reactnative.dev/docs/turbo-native-modules-introduction)
- [SQLiteOpenHelper](https://developer.android.com/reference/android/database/sqlite/SQLiteOpenHelper)
- [Android accessibility](https://developer.android.com/design/ui/mobile/guides/foundations/accessibility)
- [Material layout spacing](https://m3.material.io/foundations/layout/grids-spacing/spacing)
- [Native navigation transitions](https://reactnavigation.org/docs/native-stack-navigator/)
