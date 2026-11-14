# Verification — 2026-11-13

> QA follow-up, 2026-11-14: the [current QA report](qa/report.md) supersedes this preceding-milestone record for test counts, security fixes, dependency findings and artifact hashes. That report records an earlier QA milestone. The subsequent CalcNoir redesign, SQLite integration and current package verification are tracked in [the redesign report](qa/redesign-2026-11-14.md).

## Verified source and packages

The independent source checkout is `Numerical/calcnoir` on `feat/almost-exact-android`. The original `/home/kobinggg/Projects/Calculix` checkout was not modified. Its baseline is also preserved in this checkout's Git history.

`npm run check` passes strict TypeScript, ESLint with zero warnings, and **122 tests across six suites**. A separate Python test run passes **nine Android safeguard checks**. Coverage includes six algorithms, all sixteen shipped presets against known answers, scaled equations, invalid domains, underflow/cancellation failures, fixed-point mapping consistency, interpolation conditioning, saved-data validation/concurrency, scientific-number drafts, graph/table selection, save failures, shared reports, and actual provider/navigation interactions.

The independent numerical re-review approved the bounded numerical scope: fourteen known failure cases fail honestly, ordinary exponential convergence is retained, and the sixteen presets succeed. This is double-precision arithmetic; conservative precision failures are deliberate.

The final native Gradle preview build completed successfully. APK/AAB archives have bundled Hermes JavaScript and native runtimes for **arm64-v8a, armeabi-v7a, x86 and x86_64**. The generated launcher resources compile. Both signatures verify with the same public Android test certificate. The certificate SHA-256 is `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

- `almost-exact-preview.apk` — 78,224,058 bytes; SHA-256 `88401cfb50e7185bf0bfc9e6ab540e831e7932f6895bdf6aedacacb4be3ee949`.
- `almost-exact-preview.aab` — 54,830,654 bytes; SHA-256 `51381e579bc9d2787f62076d256eea110f0d2fe8a6e5f1ee7fd35de35d0c62fb`.

The artifact manifest and signature evidence are in `artifacts/`. Jarsigner reports a verified JAR with warnings concerning the self-signed test certificate, timestamp and ZIP/stream ordering. Google bundletool **1.18.3** validates the final AAB and converts it into a universal APK. Its official release download digest was checked before use. These remain test-signed builds, not Google Play upload builds.

## Native emulator checks

A separate project-owned API 35 x86_64 emulator was created in `.cache/avd`; original app/device data was preserved. Native checks confirmed:

- All six methods calculate successfully, including editable equality `x^2=2` and edited Lagrange points producing `2.8125`.
- Duplicate interpolation x values show an error while retaining editable input.
- Step controls update the selected row/graph state; actual SVG curve, markers and helper geometry render.
- The offline explanation modal opens/closes with its non-AI label.
- Problems save and reopen with the original equation, then recalculate; the notebook survives app and emulator restarts.
- Comparison displays the same problem and honest per-method outcomes.
- The native share sheet opens with result text and a step table; final equality reports use `Equation: ...` and explicit status/active settings. No message was sent.
- Theme selection persists across process restarts. Practice checks an answer and advances to the next exercise.
- Screens were captured and visually inspected at **375, 768 and 1440 dp**; wide content is bounded for readability.

See [phone solver](screenshots/phone-solver.png), [Lagrange graph](screenshots/phone-lagrange.png), [tablet](screenshots/tablet.png), and [dark settings](screenshots/dark-settings.png). Detailed temporary evidence is kept in ignored `artifacts/native-qa/`.

After the folder rename, the guarded `npm run android` completed its cached build in 12 seconds, booted the project emulator, installed and launched `com.towtu.almostexact.debug`, and loaded the app through Metro on port 8081. A calculation converged in the live development app. The final AAB-derived universal APK also installed, opened and calculated successfully. Evidence is in `artifacts/native-qa/dev-run.json` and `aab-install.json`.

A cold bounded emulator briefly showed a System UI responsiveness dialog and an initial debug script connection error. Waiting for Metro to complete its first bundle and restarting the debug activity resolved the connection; subsequent native content and calculation checks passed. Physical devices, other Android API levels, TalkBack speech operation and iOS were not tested.

## Security check

This offline phase has no account, backend, uploads, payment flow, or live AI service. Numerical input is validated at the core boundary with expression/function allowlists and bounded syntax, points, iterations and plot sampling. Saved JSON is size/schema-validated, duplicate identifiers are rejected, and writes are serialized. Storage/share errors do not claim success. No provider key or production signing key is embedded or created. Preview/release cleartext traffic is disabled.

Compatible dependency updates reduced the inherited audit from sixteen to **fifteen findings: nine low, six moderate, zero high/critical**. Remaining advisory families are `deepmerge` (CLI/Jest tooling) and `minimatch` (TypeScript ESLint tooling). npm's omit-dev audit still lists four low CLI-peer findings; it is not a clean audit. Forced CLI/Jest major downgrades were not applied. Resolve upstream-compatible tooling advisories before production release; full audit JSON is retained in `artifacts/dependency-audit.json`.

## Limits and next work

JavaScript double precision cannot guarantee arbitrary-precision answers, continuity, or the true error of interpolation against an unknown function. Extreme/subnormal arithmetic, saturation, ill-conditioned interpolation, incompatible mappings and iteration exhaustion may fail explicitly. A sampled graph does not prove continuity.

Additional methods await the user's formulas. A live AI API remains the final planned phase and requires a server-held provider key, validated requests and rate limits. Production signing/publishing is separate from this local test build.

## Reproduction and rollback

Inside `calcnoir`, use `npm run check` and `npm run android:artifacts` with the documented JDK/SDK. `npm start` runs Metro; `npm run android` builds/launches the separate development package using the existing installed SDK/JDK fallback or explicit environment values.

Earlier restricted execution blocked Gradle sockets; that restriction was removed and final builds succeeded. Kotlin/KSP were aligned at Kotlin 2.2.10. Existing AGP legacy-DSL deprecation warnings remain; the wrapper is pinned to Gradle 9.4.1 and Gradle 10 migration is future work.

The app implementation preserves the original project. Separate freeze/resource protections and emulator window rules added during the setup investigation are documented in [the investigation](laptop-freeze-2026-11-13.md); the app launcher respects the current local and universal safeguards. App-specific files use this checkout, the existing SDK/JDK, and the project-owned test emulator. Stop this emulator and Metro when done. Uninstalling `com.towtu.almostexact.preview` or `.debug` removes only that variant and its notebook. Generated `.cache/` and `artifacts/` are ignored and rebuildable; preserve useful artifacts before cleanup. Git retains the baseline if this branch needs to be discarded.
