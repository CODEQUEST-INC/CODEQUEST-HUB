import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ProposalStatus } from '../api/proposals';

const STYLES: Record<ProposalStatus, { bg: string; fg: string; label: string }> = {
  draft: { bg: '#e5e7eb', fg: '#374151', label: 'Draft' },
  submitted: { bg: '#dbeafe', fg: '#1d4ed8', label: 'Submitted' },
  under_review: { bg: '#fef3c7', fg: '#b45309', label: 'Under review' },
  approved: { bg: '#dcfce7', fg: '#15803d', label: 'Approved' },
  rejected: { bg: '#fee2e2', fg: '#b91c1c', label: 'Rejected' },
  changes_requested: { bg: '#fef3c7', fg: '#b45309', label: 'Changes requested' },
};

export default function StatusBadge({ status }: { status: ProposalStatus }) {
  const style = STYLES[status];
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
