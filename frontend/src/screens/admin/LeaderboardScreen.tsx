import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getLeaderboard, LeaderboardEntry } from '../../api/judging';
import { useAuth } from '../../auth/AuthContext';
import CohortPicker from '../../components/CohortPicker';

export default function LeaderboardScreen() {
  const { token } = useAuth();
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !cohortId) return;
    setLoading(true);
    setError(null);
    try {
      setEntries(await getLeaderboard(cohortId, token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [token, cohortId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <CohortPicker selectedCohortId={cohortId} onSelect={setCohortId} />

      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {entries.map((e, index) => (
        <View key={e.groupId} style={styles.card}>
          <Text style={styles.rank}>#{index + 1}</Text>
          <View style={styles.details}>
            <Text style={styles.cardTitle}>{e.groupName ?? `Group ${e.groupNumber}`}</Text>
            <Text style={styles.cardMeta}>
              {e.averageScore !== null ? `${e.averageScore} avg` : 'Not scored yet'} · {e.judgeCount} judge
              {e.judgeCount === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      ))}
      {entries.length === 0 && !loading ? <Text style={styles.emptyText}>No groups in this cohort yet.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rank: { fontSize: 18, fontWeight: '700', color: '#6b7280', width: 32 },
  details: { flex: 1 },
  cardTitle: { fontWeight: '600', fontSize: 15 },
  cardMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  emptyText: { color: '#6b7280', textAlign: 'center' },
  error: { color: '#dc2626' },
});
