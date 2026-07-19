import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from './Text';
import { ProposalStatus } from '../api/proposals';
import { useTheme } from '../theme';

type BadgeStyle = { bg: string; fg: string; label: string };

const LIGHT_STYLES: Record<ProposalStatus, BadgeStyle> = {
  draft: { bg: '#e5e7eb', fg: '#374151', label: 'Draft' },
  submitted: { bg: '#dbeafe', fg: '#1d4ed8', label: 'Submitted' },
  under_review: { bg: '#fef3c7', fg: '#b45309', label: 'Under review' },
  approved: { bg: '#dcfce7', fg: '#15803d', label: 'Approved' },
  rejected: { bg: '#fee2e2', fg: '#b91c1c', label: 'Rejected' },
  changes_requested: { bg: '#fef3c7', fg: '#b45309', label: 'Changes requested' },
};

const DARK_STYLES: Record<ProposalStatus, BadgeStyle> = {
  draft: { bg: '#363B47', fg: '#CBD0DA', label: 'Draft' },
  submitted: { bg: '#1E2F56', fg: '#93B4FA', label: 'Submitted' },
  under_review: { bg: '#3A2E0C', fg: '#FDE08A', label: 'Under review' },
  approved: { bg: '#123420', fg: '#86EFAC', label: 'Approved' },
  rejected: { bg: '#3A1F1F', fg: '#F87171', label: 'Rejected' },
  changes_requested: { bg: '#3A2E0C', fg: '#FDE08A', label: 'Changes requested' },
};

export default function StatusBadge({ status }: { status: ProposalStatus }) {
  const { mode } = useTheme();
  const style = (mode === 'dark' ? DARK_STYLES : LIGHT_STYLES)[status];
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.fg }]}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  text: { fontWeight: '600', fontSize: 12 },
});
