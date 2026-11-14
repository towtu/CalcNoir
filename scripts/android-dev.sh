#!/usr/bin/env bash
set -euo pipefail
AE_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AE_SDK_PATH="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/home/kobinggg/.local/opt/calculix-android/sdk}}"
AE_JDK_PATH="${JAVA_HOME:-/home/kobinggg/.local/opt/calculix-android/jdk-17.0.21+9}"
if [[ ! -x "$AE_JDK_PATH/bin/java" || ! -x "$AE_SDK_PATH/platform-tools/adb" ]]; then
  echo 'Set JAVA_HOME to JDK 17 and ANDROID_HOME to your Android SDK, then retry npm run android.' >&2
  exit 1
fi
export JAVA_HOME="$AE_JDK_PATH" ANDROID_HOME="$AE_SDK_PATH" ANDROID_SDK_ROOT="$AE_SDK_PATH"
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$AE_PROJECT_ROOT/.cache/gradle}" CMAKE_BUILD_PARALLEL_LEVEL=1
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=1024"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
# Prefer this checkout's lightweight AVD when available; respect explicit SDK settings.
if [[ -z "${ANDROID_AVD_HOME:-}" && -f "$AE_PROJECT_ROOT/.cache/avd/AlmostExact_API35.ini" ]]; then
  export ANDROID_AVD_HOME="$AE_PROJECT_ROOT/.cache/avd"
fi
mkdir -p "$GRADLE_USER_HOME"
cd "$AE_PROJECT_ROOT"
AE_METRO_PORT="$(/usr/bin/python3 "$AE_PROJECT_ROOT/scripts/android-metro.py" --print-port "$@")"
# Compile before opening an emulator. An explicit APK skips compilation.
AE_HAS_BINARY=0
for AE_ARGUMENT in "$@"; do
  case "$AE_ARGUMENT" in
    --binary-path|--binary-path=*) AE_HAS_BINARY=1 ;;
    --mode|--mode=*|--tasks|--tasks=*)
      echo 'npm run android builds debug. Use android:apk/android:aab for other variants.' >&2; exit 2 ;;
  esac
done
if [[ "$AE_HAS_BINARY" == 0 ]]; then
  AE_ARCHITECTURES="${AE_ANDROID_ARCHITECTURES:-}"
  if [[ -z "$AE_ARCHITECTURES" ]]; then
    AE_DEVICE="$(timeout 10 adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')"
    if [[ -n "$AE_DEVICE" ]]; then
      AE_ARCHITECTURES="$(timeout 10 adb -s "$AE_DEVICE" shell getprop ro.product.cpu.abi | tr -d '\r')"
    fi
    AE_ARCHITECTURES="${AE_ARCHITECTURES:-x86_64}"
  fi
  /usr/bin/python3 "$AE_PROJECT_ROOT/scripts/android-resource-guard.py" -- \
    "$AE_PROJECT_ROOT/android/gradlew" -p "$AE_PROJECT_ROOT/android" :app:assembleDebug \
    "-PreactNativeArchitectures=$AE_ARCHITECTURES" "-PreactNativeDevServerPort=$AE_METRO_PORT" --no-daemon --max-workers=1 --console=plain
  set -- --binary-path android/app/build/outputs/apk/debug/app-debug.apk "$@"
fi
# Keep Metro in its own terminal; the debug package has a separate application ID.
exec /usr/bin/python3 "$AE_PROJECT_ROOT/scripts/android-resource-guard.py" --emulator -- \
  bash "$AE_PROJECT_ROOT/scripts/android-launch.sh" "$@"
