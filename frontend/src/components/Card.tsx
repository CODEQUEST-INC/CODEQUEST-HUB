import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AccentSwatch, Colors, radius, spacing, useTheme } from '../theme';

interface CardProps {
  children: React.ReactNode;
  tint?: AccentSwatch;
  style?: StyleProp<ViewStyle>;
}

export default function Card({ children, tint, style }: CardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={[styles.card, tint ? { borderLeftColor: tint.accent, borderLeftWidth: 3 } : null, style]}>
      {children}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.xs,
    },
  });
}
