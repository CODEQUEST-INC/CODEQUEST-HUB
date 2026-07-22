import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from './Text';
import { PaymentStatus } from '../api/payments';
import { AccentSwatch, Colors, radius, spacing, useTheme } from '../theme';

interface PaidBadgeProps {
  status: PaymentStatus | 'unpaid';
}

const LABELS: Record<PaymentStatus | 'unpaid', string> = {
  success: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
  unpaid: 'Unpaid',
};

export default function PaidBadge({ status }: PaidBadgeProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const tint = tintFor(colors, status);

  return (
    <View style={[styles.badge, { backgroundColor: tint.tint }]}>
      <Text style={[styles.text, { color: tint.fg }]}>{LABELS[status]}</Text>
    </View>
  );
}

function tintFor(colors: Colors, status: PaymentStatus | 'unpaid'): AccentSwatch {
  switch (status) {
    case 'success':
      return colors.accents.green;
    case 'pending':
      return colors.accents.amber;
    case 'failed':
      return colors.accents.coral;
    default:
      return colors.accents.violet;
  }
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    badge: {
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
      alignSelf: 'flex-start',
    },
    text: { fontSize: 12, fontWeight: '600' },
  });
}
