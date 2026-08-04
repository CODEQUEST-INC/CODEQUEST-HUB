import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AccentSwatch, Colors, elevation, radius, spacing, useTheme } from '../theme';

interface CardProps {
  children: React.ReactNode;
  tint?: AccentSwatch;
  style?: StyleProp<ViewStyle>;
}

export default function Card({ children, tint, style }: CardProps) {
  const { mode, colors } = useTheme();
  const styles = createStyles(colors, mode);
  return (
    <View style={[styles.card, tint ? { borderLeftColor: tint.accent, borderLeftWidth: 3 } : null, style]}>
      {children}
    </View>
  );
}

function createStyles(colors: Colors, mode: 'light' | 'dark') {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.xs,
      ...elevation(mode, 'sm'),
    },
  });
}
