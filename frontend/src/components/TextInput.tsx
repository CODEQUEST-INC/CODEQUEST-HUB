import React from 'react';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Drop-in replacement for RN's TextInput that defaults the typed-text color
// to the theme's primary text color — without this, typed text falls back
// to the platform default (black), which is invisible in dark mode. Any
// explicit `color` in the passed style still wins.
export default function TextInput({ style, ...props }: TextInputProps) {
  const { colors } = useTheme();
  return <RNTextInput style={[{ color: colors.text }, style]} {...props} />;
}
