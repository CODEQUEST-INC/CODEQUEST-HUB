import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { getProposalHistory, ProposalVersionResponse } from '../../api/proposals';
import { useAuth } from '../../auth/AuthContext';
import Card from '../../components/Card';
import { ProposalStackParamList } from '../../navigation/types';
import { accents, colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ProposalStackParamList, 'ProposalHistory'>;

const ACTION_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  submitted: 'send',
  approved: 'check-circle',
  rejected: 'x-circle',
  changes_requested: 'edit-3',
};

const ACTION_TINT: Record<string, string> = {
  submitted: accents.violet.fg,
  approved: accents.green.fg,
  rejected: colors.danger,
  changes_requested: accents.amber.fg,
};

export default function ProposalHistoryScreen({ route }: Props) {
  const { token } = useAuth();
  const { proposalId } = route.params;
  const [versions, setVersions] = useState<ProposalVersionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      setLoading(true);
      setError(null);
      getProposalHistory(proposalId, token)
        .then((h) => setVersions(h.history))
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load history'))
        .finally(() => setLoading(false));
    }, [token, proposalId])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={[...versions].reverse()}
      keyExtractor={(v) => v.id}
      renderItem={({ item }) => {
        const tint = ACTION_TINT[item.action] ?? colors.textMuted;
        const icon = ACTION_ICON[item.action] ?? 'circle';
        return (
          <Card>
            <View style={styles.cardHeader}>
              <Feather name={icon} size={14} color={tint} />
              <Text style={[styles.cardTitle, { color: tint }]}>
                v{item.versionNumber} · {item.action.replace('_', ' ')}
              </Text>
            </View>
            <Text style={styles.cardMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
            {item.feedback ? <Text style={styles.feedback}>{item.feedback}</Text> : null}
          </Card>
        );
      }}
      ListEmptyComponent={<Text style={styles.emptyText}>No version history yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardTitle: { fontWeight: '600', fontSize: 14, textTransform: 'capitalize' },
  cardMeta: { ...typography.caption, marginTop: 2 },
  feedback: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
  error: { color: colors.danger, textAlign: 'center' },
});
