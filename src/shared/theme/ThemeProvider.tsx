import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

const light = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F5F5',
  text: '#111111',
  muted: '#595959',
  border: '#D1D1D1',
  inputBorder: '#888888',
  primary: '#111111',
  accent: '#111111',
  primarySoft: '#ECECEC',
  onPrimary: '#FFFFFF',
  secondary: '#333333',
  secondarySoft: '#ECECEC',
  warning: '#333333',
  warningSoft: '#F1F1F1',
  danger: '#111111',
  dangerSoft: '#ECECEC',
};
export type ThemeColors = { [K in keyof typeof light]: string };
const dark: ThemeColors = {
  background: '#101010',
  surface: '#181818',
  surfaceAlt: '#242424',
  text: '#FAFAFA',
  muted: '#B8B8B8',
  border: '#555555',
  inputBorder: '#888888',
  primary: '#FAFAFA',
  accent: '#FAFAFA',
  primarySoft: '#333333',
  onPrimary: '#111111',
  secondary: '#E0E0E0',
  secondarySoft: '#303030',
  warning: '#F0F0F0',
  warningSoft: '#303030',
  danger: '#FFFFFF',
  dangerSoft: '#333333',
};
interface ThemeValue {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  storageWarning: string | null;
}
const Context = createContext<ThemeValue | null>(null);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setDark] = useState(false);
  const [storageWarning, setWarning] = useState<string | null>(null);
  const selection = useRef({ isDark: false, revision: 0 });
  const pendingWrite = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(false);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    AsyncStorage.getItem('almost-exact.theme.v1')
      .then(value => {
        if (active && selection.current.revision === 0) {
          const next = value === 'dark';
          selection.current.isDark = next;
          setDark(next);
        }
      })
      .catch(() => {
        if (active && selection.current.revision === 0) {
          setWarning('Your theme could not be loaded.');
        }
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, []);
  const toggleTheme = () => {
    // Refs advance immediately, so batched presses compose before React renders.
    const next = !selection.current.isDark;
    const revision = selection.current.revision + 1;
    selection.current = { isDark: next, revision };
    setDark(next);
    setWarning(null);
    // Keep persistence in selection order, including after a failed write.
    pendingWrite.current = pendingWrite.current
      .then(() =>
        AsyncStorage.setItem('almost-exact.theme.v1', next ? 'dark' : 'light'),
      )
      .then(() => {
        if (mounted.current && revision === selection.current.revision) {
          setWarning(null);
        }
      })
      .catch(() => {
        if (mounted.current && revision === selection.current.revision) {
          setWarning('Theme changed for this session, but could not be saved.');
        }
      });
  };
  return (
    <Context.Provider
      value={{
        colors: isDark ? dark : light,
        isDark,
        toggleTheme,
        storageWarning,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useTheme(): ThemeValue {
  const value = useContext(Context);
  if (!value) {
    throw new Error('ThemeProvider is required.');
  }
  return value;
}
