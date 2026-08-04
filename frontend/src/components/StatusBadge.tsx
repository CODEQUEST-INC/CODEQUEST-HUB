import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from './Text';
import { ProposalStatus } from '../api/proposals';
import { proposalStatusStyle, radius, spacing, useTheme } from '../theme';

export default function StatusBadge({ status }: { status: ProposalStatus }) {
  const { colors } = useTheme();
  const style = proposalStatusStyle(colors, status);

  return (
    <View style={[styles.badge, { backgroundColor: style.tint }]}>
      <Feather name={style.icon} size={11} color={style.fg} />
      <Text style={[styles.text, { color: style.fg }]}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  text: { fontWeight: '600', fontSize: 12 },
});
