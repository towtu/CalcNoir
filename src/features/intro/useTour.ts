import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';

/**
 * Whether the navigation tour still has to be shown.
 *
 * Its own key, not the old getting-started one: the previous first run was a
 * three-step guided solve, and someone who finished that has still never seen
 * this tour. Starting fresh shows it once to everyone and never again.
 */
const KEY = 'numelix.tour.v1';

export function useTour() {
  const [loading, setLoading] = useState(true);
  const [needed, setNeeded] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(KEY)
      .then(value => {
        if (mounted.current) setNeeded(value !== 'done');
      })
      .catch(() => {
        if (mounted.current) {
          // An unreadable flag must not cost anyone the app. The tour is
          // skipped rather than repeated, and Settings can replay it.
          setNeeded(false);
          setWarning(
            'Your tutorial preference could not be read. You can replay the tour from Settings.',
          );
        }
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  const finish = () => {
    setNeeded(false);
    setWarning(null);
    AsyncStorage.setItem(KEY, 'done').catch(() => {
      if (mounted.current)
        setWarning(
          'The tour may appear again because the preference could not be saved.',
        );
    });
  };

  /** Settings replays it on demand; this does not touch the stored flag. */
  const replay = () => {
    setWarning(null);
    setNeeded(true);
  };

  return { loading, needed, warning, finish, replay };
}
