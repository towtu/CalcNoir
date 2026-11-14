#!/usr/bin/env bash
# Called inside the resource guard, after compilation has completed.
set -euo pipefail
AE_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$AE_PROJECT_ROOT"
# Fail before opening Android when the debug runtime is unavailable. Warming the
# bundle also keeps cold Metro transforms from competing with Android's boot.
/usr/bin/python3 "$AE_PROJECT_ROOT/scripts/android-metro.py" "$@"
AE_DEVICE="$(timeout 10 adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')"
if [[ -z "$AE_DEVICE" ]]; then
  AE_AVD="$(emulator -list-avds | head -n 1)"
  if [[ -z "$AE_AVD" ]]; then
    echo 'Connect an Android phone or create an Android virtual device, then retry.' >&2; exit 1
  fi
  echo "Starting $AE_AVD after compilation; waiting up to 3 minutes for Android to boot."
  # Cold boot preserves device data and avoids restoring an interrupted snapshot.
  # Reparent the GUI before the CLI exits, retaining this scope's resource limits.
  AE_EMULATOR_PID="$(/usr/bin/python3 - "$AE_PROJECT_ROOT/.cache/android-emulator.log" \
    emulator -avd "$AE_AVD" -cores 2 -gpu swiftshader_indirect -no-snapshot-load -scale 0.333 -no-metrics <<'PY'
import subprocess, sys
with open(sys.argv[1], 'w') as log:
    child = subprocess.Popen(sys.argv[2:], stdin=subprocess.DEVNULL,
                             stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    print(child.pid)
PY
)"
  AE_BOOTED=0
  AE_DEADLINE=$((SECONDS + 180))
  while (( SECONDS < AE_DEADLINE )); do
    if ! kill -0 "$AE_EMULATOR_PID" 2>/dev/null; then
      echo 'Emulator exited before boot; see .cache/android-emulator.log.' >&2; exit 1
    fi
    AE_DEVICE="$(timeout 5 adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')"
    if [[ -n "$AE_DEVICE" ]] && \
       [[ "$(timeout 5 adb -s "$AE_DEVICE" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)" == 1 ]]; then
      AE_BOOTED=1; break
    fi
    sleep 2
  done
  if [[ "$AE_BOOTED" != 1 ]]; then
    echo 'Android did not finish booting within 3 minutes; stopping this launch.' >&2; exit 1
  fi
fi
AE_METRO_PORT="$(/usr/bin/python3 "$AE_PROJECT_ROOT/scripts/android-metro.py" --print-port "$@")"
timeout 10 adb -s "$AE_DEVICE" reverse "tcp:$AE_METRO_PORT" "tcp:$AE_METRO_PORT"
/usr/bin/python3 "$AE_PROJECT_ROOT/scripts/android-metro.py" --device "$AE_DEVICE" "$@"
exec "$AE_PROJECT_ROOT/node_modules/.bin/react-native" run-android --appIdSuffix debug --no-packager "$@"
