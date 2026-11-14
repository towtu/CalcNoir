# Almost Exact Android implementation plan

**Goal:** Turn the reviewed web concept into a structured native Android app and produce honestly labeled APK/AAB artifacts.

**Architecture:** Feature folders consume a pure typed numerical core. App composition owns navigation/providers; local persistence stores validated problem snapshots. The native build retains the working React Native stack and lockfile.

**Tech stack:** React Native Community CLI, strict TypeScript, React Navigation, mathjs, SVG, AsyncStorage, Jest, Gradle.

Execution is authorized by the user's “Make the app” instruction and the prior approved requirements/preview direction. Work in the isolated `calcnoir` checkout on `feat/almost-exact-android`. Do not edit the original checkout. The numerical core, solver UI and independent review used separate owned scopes; app composition and build integration were handled centrally. The source folder was renamed to `calcnoir` at the user’s request.

## Milestones

- [x] Preserve the original and verify the cloned baseline with `npm test -- --runInBand` and `npm run typecheck` after defining the script.
- [x] Define the core contract in `src/core/numerics/types.ts`; verify algorithms/validation with failing behavioral Jest tests before implementation. Cover six methods, exact roots, domain failures, scale/tolerance cases, duplicate coordinates and expression restrictions.
- [x] Implement the native theme, reusable field/button/section components, and the solver feature using that contract. Keep typed inputs as text until validated; maintain meaningful pending/error/result states.
- [x] Implement AsyncStorage problem snapshot validation and bounded notebook operations with meaningful persistence tests. Compose comparison, notebook, practice, settings and typed navigation.
- [x] Rebrand Android resources/component registration and generate launcher density assets from the retained master. Configure signing modes honestly and document the build commands.
- [x] Run `npm test -- --runInBand`, `npm run typecheck`, and `npm run lint`. Fix observed failures, then verify the native bundle and Gradle tasks.
- [x] Build APK/AAB, inspect metadata/signing/embedded JS and checksums, and use the existing emulator if available. Keep original app data intact.
- [x] Complete independent spec and quality review, update setup/architecture/verification docs and project-local memory, and report artifact paths with any material limitation.

## Verification commands

```sh
npm test -- --runInBand
npm run typecheck
npm run lint
npm run android:apk
npm run android:aab
```

`scripts/android-build.sh` will set task-local Gradle cache paths and use installed JDK/SDK locations without changing global desktop configuration. It must fail clearly if a required SDK/tool/signing input is unavailable. Artifacts go to ignored `artifacts/`, with a manifest describing signing and checksums.

## Completed milestone

Offline Android implementation, APK/AAB generation, archive/signature checks, AAB validation/conversion/install, native UI checks, the guarded development command, documentation and local project notes are complete. See `docs/verification.md` for evidence and limitations. Additional formulas, a live AI API and production upload signing remain separate future work.
