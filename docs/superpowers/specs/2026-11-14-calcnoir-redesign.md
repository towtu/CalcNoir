# CalcNoir focused native workflow

The user has specified the name, palette, method-page hierarchy, local CRUD target and avoidance of overwhelming screens. Preserve the existing numerical core and all laptop safeguards. Keep the existing Android application IDs and storage key so installed notebooks remain accessible; rename public app/module/artifact/report names coherently.

## Flow

First launch has a short Getting Started screen, an example action and a visible Browse Methods exit. Completion is remembered locally and the guide can be reopened from Learn. Four main tabs are Methods, Notebook, Learn and Settings. Methods is a grouped list of six methods; selecting Lagrange opens only its editor with a native Back button. The editor has essential equation/point fields, collapsed examples/settings and Calculate. No result, formula/process, graph or table appears beneath method selection or the editor. Calculate pushes Result and Back returns to the unchanged draft.

Result shows the answer, status, stopping message and actions. The user additionally requested interactive graphs: the separate Graph route supports sampled touch/drag inspection, bounded zoom/reset and explicit step playback. These controls never appear on the Methods landing or input editor. Steps, graph, table and same-problem comparison are separate destinations. Reuse the tested calculation/graph/table components, but compose one relevant view per destination. Current explanations remain explicitly offline, non-AI.

## Saved pages

The user confirmed saved problems on this device as CRUD records. Add optional backwards-compatible version-1 metadata: title (1–80 characters), notes (0–4000), up to six unique tags (1–24 each), pinned boolean, updatedAt timestamp. Old entries get safe display defaults without rewriting storage on load. Keep the existing 40-entry bound and unknown/corrupt-notebook read-only policy. Reject invalid metadata before persistence. Preserve immutable id/createdAt on update. Writes stay serialized; failed writes retain the original. No backend, authentication, cloud sync, HTML/markdown execution or live AI is introduced.

Repository API additions: create(input), update(id,input), duplicate(id), with input `{problem,title,notes,tags,pinned}`. Each mutation returns a NotebookSnapshot plus `saved: SavedProblem`. Existing save(problem) remains as a compatible deduplicating API for current integrations. Context create/update/duplicate return the saved record after publishing the new snapshot. Delete retains existing remove(id). Missing IDs fail rather than recreating records. Duplicating creates a separate id, copies notes/tags and clears pinning.

Notebook supports search (title/note/tags/equation/method) and All/Pinned filters. Open a page to view, edit, calculate, pin/unpin, duplicate or confirm deletion. New Problem takes the user to Methods; saving a result opens a short title/details form. Existing-page editing reuses the method-specific editor, keeping advanced settings collapsed. Notion-like tools stay secondary in the notebook.

## Security and verification

Sensitive data is local homework and notes. The main risks are data loss from migration/failed writes, malicious expression input, and accidentally exposing future API secrets. Preserve current numerical boundaries, schema limits, serialized writes and read-only recovery. Notes render as native plain text. Test metadata bounds, legacy reads, CRUD identity, concurrency, failure preservation, no process on selection/editor pages, result Back retention, first-run/replay guide and notebook flows. Run strict TS/lint/Jest, Python safeguard/signature tests, native screenshots at 375/768/1440 dp plus narrow/large-text, and guarded APK/AAB rebuild/signature checks. Never bypass the 6.5 GiB preflight.

## Research

- [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): show common tasks first and reveal secondary controls on demand.
- [NN/g user control and freedom](https://www.nngroup.com/articles/user-control-and-freedom/): Back/Cancel exits should be discoverable and return to the expected state.
- [Android accessibility](https://developer.android.com/design/ui/mobile/guides/foundations/accessibility): scalable text, adequate contrast and at least 48 dp touch targets.
- [React Navigation Native Stack](https://reactnavigation.org/docs/native-stack-navigator/): native screen transitions and back history using the app's existing navigation family.
- [Taste skill](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md), read upstream because not installed locally; relevant app guidance is recorded in DESIGN.md.
