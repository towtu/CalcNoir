/**
 * Browser shim for the `react-native` module specifier.
 *
 * `vite.config.ts` points every `react-native` import here — the app's own code
 * and the React Native packages in `node_modules` alike. It re-exports
 * react-native-web unchanged and fills the two gaps that otherwise stop the
 * preview from booting. Nothing in `src/`, `android/` or `ios/` is modified.
 */
import { applyWebPatches } from './patches';

export * from 'react-native-web';

applyWebPatches();

const warned = new Set<string>();

/**
 * A permissive stand-in for a native module. Every property reads back as a
 * no-op function, so a module grabbed at import time never throws and an
 * accidental call is inert.
 */
function nativeModuleStub(name: string): unknown {
  if (!warned.has(name)) {
    warned.add(name);
    console.warn(
      `[CalcNoir preview] Native module "${name}" is unavailable in the browser; using a no-op stub.`,
    );
  }

  return new Proxy(
    {},
    {
      get: (_target, property) =>
        property === 'toString' ? () => `[stub ${name}]` : () => undefined,
    },
  );
}

/**
 * react-native-web has no TurboModule registry. `get` returning `null` is what
 * React Native does on a platform that lacks the module, which is the branch
 * `NativeNotebookDatabase`, react-native-screens and react-native-safe-area-context
 * already handle. react-native-svg instead calls `getEnforcing` at import time,
 * so that path returns a stub rather than throwing — its web renderer does the
 * actual drawing and never needs the native module.
 */
export const TurboModuleRegistry = {
  get<T>(_name: string): T | null {
    return null;
  },
  getEnforcing<T>(name: string): T {
    return nativeModuleStub(name) as T;
  },
};
