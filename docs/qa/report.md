# QA and security report — 2026-11-13–14

> Historical pre-redesign milestone. See [CalcNoir redesign verification](redesign-2026-11-14.md) for current UI, SQLite, test counts and package evidence.

Project: `/home/kobinggg/Atilano/atila-desktop/Projects/Numerical/calcnoir`, offline Almost Exact Android app. The original Calculix checkout is outside this audit. Findings, reproductions and repairs are in [bugs.md](bugs.md); case definitions are in [test-plan.md](test-plan.md).

## Automated verification

- `npm run check`: strict TypeScript, zero-warning ESLint, **203 passing tests in 9 suites**. Numerical cases include all presets and independent known values, rootless/scaled/saturated expressions, interpolation zeros and conditioning, rejected syntax/domain/size bounds, steps/graphs, saved data, concurrency, actual providers/navigation, theme races, practice edits and hidden draft fields.
- `/usr/bin/python3 -m unittest discover -s scripts -p 'test_*.py'`: **26 passing tests**, including real-JDK signature fixtures, missing/failed Metro, bounded bundle preparation, launch order and retained resource controls.
- Bash syntax and `git diff --check` pass. Independent focused reviews checked numerical fixes, notebook preservation and signature coverage.
- A fresh full dependency audit has **9 low, 0 moderate/high/critical**. The omit-dev audit still has 4 low findings. See [reachability, exception and review date](dependencies.md).
- Bounded credential-pattern scan of application/config/test/documentation files found no matches; this is a limited scan, not proof that secrets cannot exist. Production/provider keys were not read or created.

Curated/raw local evidence is in ignored `artifacts/qa/`: application/Python check logs, original notebook/Metro reproductions, math/UI/security findings, redacted scan result, audit JSON and signature fixtures. No external messages or production publication were performed.

## Native and package verification

The guarded full four-architecture preview rebuild succeeded in **13m 3s**. APK/AAB archive, bundled-runtime and matching-signature checks pass. The sampled build cgroup peak was 3296.3 MiB with zero recorded limit/OOM events at that sample; `build-cgroup.json` is a sample, not a final peak claim. All existing workload limits remain enforced.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `artifacts/almost-exact-preview.apk` | 78,226,966 | `fd78934b14aa8eb7cd6ea5731cef34b951a8026f52eb4bf815b0849cad284681` |
| `artifacts/almost-exact-preview.aab` | 54,832,644 | `b66f8732750339581bb2c97245d403bb0b9268def64b28427922c1d924136542` |

Both contain the same 2,637,004-byte Hermes bundle, SHA-256 `31b1bd6d370e32f6624f9c527e8d672c2fa06334fd967e7491baaf92b0adb2cd`, and arm64-v8a/armeabi-v7a/x86/x86_64 native runtimes. The test-certificate SHA-256 is `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. Google bundletool 1.18.3 validates the AAB and converts it into `artifacts/aab-universal.apk` for device installation. The strict signature gate accepts the genuine packages and rejects the copied AAB with an added unsigned payload, clearing its previous verification flag.

The packaged manifest has backup and cleartext disabled, no debuggable flag, and only the launcher generally exported. The profile receiver's export is permission protected. The preview source map contains 1,951 modules and no deepmerge/minimatch source paths.

**Fresh device retest is pending.** On resumption, the laptop had about 5.2–5.5 GiB available RAM, below the retained 6.5 GiB start threshold. No emulator was launched around that safeguard. Metro is running on loopback and responds ready. Prior milestone native checks remain in `docs/verification.md`; they do not establish that these fresh packages were device-tested.

## Security check

Checked expression allowlists and bounded evaluation; storage size/schema/record validation and mutation ordering; unknown-data preservation; native text rendering and explicit sharing; preview/release backup, exported components, cleartext/debug isolation; ignored secrets/signing inputs; dependency advisories; and complete AAB payload signature coverage. The current app has no backend, accounts, payments, uploads, WebView or live AI endpoint, so corresponding server/auth/webhook controls do not apply to this milestone.

Remaining limitations: double-precision arithmetic and sampled plots cannot guarantee arbitrary precision, continuity or unknown interpolation error. Conservative precision failures remain possible. Unknown/corrupt notebooks are preserved read-only; automatic recovery/reset UI is not implemented. Physical devices, other Android API levels, actual TalkBack speech and iOS require separate verification. Builds use the public Android test certificate; production upload signing is still separate. Additional formulas await the user; the live AI API remains the last planned feature.
