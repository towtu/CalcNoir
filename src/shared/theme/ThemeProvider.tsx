import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

/**
 * Numelix palette — 60 / 30 / 10.
 *
 * 60  neutral: brand black #141414 and off-white #F4F4F4 carry every reading
 *     surface, so equations and step tables stay the most legible thing on
 *     screen.
 * 30  violet #983FFF: primary actions, the tab bar, active and selected state.
 * 10  blue #45C4FC: accents only, and they have to be legible as accents.
 *     In practice that means the things that point somewhere or report
 *     something rather than the things you press: row chevrons, the "Resume"
 *     link, the method chip on a saved page, progress fills, focus rings and
 *     the selected step. Violet keeps the surfaces you act on — the tab bar,
 *     method tiles, card icons, selected filters — so the two never carry the
 *     same job on one screen.
 *
 * Both brand hexes are used literally on the theme where they are legible and
 * tuned on the other one. #45C4FC scores 1.99:1 on white (it is used for graph
 * strokes and legend text, so that fails), and #983FFF scores 3.94:1 on
 * #141414. The variants below keep the same hue family above 4.5:1.
 */
const light = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F4F4',
  text: '#141414',
  muted: '#5C5C5C',
  border: '#E4E4E4',
  inputBorder: '#8A8A8A',
  primary: '#983FFF',
  accent: '#0A6E9E',
  primarySoft: '#F2E7FF',
  accentSoft: '#E2F1FA',
  onPrimary: '#FFFFFF',
  secondary: '#57129E',
  secondarySoft: '#EFE4FF',
  warning: '#333333',
  warningSoft: '#F1F1F1',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
};
export type ThemeColors = { [K in keyof typeof light]: string };
const dark: ThemeColors = {
  background: '#141414',
  surface: '#1C1C1C',
  surfaceAlt: '#221A2E',
  text: '#F4F4F4',
  muted: '#B4B4B4',
  border: '#3A3A3A',
  inputBorder: '#8A8A8A',
  primary: '#B47CFF',
  accent: '#45C4FC',
  primarySoft: '#2E1F47',
  accentSoft: '#10303F',
  onPrimary: '#141414',
  secondary: '#C9A3FF',
  secondarySoft: '#2A2036',
  warning: '#F0F0F0',
  warningSoft: '#303030',
  danger: '#FF6B6B',
  dangerSoft: '#3A1D1D',
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
