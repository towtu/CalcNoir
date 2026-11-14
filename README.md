# CalcNoir

**Numerical methods, clearly.** An offline Android workspace for six numerical methods, with editable equations and data, real calculation steps, and graphs linked to the selected step.

## Stack

React Native Community CLI 0.88.1, React 19.3, strict TypeScript, React Navigation 7 with native stack navigation, mathjs, react-native-svg, Android SQLite, AsyncStorage for small preferences, Jest, and Gradle. Keep the npm lockfile and use `npm ci`.

This extends the existing native toolchain. It produces native Android builds with bundled JavaScript; no running website is needed for a packaged preview. The calculation engine has no React, navigation, storage, or network dependencies. The native stack navigator uses the existing navigation/screens family for platform Back behavior and separate task screens.

## Features

- Bisection, Newton–Raphson, Secant, Fixed-Point, Newton divided differences, and Lagrange.
- Equations such as `x^2 = 2`, `2x + sin(x)`, and Unicode powers. Supported real functions, explicit domains, bounded work, and clear failure messages.
- Editable initial values, tolerance, iteration limit, display precision, and 2–20 interpolation points. Incomplete scientific-number drafts stay editable.
- Dedicated method editors and separate answers; steps, graph, table and comparison open only when requested. Advanced settings and examples start collapsed.
- Interactive sampled graphs: tap/drag inspection, bounded zoom/reset and explicit step playback.
- A guided first solve: choose a method, edit values, calculate, and open your real result. Shown on first launch; replay from Settings or Learn.
- A transactional SQLite notebook on Android with up to 40 named pages: create/view/edit/delete problems, notes, tags, pinning, search and duplication. Existing notebooks remain readable; unknown/corrupt data is preserved read-only.
- Same-problem comparison, three checked practice exercises, and persisted black-and-white appearance with an animated sun/moon switch.
- A smaller floating tab circle in a moving cutout, short page transitions and system reduced-motion support.
- Native sharing of readable calculation text and a comma-separated step table.

AI explanations are the final planned phase. Current explanations work offline and make no AI request. Additional methods wait for the user's formulas.

## Folder conventions

```text
App.tsx                    Provider composition
src/app/navigation/        Typed routes and feature wiring
src/core/methods.ts        Method catalogue and starter problems
src/core/numerics/         Pure algorithms, validation, steps, plot data, types
src/features/methods/      Focused six-method landing
src/features/learn/        Getting started and learning navigation
src/features/solver/       Separate editor, answer, steps, graph and table
src/features/comparison/   Same-problem method comparison
src/features/notebook/     Saved pages, metadata, search and CRUD
src/features/practice/     Offline exercises and feedback
src/features/settings/     Appearance and capability information
src/shared/ui/             Native reusable controls and number/report formatting
src/shared/theme/          Semantic light/dark tokens
src/shared/storage/        Validated, bounded, serialized persistence
src/shared/assets/         Generated app and method artwork
src/native/specs/          Typed Android database boundary
android/                   Native entry points and Gradle configuration
__tests__/                 Numerical, persistence, formatting, and UI behavior
scripts/                   Android builds and artifact checks
artifacts/                 Ignored build outputs and verification evidence
```

Keep feature-specific components beside their screen. Put a component in `shared` only when it serves multiple features. Core code must not import UI or persistence; shared code must not import feature screens. Avoid global catch-all `utils`, duplicate calculation engines, or empty folders for future services.

For a new method, first define its input/output contract and numerical tests, implement it in the core, register its metadata/presets, then add only the editor or graph behavior it requires. See [architecture](docs/architecture.md).

## Development and checks

The source folder is `calcnoir`. The app display name is CalcNoir. Existing Android IDs and local storage keys are retained so installed notebooks survive the rebrand. Run npm commands inside `calcnoir`, where `package.json` lives.

Use Node 22.13+ (Node 22), 24.3+ (Node 24), or Node 26+, JDK 17, and the Android SDK/NDK versions in `android/build.gradle`.

```bash
cd calcnoir  # from the parent Numerical folder
npm ci     # only when dependencies need installing
npm run check
npm start
# In a second terminal, also inside calcnoir, with an emulator/device connected:
npm run android
```

The Android development launcher uses the installed local SDK/JDK fallback, or your JAVA_HOME/ANDROID_HOME values, launches the separate `.debug` package, and builds only the connected CPU architecture. Keep Metro in its own terminal. It listens on loopback by default; the Android CLI connects USB/emulator devices through adb reverse. The launcher checks Metro and prepares its bundle before opening the emulator, so a missing server gives an actionable terminal error. Metro ignores local tool/build caches and uses two workers to keep development resource use bounded. Preserve the [laptop workload safeguards](docs/android-build.md#laptop-resource-safeguards).

`npm run check` runs strict TypeScript, ESLint with zero warnings, and Jest. Native device checks are separate from renderer tests. iOS scaffolding is retained but has not been built or tested for this milestone.

## APK and AAB

```bash
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=/path/to/android-sdk
npm run android:artifacts
```

The default `preview` variant embeds JavaScript and uses the conventional Android debug certificate for local testing. Expected outputs are `artifacts/calcnoir-preview.apk`, `artifacts/calcnoir-preview.aab`, and a checksum/ABI manifest. They are **not Google Play upload builds**. Production signing requires an external upload key and explicit environment variables; see [build and signing instructions](docs/android-build.md).

Current build/device verification and limitations are recorded in [verification](docs/verification.md), with reproduced issues in the [QA findings](docs/qa/bugs.md) and [dependency disposition](docs/qa/dependencies.md). An expected output path is not evidence that the artifact exists. The database and migration boundary are documented in [architecture](docs/architecture.md).
