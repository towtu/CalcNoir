import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { ThemeModeIcon } from './ThemeModeIcon';
import { useReducedMotion } from './useReducedMotion';

export function ThemeToggle({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const position = useRef(new Animated.Value(value ? 36 : 0)).current;
  const [displayedDark, setDisplayedDark] = useState(value);
  useEffect(() => {
    if (reducedMotion) {
      position.setValue(value ? 36 : 0);
      setDisplayedDark(value);
      return;
    }
    let activeTransition = true;
    const animation = Animated.spring(position, {
      toValue: value ? 36 : 0,
      stiffness: 260,
      damping: 26,
      mass: 0.8,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (activeTransition && finished) setDisplayedDark(value);
    });
    return () => {
      activeTransition = false;
      animation.stop();
    };
  }, [value, position, reducedMotion]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Use dark theme"
      accessibilityHint="Choose light or dark appearance."
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [
        styles.track,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.inputBorder,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.icons}>
        <ThemeModeIcon mode="light" active={false} />
        <ThemeModeIcon mode="dark" active={false} />
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            backgroundColor: colors.surface,
            transform: [{ translateX: position }],
          },
        ]}
      >
        <ThemeModeIcon mode={displayedDark ? 'dark' : 'light'} active />
      </Animated.View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  track: {
    width: 84,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
  },
  icons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  thumb: {
    position: 'absolute',
    left: 3,
    top: 3,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
