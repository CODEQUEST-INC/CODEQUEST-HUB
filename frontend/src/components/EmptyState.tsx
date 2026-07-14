import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  heading: string;
  subtext?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
}

export default function EmptyState({ icon, heading, subtext, ctaLabel, onPressCta }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.heading}>{heading}</Text>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
      {ctaLabel && onPressCta ? (
        <Pressable style={styles.cta} onPress={onPressCta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, gap: spacing.sm },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heading: { ...typography.subheading, textAlign: 'center' },
  subtext: { ...typography.caption, textAlign: 'center', maxWidth: 260 },
  cta: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  ctaText: { color: colors.textOnPrimary, fontWeight: '600' },
});
