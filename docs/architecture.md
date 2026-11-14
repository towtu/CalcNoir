# CalcNoir architecture

The app uses React Native Community CLI, strict TypeScript, React Navigation with a native stack, mathjs, SVG, Android SQLite and AsyncStorage for preferences. This retains the native Android toolchain and produces bundled APK/AAB artifacts. It does not depend on a website or running development server for the test-signed preview build.

```text
src/
  app/                  # Providers and typed navigation; application composition
    navigation/
  core/
    methods.ts          # Six-method catalogue and editable starter problems
    numerics/           # Pure validation, algorithms, steps, plot data and types
  features/
    methods/            # Six-method landing
    learn/              # Guide and learning navigation
    solver/             # Separate editor/result/steps/graph/table destinations
    comparison/         # Compare the same problem across compatible methods
    notebook/           # Named problem pages, metadata and CRUD
    practice/           # Offline checked exercises
    settings/           # Theme and clear capability information
  shared/
    ui/                 # Reusable native fields/buttons/sections and formatting
    theme/              # Semantic tokens and persisted light/dark provider
    storage/            # Validated, bounded, serialized problem persistence
    assets/             # Generated app and method artwork
  native/specs/         # Typed TurboModule database contract
android/                # Native Android entry points and Gradle build settings
scripts/                # Reproducible artifact builds and archive verification
docs/                   # Architecture, setup, signing, verification and decisions
__tests__/              # Behavioral numerical, persistence and UI checks
artifacts/              # Ignored APK/AAB files, checksums and verification evidence
```

Screens call the numerical core through `calculate(Problem): Calculation`. Inputs are validated at the boundary; outputs include a problem snapshot, status, unrounded estimate, residual, recorded step explanations, table cells and plot geometry. Views format results without recomputing algorithms. A step selection changes the graph and explanation together.

Core files cannot import React, navigation, persistence or network code. Shared code can use the core but does not import feature screens. Features keep their related UI together and expose their entry screens. App composition wires navigation and persistence; no global state library or unrelated backend is required for this offline phase.

The notebook persists validated problem snapshots plus bounded title/notes/tags/pinning metadata, rather than serialized UI state or guessed AI results. Existing version-1 entries remain compatible; updates preserve identity, and duplication creates a separate page. On Android, a code-generated TurboModule calls the platform SQLiteOpenHelper on one background I/O worker. Pages live in the private `calcnoir-notebook.db` with a singleton initialization marker. A transaction replaces the bounded notebook and marker atomically; values are bound through ContentValues. Reads and writes are ordered to avoid concurrent-save loss. On first use, validated legacy AsyncStorage data is copied into SQLite, preserving the old source. An initialized empty database is distinct from an uninitialized database, so deleted pages do not return. Migration/database failures block writes and show a generic warning. The native and JS boundaries validate shape/size/metadata; numerical validity remains in the pure core. The previous 40-page limit now rejects a new page at capacity rather than evicting an old page. iOS retains the existing AsyncStorage implementation and has not been built in this milestone. Invalid records are skipped with visible feedback while the original raw document stays read-only until recovered. Storage failures do not claim success.

Four bottom tabs hold Methods, Notebook, Learn and Settings. A native stack places the method editor beneath its result, preserving the draft on Back; details are separate routes. First-run completion is a small local preference. The three-stage tutorial shares the method chooser/editor and calculation engine, preserving editable values on Back and handing its real calculation to the result route. Settings and Learn can replay it. Native stack slides, a short tab shift, onboarding slide/fade, the moving 40dp tab circle and the spring sun/moon thumb honor system reduced motion. Navigation icon replacement waits for arrival and ignores stale interrupted completions. Graph inspection and zoom operate on recorded samples, never on untrusted executable input during gestures.

AI is the requested final phase. Its eventual client belongs in a dedicated feature boundary, calls a rate-limited server endpoint over HTTPS, and never holds a provider secret in the APK. No unused backend or empty service folders are added in this milestone.

The web concept remains outside this native checkout as a design reference. The original source checkout remains separate. No application logic should depend on absolute paths to either source.

## References and operational note

The native boundary follows [React Native TurboModules](https://reactnative.dev/docs/turbo-native-modules-introduction) and [Android SQLiteOpenHelper](https://developer.android.com/reference/android/database/sqlite/SQLiteOpenHelper). The first in-place debug build reused CMake configuration from before app-level codegen existed, omitting the C++ provider despite successful Kotlin compilation. Removing only app-generated Debug/RelWithDebInfo `.cxx` caches and rebuilding linked `CalcNoirNotebookSpec_ModuleProvider`; native migration then succeeded. No saved data or shared toolchain cache was cleared.

The chooser and task screens use [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/), [Android accessibility sizing](https://developer.android.com/design/ui/mobile/guides/foundations/accessibility), a [4/8dp spacing scale](https://m2.material.io/design/layout/spacing-methods.html), and [Material typography hierarchy](https://m3.material.io/styles/typography/applying-type). These inform the design; they do not establish usability validation with students.

## Data-preserving rollback

Keep the app's private SQLite database before a downgrade; use in-place signed APK upgrades rather than uninstalling. Legacy AsyncStorage is retained as the pre-migration recovery source but is not updated after migration, so an older app cannot display newer SQLite edits. Unsupported database versions are preserved and rejected, never destructively reset. Uninstalling a variant deletes its local data; this milestone has no cloud backup.
