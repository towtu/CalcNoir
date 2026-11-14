# Android launch / laptop freeze investigation

Date: 2026-11-13. Project: this Numerical/calcnoir checkout (Almost Exact), not the separate `~/Projects/Calculix` checkout.

Follow-up: the user subsequently requested universal protection. npm Android
scripts now use a shared user-wide guard, and this project's guard reuses actual
inherited limits. The local-only scope descriptions below record the initial
implementation; see the [current universal setup](/home/kobinggg/Projects/arch-setup-map/docs/universal-android-guard-2026-11-13.md).

## Evidence and limits

The user reported an unresponsive laptop after an Android npm command and held the power button to recover. The previous boot's journal ended at 13:27:54 +08:00; the current boot started at 13:28:56. Focused kernel checks found no recorded host OOM kill, panic, NVIDIA Xid/hang, storage I/O timeout, or thermal shutdown near the incident. An abrupt loss of power can prevent final diagnostics from being written. Therefore the precise freeze cause is **not proven**.

CalcNoir's Gradle daemon started at 13:24:06 with a 2 GiB Java heap. KVM guest starts were also present before the freeze. Source inspection showed that `npm run android` could launch an emulator and compile at the same time without an overall resource limit. Gradle had no worker limit; CMake's saved Ninja command had no `-j` restriction, and its generated compile rules had no compiler job pool. An environment variable limiting CMake alone did not bound this direct Ninja invocation. These are concrete workload risks on a 16 GiB machine already running browsers and local services; they are not retrospective proof of RAM exhaustion.

After reboot, approximately 6.8–7.1 GiB RAM was available, swap was unused, and the filesystem had approximately 58 GiB free (88% used). No failed system/user services were listed. Older Chromium and adb coredumps did not coincide with the final freeze. The pre-existing Quickshell/Qt package mismatch remains a separate known desktop issue; this task has not changed the shell, graphics driver, kernel, suspend behavior, or existing NVIDIA freeze workaround.

## Applied changes

- The normal Android development command and local APK/AAB builds run inside user systemd resource scopes: 4.5 GiB RAM, 256 MiB swap, 512 tasks; RAM throttling starts at 4 GiB. Compilation is capped at 200% CPU; emulator/deployment at 400%, with two guest CPU cores.
- A preflight reserves 2 GiB host RAM above the job allowance and checks swap/disk headroom. A checkout lock prevents simultaneous guarded builds. The foreground guard stops only its own scope on sustained low host memory, interruption or a 45-minute timeout. There is no unbounded fallback.
- Gradle has one worker, parallel project execution disabled, a 1536 MiB Java heap, 512 MiB metaspace, two visible Java processors, and no reusable daemon. Kotlin compiles in-process. A test with 384 MiB metaspace produced a Gradle warning, so the final configuration retains 512 MiB.
- The native compile and link rules share one Ninja job pool. Child Node heaps are limited to 1024 MiB; Metro already used two workers. The optional Docker build retains separate container limits, now 4.5 GiB RAM / 256 MiB swap / two CPUs.
- The debug workflow compiles before opening an emulator, then installs the APK without invoking Gradle again. The launch helper cold-boots using the existing software renderer without loading an interrupted snapshot and waits for Android to finish booting. A trial limiting the emulator to two host CPUs did not finish booting within three minutes; the final four-CPU allowance booted successfully within the limit.
- `.cache/android-resource-last.json` holds compact job results, without command arguments, environment variables or credentials. No permanent system service or general-purpose watcher was installed.

## Verification

Eight safeguard checks pass: seven resource tests cover low RAM, swap/disk headroom, duplicate job rejection, bounded command arguments, pressure cancellation limited to the owned scope, and failure-status propagation. A shell-flow regression test uses stand-in SDK tools to verify compile -> emulator -> installation order; it fails against the backed-up original launcher and passes against the final launcher. Bash syntax checks pass.

A real child and grandchild ran in the same cgroup; actual kernel values were `memory.max=4831838208`, `memory.swap.max=268435456`, and `cpu.max=200000 100000`. Generated native rules contain the shared `ae_low_memory` pool at depth 1, assigned to 61 compile/link rules.

The guarded x86_64 debug build passed in 3m11s (144 tasks), with sampled peak 3207.7 MiB. A build with the final 512 MiB metaspace configuration passed in 14s. Application typecheck, lint and all 122 tests in six suites passed. The final emulator/deployment profile booted Android, installed the debug APK successfully, and returned success for its MAIN activity launch (127.1s, sampled peak 4098.9 MiB). Kernel cgroup counters recorded zero limit hits and zero OOM kills, with memory throttling above 4 GiB. Metro was not started, so this is not a full interactive application-content check. The test emulator had exited before final cleanup found its scope already gone; no user apps were terminated. The launcher now explicitly gives the GUI its own session, verified by the shell-flow test to survive CLI exit. No deliberate host memory exhaustion or forced reboot was used.

New emulator windows were observed floating at 320×640 automatically after adding class `Emulator` rules to `~/.config/caelestia/hypr-user.conf`. They are fully opaque, without compositor blur, shadow or rounding. These window rules apply across projects; resource guards apply only to this checkout. Hyprland reported no config errors. The existing allowlisted setup builder and renderer were refreshed (477 nodes, 795 links, 164 live bindings).

See [curated verification data](laptop-freeze-2026-11-13-verification.json). Source changes were reviewed against the before-edit copies to avoid incorporating unrelated work. Security check: no new dependencies or privileges, no shell evaluation of command arguments, no credential logging, and cancellation targets only the uniquely named scope created by the job.

## Rollback

Before-edit copies and a SHA-256 manifest are in `~/.local/state/calcnoir-crash-fix/20261113-133942/`. They cover the launch/build scripts, Gradle properties, app Gradle configuration, README and Android build guide. The app Gradle copy was reconstructed by reversing only this task's inserted job-pool block after the initial copy encountered a missing backup subdirectory. Review current differences before restoring any file, because this checkout already contains substantial unrelated work. Reverting these changes removes the new workload protections.

New source files are `scripts/android-resource-guard.py`, `scripts/android-launch.sh`, two Python safeguard test files, and these investigation/verification notes. Android usage and the limits of local versus Docker protection are described in [android-build.md](android-build.md). The previous desktop rule file is backed up as `hypr-user.conf` in the same backup directory; restore it after reviewing newer edits, then reload Hyprland to undo the floating rule.

## References

- [Gradle worker/JVM configuration](https://docs.gradle.org/current/userguide/build_environment.html)
- [systemd cgroup resource controls](https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html)
- [Android native build arguments](https://developer.android.com/studio/projects/gradle-external-native-builds.html)
- [CMake native compile job pools](https://cmake.org/cmake/help/latest/prop_tgt/JOB_POOL_COMPILE.html)
