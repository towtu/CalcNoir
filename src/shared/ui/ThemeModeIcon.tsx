import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../theme';

export function ThemeModeIcon({
  mode,
  active,
}: {
  mode: 'light' | 'dark';
  active: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Svg
      testID={`appearance-${mode}-icon`}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      fill="none"
      stroke={active ? colors.text : colors.muted}
      strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {mode === 'light' ? (
        <>
          <Circle cx={12} cy={12} r={4} />
          <Path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </>
      ) : (
        <Path d="M20.7 13.1A9 9 0 0 1 10.9 3.3 9 9 0 1 0 20.7 13.1Z" />
      )}
    </Svg>
  );
}
