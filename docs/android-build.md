# Android builds

Use Node 22.13+ (Node 22), 24.3+ (Node 24), or Node 26+, JDK 17, the Android SDK configured by `android/build.gradle`, and Python 3.11+ for archive and signature verification. Install the pinned packages with `npm ci`. Set `JAVA_HOME` and `ANDROID_HOME` for your machine. The scripts have fallbacks for the existing local Calculix toolchain but these can be overridden normally.

```bash
npm run check
npm run android:apk
npm run android:aab
```

The default variant is **preview**, a release-style bundle with embedded JavaScript, signed using the conventional Android debug certificate. It installs as `com.towtu.almostexact.preview`, separately from the original app. These artifacts are for direct testing, not Google Play uploads.

Outputs are `artifacts/calcnoir-preview.apk` and `.aab`, with SHA-256 values, ABI lists, bundle checks and signing status in `artifacts/manifest-preview.json`. The script verifies archive integrity, embedded JavaScript/Hermes, the notebook provider marker for every packaged CPU architecture, APK/JAR signatures and matching signer identities. It clears stale success metadata before inspecting new files. Signature evidence is written beside the manifest. See verification.md for the exact emulator coverage. These checks do not certify Google Play readiness.

## Laptop resource safeguards

On this Arch laptop, keep using `npm run android` and the `android:apk` / `android:aab` scripts. This checkout retains its own `scripts/android-resource-guard.py` fallback. A subsequent user-wide npm script-shell guard now also protects Android-prefixed npm scripts across projects; this local guard verifies and reuses an inherited global cgroup instead of creating a sibling scope. The global profile supplies four CPUs per job and a shared 6 GiB budget for all protected runtimes. Direct calls to these local scripts keep their original local limits. No administrator access or permanent worker is required. Running `./gradlew` directly outside a guarded npm script bypasses the host guard. See the [universal configuration and rollback](/home/kobinggg/Projects/arch-setup-map/docs/universal-android-guard-2026-11-13.md).

Run these in two terminals, both inside `calcnoir`:

```bash
# Terminal 1: leave running while developing
npm start
# Terminal 2
npm run android
```

The development command first assembles the debug APK, verifies Metro on loopback and prepares its Android bundle, then opens/uses a device and installs that APK without invoking Gradle again. Missing or failed Metro stops before emulator startup with an actionable message. `npm start` listens on 127.0.0.1 by default; the Android CLI uses adb reverse for the emulator or USB phone. An explicit `--port` is honored by the readiness check. Wireless development requires an intentional network listener and device configuration.

New emulator startup is separate from compilation and cold JavaScript transformation. The launch helper cold-boots with the existing software renderer, waits up to three minutes for Android to finish booting, and preserves device data. When present and `ANDROID_AVD_HOME` is unset, it uses this checkout's `.cache/avd` (API 35, 1536 MiB guest RAM, 750×1624 at 320 dpi); otherwise the first configured AVD is used. The smaller local test configuration replaces its previous 2 GiB/1080×2400 profile; the before-edit config is `.cache/avd/AlmostExact.avd/config-before-qa.ini`. No shared/global AVD settings or resource limits were changed. `--binary-path <apk>` skips compilation. A connected device supplies the target ABI; otherwise the local emulator build defaults to `x86_64`. Set `AE_ANDROID_ARCHITECTURES` explicitly for another target or mixed devices. This command builds debug; other variants use the APK/AAB scripts.

The guard requires **6.5 GiB available RAM**, 1 GiB free swap when swap exists, and 8 GiB free disk before starting. It permits only one guarded job in this checkout at a time. It gives that job and its newly launched children a combined **4.5 GiB RAM / 256 MiB swap** allowance, with memory throttling above 4 GiB and 512 tasks. Build jobs get two CPU cores of processing time; emulator/deployment jobs get four, with two guest CPU cores, so the guest can boot without competing with compilation. It cancels only that scope after three low-memory samples (less than 1.5 GiB available RAM or 512 MiB remaining swap), on interruption, or after 45 minutes. It never retries without limits.

Gradle uses one worker, a 1536 MiB Java heap, no persistent daemon, and an in-process Kotlin compiler. CMake assigns native compilation and linking to one shared Ninja job pool; limiting Gradle alone would not constrain Ninja's compiler processes. Metro already uses two workers. Android scripts cap their child Node heaps at 1024 MiB.

An emulator already running elsewhere is outside the new scope; its memory is included in the preflight's host usage. On this 16 GiB laptop you may need to close that emulator before rebuilding, or use a physical phone. An emulator started by `npm run android` inherits the scope's limits and can remain there after a successful launch. The pressure watcher ends when the launch command exits; kernel resource limits remain for any surviving scope children. On a failed launch the guard stops its own scope, including any emulator it started, while preserving pre-existing apps and emulators.

The latest job's unit, exit status, duration and sampled memory peak are in `.cache/android-resource-last.json`; no environment variables or command arguments are recorded there. To stop a surviving owned emulator, use `systemctl --user stop <unit-from-that-file>`. The optional Docker runner uses its own two-CPU / 4.5 GiB RAM / 256 MiB swap container limits; it does not use the local guard's host-pressure watcher or checkout lock.

Run the deterministic safeguard tests with:

```bash
/usr/bin/python3 scripts/test_android_resource_guard.py
/usr/bin/python3 scripts/test_android_launch_order.py
/usr/bin/python3 scripts/test_android_metro.py
/usr/bin/python3 scripts/test_android_signatures.py
```

See [freeze investigation and verification](laptop-freeze-2026-11-13.md). The safeguards address an observed unbounded workload; they do not prove the cause of the earlier forced shutdown or cover unrelated applications.

## Local container build

The development sandbox can block Gradle's loopback lock/daemon sockets. A local Docker build runner is available:

```bash
docker pull node:22-bookworm-slim
AE_BUILD_RUNNER=docker AE_GRADLE_OFFLINE=1 npm run android:artifacts
```

The offline command requires Gradle dependencies already cached in `.cache/gradle`. The container mounts this checkout read/write and the selected SDK/JDK read only, has no host network and no extra privileges, and limits CPU/RAM. It does not change the original checkout or global desktop setup. Use the normal local build first on machines without the sandbox limitation.

The local verification runner uses the pulled Node image digest `sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee`. Set `AE_ANDROID_BUILD_IMAGE` to that digest or another compatible Node 22 image when reproducing the environment. `AE_ANDROID_ARCHITECTURES` can restrict an explicit test build, for example `x86_64`; verify the artifact manifest before distributing it to a phone.

## Production signing

Production release never silently falls back to the debug certificate. Supply an existing upload key and these environment variables, outside Git:

```text
AE_RELEASE_STORE_FILE
AE_RELEASE_STORE_PASSWORD
AE_RELEASE_KEY_ALIAS
AE_RELEASE_KEY_PASSWORD
```

Then set `AE_ANDROID_VARIANT=release` when invoking the build. Missing signing input fails before the build. Keep the key and passwords private and backed up; do not paste them into chat, scripts, logs or version control. Google Play upload and production key creation have not been authorized or performed by the local preview build.

## Rollback and cleanup

Uninstall only `com.towtu.almostexact.preview` to remove this test app; this also removes that preview's local notebook. The original app is separate. Stop any owned test containers/emulators before removing ignored `.cache/` or generated `artifacts/`. The original repository and its APK are untouched.

## Development connection readiness

The launcher checks Metro twice: host-side before opening Android (and warms the
bundle), then from the selected device before installation/start. API 35 cold boot
was observed reporting boot complete while its first Metro connection still
failed. The device probe waits up to 60 seconds for the actual Metro status over
the emulator host endpoint or the phone's adb reverse endpoint. It never opens a
new development activity while that check fails. `--port` is validated and passed
into the native debug build as well as both readiness checks. A physical device
whose OEM omits `toybox nc` may require separate connection troubleshooting; the
script reports failure rather than treating host readiness as device readiness.
Packaged preview APKs/AABs carry their JavaScript and do not require Metro.

## Owned test-emulator motion and SQLite checks (2026-11-14)

The owned AVD had `window_animation_scale`, `transition_animation_scale` and `animator_duration_scale` at zero. They were set to one for this app's motion QA only. The before/applied values are in ignored `artifacts/redesign/emulator-animation-settings.json`; restore those three values there to reproduce the previous test profile. This does not alter the host desktop or another AVD. Physical-device reduced-motion settings are always respected by CalcNoir. Screen size, density and font scale are temporarily overridden for 375/768/1440dp and 320dp with 2x font tests, then restored to the project's 750×1624, 320dpi, 1.0 font profile.

If adding an app-level TurboModule to a previously built checkout, old app CMake configuration can omit its new generated provider even though Kotlin compiles. The observed fix was to remove only generated `android/app/.cxx/Debug` and `RelWithDebInfo` configurations while the owned emulator was stopped, then rebuild through the guarded npm script. A clean checkout configures after codegen normally. Preserve the private SQLite/legacy files; clearing application data is not a module-linkage repair.
