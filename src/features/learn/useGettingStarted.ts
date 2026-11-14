import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
const KEY = 'calcnoir.getting-started.v1';
export function useGettingStarted() {
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
        if (mounted.current)
          setWarning(
            'Your getting-started preference could not be read. You can still use CalcNoir.',
          );
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
    AsyncStorage.setItem(KEY, 'done').catch(() => {
      if (mounted.current)
        setWarning(
          'Getting started may appear again because the preference could not be saved.',
        );
    });
  };
  return { loading, needed, warning, finish };
}
