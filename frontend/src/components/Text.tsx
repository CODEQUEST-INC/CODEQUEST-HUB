import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Drop-in replacement for RN's Text that defaults to the theme's primary
// text color — without this, text with no explicit `color` in its style
// falls back to the platform default (black), which is invisible in dark
// mode. Any explicit `color` in the passed style still wins.
export default function Text({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  return <RNText style={[{ color: colors.text }, style]} {...props} />;
}
