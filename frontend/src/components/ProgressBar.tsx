import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors, radius, useTheme } from '../theme';

interface ProgressBarProps {
  value: number; // 0-1
  color?: string;
  height?: number;
}

export default function ProgressBar({ value, color, height = 6 }: ProgressBarProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color ?? colors.primary }]} />
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    track: {
      width: '100%',
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSunken,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
    },
  });
}
