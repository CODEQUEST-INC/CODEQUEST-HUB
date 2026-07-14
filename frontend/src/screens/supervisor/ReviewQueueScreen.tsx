import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { getGroupById } from '../../api/groups';
import { getSupervisorProposals, ProposalResponse } from '../../api/proposals';
import { useAuth } from '../../auth/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { SupervisorStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SupervisorStackParamList, 'ReviewQueue'>;

interface Row {
  proposal: ProposalResponse;
  groupLabel: string;
}

export default function ReviewQueueScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const proposals = await getSupervisorProposals(token);
      const withGroups = await Promise.all(
        proposals.map(async (proposal) => {
          try {
            const group = await getGroupById(proposal.groupId, token);
            return { proposal, groupLabel: group.name ?? `Group ${group.groupNumber}` };
          } catch {
            return { proposal, groupLabel: proposal.groupId };
          }
        })
      );
      setRows(withGroups);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
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
      data={rows}
      keyExtractor={(r) => r.proposal.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('ReviewDetail', { proposal: item.proposal })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.proposal.title}</Text>
            <StatusBadge status={item.proposal.status} />
          </View>
          <Text style={styles.cardMeta}>{item.groupLabel}</Text>
        </Pressable>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No proposals from your groups yet.</Text>}
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
    gap: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontWeight: '600', fontSize: 15, flexShrink: 1 },
  cardMeta: { fontSize: 13, color: '#6b7280' },
  emptyText: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
  error: { color: '#dc2626', textAlign: 'center' },
});
