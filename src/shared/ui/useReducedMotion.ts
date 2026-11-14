import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  // Unknown preferences keep transitions still until the native read succeeds.
  const [reduced, setReduced] = useState(true);

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
