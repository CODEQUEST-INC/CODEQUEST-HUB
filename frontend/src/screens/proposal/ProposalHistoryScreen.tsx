import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { getProposalHistory, ProposalVersionResponse } from '../../api/proposals';
import { useAuth } from '../../auth/AuthContext';
import { ProposalStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProposalStackParamList, 'ProposalHistory'>;

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
        <ActivityIndicator />
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
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            v{item.versionNumber} · {item.action}
          </Text>
          <Text style={styles.cardMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
          {item.feedback ? <Text style={styles.feedback}>{item.feedback}</Text> : null}
        </View>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No version history yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 24, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
  },
  cardTitle: { fontWeight: '600', fontSize: 14, textTransform: 'capitalize' },
  cardMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  feedback: { fontSize: 14, color: '#374151', marginTop: 8 },
  emptyText: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
  error: { color: '#dc2626', textAlign: 'center' },
});
