import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from './Text';
import { AccentSwatch, Colors, radius, spacing, typography, useTheme } from '../theme';

interface StatTileProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string | number;
  tint: AccentSwatch;
}

export default function StatTile({ icon, label, value, tint }: StatTileProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
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

function createStyles(colors: Colors) {
  return StyleSheet.create({
    tile: {
      flex: 1,
      minWidth: 120,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    value: { ...typography.heading, fontSize: 22 },
    label: { ...typography.caption, color: colors.textMuted },
  });
}
