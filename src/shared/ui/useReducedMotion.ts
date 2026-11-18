import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * The platform reduce-motion preference, or `null` while it is still unknown.
 *
 * Most callers want {@link useReducedMotion}, which collapses the unknown
 * state to "reduced" and keeps transitions still until the native read lands.
 * The opening animation needs the three-way answer instead: it plays once, at
 * launch, so treating the first frames as "reduced" would skip the whole thing
 * for everyone. It waits for the real preference rather than guessing.
 */
export function useMotionPreference(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => {
        if (active) {
          changed = true;
          setReduced(enabled);
        }
      },
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        // A live event is newer than the initial, potentially delayed snapshot.
        if (active && !changed) {
          setReduced(enabled);
        }
      })
      .catch(() => {
        // Native preference failures retain the conservative no-animation state.
        if (active && !changed) {
          setReduced(true);
        }
      });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

export function useReducedMotion(): boolean {
  // Unknown preferences keep transitions still until the native read succeeds.
  return useMotionPreference() ?? true;
}
