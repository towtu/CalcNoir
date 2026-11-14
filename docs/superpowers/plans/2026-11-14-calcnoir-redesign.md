# CalcNoir redesign implementation plan

**Goal:** Ship the requested monochrome CalcNoir app with focused method/result navigation, onboarding and local notebook pages.

**Architecture:** Retain the strict TypeScript React Native app and pure numerical core. Use React Navigation's native stack above four existing bottom tabs. Extend the existing serialized local repository, preserving version-1 data and recovery protections. No backend is added.

**Tech stack:** Existing React Native/React Navigation/AsyncStorage/Jest, plus `@react-navigation/native-stack@7.21.0` for real platform back history. Its current peers match the installed navigation/screens/safe-area stack. This is the only planned application dependency.

## Tasks and checks

- [x] Extend `src/shared/storage/notebook.ts` and NotebookProvider with bounded optional metadata and create/update/duplicate. Add `__tests__/notebook-crud.test.ts` first; reproduce missing API failures, implement, run existing notebook/QA tests. Expected: legacy entries preserved, ids stable on edit, separate duplicate id, missing/invalid/readonly mutation rejects with zero data loss.
- [x] Build `src/features/notebook/{NotebookScreen,NotebookPageScreen,NotebookEditorScreen}.tsx` and `components/ProblemSummary.tsx`. Use context create/update/duplicate/remove APIs, title/details form, read-only warnings, search and Pinned filter; use explicit pending/error states. Focused UI tests cover identity-preserving editing, page tools and confirmation.
- [x] Rename active native app/module, share reports and build artifacts to CalcNoir, including Java/Python verifiers and signing fixtures. Preserve application IDs and storage keys. Supply a new native monochrome launcher mark. Run Bash/Python signature/safeguard checks.
- [x] Replace theme tokens/shared native controls with the monochrome system in DESIGN.md; verify contrast mathematically and check 48 dp controls, wrapping labels and scalable text.
- [x] Add native-stack dependency and typed navigation for Main, Problem, Result, Steps, Graph, Table, Comparison, SavedPage, SavedEditor, GettingStarted and Practice. Main tabs are Methods/Notebook/Learn/Settings. Add method/learn homes and remembered first-run guide. Tests assert landing has no editor/results and guide can be skipped/replayed.
- [x] Refactor `SolverScreen` into the dedicated validated input screen, keeping the bounded async/reentry protections and draft text. Refactor result actions into a dedicated result screen and compose isolated step/graph/table views. Advanced/example controls default closed. Tests assert Calculate navigates, Back retains draft, validation preserves invalid text and no process appears below selection/input.
- [x] Retarget old renderer integration tests to the actual new flow without dropping core regression coverage. Run `npm run check`, all Python tooling tests, `git diff --check`, a fresh dependency audit and focused source review.
- [x] With enough free RAM, verify normal guarded debug startup and device CRUD/navigation/guide/error/large-text flows. Capture 375/768/1440 dp plus narrow/large-text evidence. Stop only the owned emulator before guarded native builds; never weaken limits.
- [x] Rebuild CalcNoir APK and AAB with npm scripts, validate signatures/bundletool, install the fresh packages where resources allow, and update docs/qa, verification, project memory and learning notes. Distinguish any unrun physical-device/TalkBack/iOS tests.

Independent storage, notebook UI and native branding work may be delegated with disjoint file ownership, then reviewed and integrated. Navigation, dependency mutations, emulator/ADB and final builds remain centralized. Do not commit/publish or modify the original Calculix checkout.

## Accepted follow-ups

The user's later instructions add native SQLite (see database spec), a real three-stage first solve (see guided-first-solve spec), generated method artwork, a moving 40dp navigation circle/cutout, page transitions and a spring sun/moon control. No extra application dependency was added. Native CMake provider registration and keyboard-before-wizard-Back behavior require actual device checks; renderer tests alone are insufficient.
