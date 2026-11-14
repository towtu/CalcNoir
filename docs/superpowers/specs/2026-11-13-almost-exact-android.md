# Almost Exact Android implementation

## Outcome

Build the existing six-method numerical learning app under the Almost Exact brand, with editable problems, accurate recorded calculations, step-linked graphs, method comparison, an offline notebook, practice, and light/dark themes. Deliver an installable Android APK and an AAB artifact. Actual AI remains the explicitly requested final phase; never embed an AI API key or imply a local explanation is a live AI response.

## Stack decision

Keep the existing React Native Community CLI native Android project and pinned lockfile. Use strict TypeScript, React Navigation, react-native-svg, mathjs, AsyncStorage, and Jest. This keeps the existing Android toolchain and allows the validated numerical behavior to be implemented directly in native UI. A web wrapper adds an unnecessary boundary; migrating the working native project to another framework is not needed for the required deliverables. Native Gradle tasks produce APK/AAB artifacts locally.

Sources: https://reactnative.dev/docs/getting-started-without-a-framework, https://reactnative.dev/docs/signed-apk-android, https://reactnavigation.org/docs/getting-started/.

## Structure and boundaries

- `src/app`: application providers and typed tab navigation.
- `src/core/numerics`: pure TypeScript problem types, validation, numerical algorithms and structured step/plot results. No React, navigation, storage, networking or UI imports.
- `src/features/solver`: problem editor, presets, step controls, graph, table and solution screen.
- `src/features/comparison`, `notebook`, `practice`, `settings`: their screens and closely related components.
- `src/shared/ui`, `theme`, `storage`, `assets`: genuinely reusable UI, theme tokens/provider, bounded validated local persistence, and the generated brand assets.
- `docs`: architecture, setup, build/release status and limitations.
- `scripts`: reproducible local checks and Android artifact builds.

Avoid empty future-service directories, a global state library, an unrelated server, and duplicated numerical logic inside screens. Cross-feature reuse goes through public exports; numerical work uses the core contract.

## User behavior

All six existing methods remain. Functions accept standard mathematical expressions/equalities, implicit multiplication, common functions, and x/e/pi. Root parameters and tolerances are editable. Interpolation accepts two to twenty coordinate pairs and a target. Invalid input stays visible with helpful errors. No arbitrary code, properties, matrices or assignments execute through the expression parser. Bound expression length/AST complexity and iterations. Numeric failures and max-iteration results are displayed as failures, not success.

A calculation contains its validated input snapshot, status, estimate, residual where meaningful, recorded steps, table cells, plot samples and per-step helper geometry. Selecting a step updates all corresponding visual evidence. Rounding changes presentation only. A valid initial root can have zero iteration rows.

Store up to forty problem snapshots locally. Validate persisted data on read; preserve user feedback for storage failures. Reopening a record recalculates its original inputs. Share a readable calculation/table through Android's system share sheet. Comparing methods keeps the problem consistent and reports incompatible or failed methods honestly. Provide a focused offline practice flow. AI is identified as a future feature; built-in explanations are deterministic.

## Native packaging

Use a distinct application ID for the new Almost Exact app so emulator testing does not overwrite the original. The generated logo supplies launcher artwork. App name and registered component use Almost Exact/AlmostExact consistently.

Do not present a debug-signed artifact as Play-publishable. Document the signing identity and whether the AAB is unsigned, locally signed for testing, or signed with the user's release credentials. Do not create or expose a production signing identity without a concrete need. Release secrets are external environment values and ignored local configuration. Build checks include bundled JavaScript, launch/install testing when device access is available, and explicit artifact checksums.

## Verification

Run targeted numerical and persistence tests, strict TypeScript, lint, Metro/Hermes bundle verification, native APK/AAB builds, and emulator checks of method selection, edited calculations, linked steps, notebook and theme. Native Android verification replaces browser-only screenshots for these native screens; preserve the existing browser concept as a separate design artifact.

## Scope still awaiting user input

Additional formulas are not added until supplied. The actual AI backend/provider and production upload-key setup remain future integration tasks. This milestone makes the six existing methods a structured native app and records the exact state of Android artifacts.
