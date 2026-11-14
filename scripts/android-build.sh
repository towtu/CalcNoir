#!/usr/bin/env bash
set -euo pipefail
AE_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AE_TARGET="${1:-all}"
AE_VARIANT="${AE_ANDROID_VARIANT:-preview}"
AE_RUNNER="${AE_BUILD_RUNNER:-local}"
AE_SDK_PATH="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/home/kobinggg/.local/opt/calculix-android/sdk}}"
AE_JDK_PATH="${JAVA_HOME:-/home/kobinggg/.local/opt/calculix-android/jdk-17.0.21+9}"
if [[ ! -x "$AE_JDK_PATH/bin/java" || ! -d "$AE_SDK_PATH/platforms" ]]; then
  echo 'Set JAVA_HOME to JDK 17 and ANDROID_HOME to your Android SDK.' >&2; exit 1
fi
case "$AE_VARIANT" in
  preview) AE_GRADLE_VARIANT=Preview ;;
  release)
    AE_GRADLE_VARIANT=Release
    for AE_SIGNING_KEY in AE_RELEASE_STORE_FILE AE_RELEASE_STORE_PASSWORD AE_RELEASE_KEY_ALIAS AE_RELEASE_KEY_PASSWORD; do
      if [[ -z "${!AE_SIGNING_KEY:-}" ]]; then echo "Production signing requires $AE_SIGNING_KEY. Use preview for local testing." >&2; exit 1; fi
    done ;;
  *) echo 'AE_ANDROID_VARIANT must be preview or release.' >&2; exit 1 ;;
esac
case "$AE_TARGET" in
  apk) AE_TASKS=(":app:assemble$AE_GRADLE_VARIANT") ;;
  aab) AE_TASKS=(":app:bundle$AE_GRADLE_VARIANT") ;;
  all) AE_TASKS=(":app:assemble$AE_GRADLE_VARIANT" ":app:bundle$AE_GRADLE_VARIANT") ;;
  *) echo 'Usage: android-build.sh apk|aab|all' >&2; exit 1 ;;
esac
AE_FLAGS=(--no-daemon --max-workers=1 --console=plain)
if [[ "${AE_GRADLE_OFFLINE:-0}" == 1 ]]; then AE_FLAGS+=(--offline); fi
if [[ -n "${AE_ANDROID_ARCHITECTURES:-}" ]]; then AE_FLAGS+=("-PreactNativeArchitectures=$AE_ANDROID_ARCHITECTURES"); fi
mkdir -p "$AE_PROJECT_ROOT/.cache/gradle" "$AE_PROJECT_ROOT/.cache/android-user" "$AE_PROJECT_ROOT/artifacts"
if [[ "$AE_RUNNER" == docker ]]; then
  # The container is a build environment only. It has no host network or extra privileges.
  AE_DOCKER_ENV=(--env JAVA_HOME="$AE_JDK_PATH" --env ANDROID_HOME="$AE_SDK_PATH" --env GRADLE_USER_HOME="$AE_PROJECT_ROOT/.cache/gradle" --env ANDROID_USER_HOME="$AE_PROJECT_ROOT/.cache/android-user" --env CMAKE_BUILD_PARALLEL_LEVEL=1 --env NODE_OPTIONS=--max-old-space-size=1024)
  AE_DOCKER_MOUNTS=(--mount "type=bind,src=$AE_PROJECT_ROOT,dst=$AE_PROJECT_ROOT" --mount "type=bind,src=$AE_SDK_PATH,dst=$AE_SDK_PATH,readonly" --mount "type=bind,src=$AE_JDK_PATH,dst=$AE_JDK_PATH,readonly")
  if [[ "$AE_VARIANT" == release ]]; then
    AE_DOCKER_MOUNTS+=(--mount "type=bind,src=$AE_RELEASE_STORE_FILE,dst=$AE_RELEASE_STORE_FILE,readonly")
    AE_DOCKER_ENV+=(--env AE_RELEASE_STORE_FILE --env AE_RELEASE_STORE_PASSWORD --env AE_RELEASE_KEY_ALIAS --env AE_RELEASE_KEY_PASSWORD)
  fi
  docker run --rm --network none --cpus 2 --memory 4608m --memory-swap 4864m --pids-limit 256 --cap-drop ALL --security-opt no-new-privileges \
    --user "$(id -u):$(id -g)" "${AE_DOCKER_MOUNTS[@]}" "${AE_DOCKER_ENV[@]}" --workdir "$AE_PROJECT_ROOT/android" \
    "${AE_ANDROID_BUILD_IMAGE:-node:22-bookworm-slim}" ./gradlew "${AE_TASKS[@]}" "${AE_FLAGS[@]}"
elif [[ "$AE_RUNNER" == local ]]; then
  export JAVA_HOME="$AE_JDK_PATH" ANDROID_HOME="$AE_SDK_PATH" GRADLE_USER_HOME="$AE_PROJECT_ROOT/.cache/gradle" ANDROID_USER_HOME="$AE_PROJECT_ROOT/.cache/android-user" CMAKE_BUILD_PARALLEL_LEVEL=1
  export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=1024"
  (cd "$AE_PROJECT_ROOT/android"; /usr/bin/python3 "$AE_PROJECT_ROOT/scripts/android-resource-guard.py" -- ./gradlew "${AE_TASKS[@]}" "${AE_FLAGS[@]}")
else
  echo 'AE_BUILD_RUNNER must be local or docker.' >&2; exit 1
fi
if [[ "$AE_TARGET" != aab ]]; then
  cp "$AE_PROJECT_ROOT/android/app/build/outputs/apk/$AE_VARIANT/app-$AE_VARIANT.apk" "$AE_PROJECT_ROOT/artifacts/calcnoir-$AE_VARIANT.apk"
fi
if [[ "$AE_TARGET" != apk ]]; then
  cp "$AE_PROJECT_ROOT/android/app/build/outputs/bundle/$AE_VARIANT/app-$AE_VARIANT.aab" "$AE_PROJECT_ROOT/artifacts/calcnoir-$AE_VARIANT.aab"
fi
python3 "$AE_PROJECT_ROOT/scripts/verify-android-artifacts.py" "$AE_PROJECT_ROOT/artifacts" "$AE_VARIANT" "$AE_TARGET"
python3 "$AE_PROJECT_ROOT/scripts/verify-android-signatures.py" "$AE_PROJECT_ROOT/artifacts" "$AE_VARIANT" "$AE_TARGET" "$AE_SDK_PATH" "$AE_JDK_PATH"
