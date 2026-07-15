import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getLeaderboard, LeaderboardEntry } from '../../api/judging';
import { useAuth } from '../../auth/AuthContext';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import CohortPicker from '../../components/CohortPicker';
import { accentList, colors, spacing, typography } from '../../theme';

const RANK_COLORS = [accentList[0].accent, accentList[1].accent, accentList[2].accent];

export default function LeaderboardScreen() {
  const { token } = useAuth();
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against an in-flight request for a since-abandoned cohort
  // resolving after a newer one and clobbering it with stale data.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!token || !cohortId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getLeaderboard(cohortId, token);
      if (requestIdRef.current === requestId) setEntries(data);
    } catch (e) {
      if (requestIdRef.current === requestId) {
        setError(e instanceof Error ? e.message : 'Failed to load leaderboard');
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
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

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {entries.map((e, index) => {
        const name = e.groupName ?? `Group ${e.groupNumber}`;
        const rankColor = RANK_COLORS[index] ?? colors.textMuted;
        return (
          <Card key={e.groupId} style={styles.card}>
            <Text style={[styles.rank, { color: rankColor }]}>#{index + 1}</Text>
            <Avatar name={name} size={40} />
            <View style={styles.details}>
              <Text style={styles.cardTitle}>{name}</Text>
              <Text style={styles.cardMeta}>
                {e.averageScore !== null ? `${e.averageScore} avg` : 'Not scored yet'} · {e.judgeCount} judge
                {e.judgeCount === 1 ? '' : 's'}
              </Text>
            </View>
          </Card>
        );
      })}
      {entries.length === 0 && !loading ? <Text style={styles.emptyText}>No groups in this cohort yet.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xxl, gap: spacing.sm, backgroundColor: colors.bg },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rank: { fontSize: 18, fontWeight: '800', width: 30 },
  details: { flex: 1 },
  cardTitle: { ...typography.body, fontWeight: '600' },
  cardMeta: { ...typography.caption, marginTop: 2 },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.danger },
});
