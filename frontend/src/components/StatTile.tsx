import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from './Text';
import { AccentSwatch, Colors, elevation, radius, spacing, typography, useTheme } from '../theme';

interface StatTileProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string | number;
  tint: AccentSwatch;
}

export default function StatTile({ icon, label, value, tint }: StatTileProps) {
  const { mode, colors } = useTheme();
  const styles = createStyles(colors, mode);
  return (
    <View style={styles.tile}>
      <View style={[styles.iconWrap, { backgroundColor: tint.tint }]}>
        <Feather name={icon} size={18} color={tint.fg} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function createStyles(colors: Colors, mode: 'light' | 'dark') {
  return StyleSheet.create({
    tile: {
      flex: 1,
      minWidth: 120,
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      padding: spacing.lg,
      gap: 3,
      // elevation() is shadow-only and returns {} in dark mode (a shadow is
      // invisible against a dark ground) — a border stands in for it there.
      ...(mode === 'dark' ? { borderWidth: 1, borderColor: colors.border } : elevation(mode, 'sm')),
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: radius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    value: { ...typography.heading, fontSize: 26 },
    label: { ...typography.caption, color: colors.textMuted },
  });
}
