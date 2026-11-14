import React, { useEffect, useState } from 'react';
import {
  Animated,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../shared/theme';
import { LiquidTabSurface } from './LiquidTabSurface';
import { useReducedMotion } from '../../shared/ui/useReducedMotion';

export function RaisedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const barColor = isDark ? colors.surfaceAlt : colors.primary;
  const barInk = isDark ? colors.text : colors.onPrimary;
  const circleColor = isDark ? colors.text : colors.onPrimary;
  const circleInk = isDark ? colors.background : colors.text;
  const { fontScale } = useWindowDimensions();
  const shortLabels: Record<string, string> = {
    Methods: 'Solve',
    Notebook: 'Notes',
    Learn: 'Learn',
    Settings: 'Setup',
  };
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [keyboard, setKeyboard] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 84 });
  const { width, height } = size;
  const active = state.routes[state.index];
  const [displayedKey, setDisplayedKey] = useState(active.key);
  const displayed =
    state.routes.find(route => route.key === displayedKey) ?? active;
  const center =
    12 + ((width - 24) / state.routes.length) * (state.index + 0.5);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboard(true),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboard(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (keyboard) return null;
  const renderTabs = (location?: Animated.AnimatedInterpolation<number>) =>
    state.routes.map((route, index) => {
      const focused = state.index === index;
      const { options } = descriptors[route.key];
      const color = barInk;
      const tabCenter =
        12 + ((width - 24) / state.routes.length) * (index + 0.5);
      return (
        <Pressable
          key={route.key}
          accessibilityRole="tab"
          accessibilityLabel={`${route.name}, tab, ${index + 1} of ${
            state.routes.length
          }`}
          accessibilityLargeContentTitle={route.name}
          accessibilityState={{ selected: focused }}
          onPress={() => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented)
              navigation.navigate(route.name, route.params);
          }}
          onLongPress={() =>
            navigation.emit({ type: 'tabLongPress', target: route.key })
          }
          style={({ pressed }) => [
            styles.item,
            { opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <Animated.View
            testID={`tab-icon-${route.name}`}
            style={[
              styles.icon,
              {
                opacity: location
                  ? location.interpolate({
                      inputRange: [
                        tabCenter - 46,
                        tabCenter - 28,
                        tabCenter + 28,
                        tabCenter + 46,
                      ],
                      outputRange: [1, 0, 0, 1],
                      extrapolate: 'clamp',
                    })
                  : focused
                  ? 0
                  : 1,
              },
            ]}
          >
            {options.tabBarIcon?.({
              focused: false,
              color: barInk,
              size: 22,
            })}
          </Animated.View>
          <Text style={[styles.label, { color }]}>
            {fontScale > 1.5
              ? shortLabels[route.name] ?? route.name
              : route.name}
          </Text>
        </Pressable>
      );
    });
  return (
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
          paddingBottom: Math.max(8, insets.bottom),
        },
      ]}
    >
      <View
        onLayout={event => {
          const next = {
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height ?? 84,
          };
          setSize(current =>
            current.width === next.width && current.height === next.height
              ? current
              : next,
          );
        }}
        style={styles.bar}
      >
        {width > 0 ? (
          <LiquidTabSurface
            width={width}
            height={height}
            center={center}
            selectedKey={active.key}
            reducedMotion={reducedMotion}
            barColor={barColor}
            circleColor={circleColor}
            onArrival={setDisplayedKey}
            renderTabs={renderTabs}
          >
            {descriptors[displayed.key].options.tabBarIcon?.({
              focused: true,
              color: circleInk,
              size: 22,
            })}
          </LiquidTabSurface>
        ) : (
          renderTabs()
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  safeArea: { paddingTop: 8, paddingHorizontal: 16 },
  bar: { flexDirection: 'row', paddingHorizontal: 12 },
  item: {
    flex: 1,
    minWidth: 48,
    minHeight: 84,
    paddingTop: 22,
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  icon: {
    width: 48,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
