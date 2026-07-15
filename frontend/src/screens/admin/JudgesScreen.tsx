import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { UserSearchResult } from '../../api/users';
import { assignJudge, Judge, listJudges, removeJudge } from '../../api/judging';
import { useAuth } from '../../auth/AuthContext';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import CohortPicker from '../../components/CohortPicker';
import UserPicker from '../../components/UserPicker';
import { useUserNames, userLabel } from '../../hooks/useUserNames';
import { colors, radius, spacing, typography } from '../../theme';

export default function JudgesScreen() {
  const { token } = useAuth();
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [judges, setJudges] = useState<Judge[]>([]);
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
      const data = await listJudges(cohortId, token);
      if (requestIdRef.current === requestId) setJudges(data);
    } catch (e) {
      if (requestIdRef.current === requestId) {
        setError(e instanceof Error ? e.message : 'Failed to load judges');
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

  const names = useUserNames(judges.map((j) => j.userId));

  const onAssign = async (user: UserSearchResult) => {
    if (!token || !cohortId) return;
    setError(null);
    try {
      await assignJudge(cohortId, user.id, token);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign judge');
    }
  };

  const onRemove = async (judgeAssignmentId: string) => {
    if (!token) return;
    setError(null);
    try {
      await removeJudge(judgeAssignmentId, token);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove judge');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <CohortPicker selectedCohortId={cohortId} onSelect={setCohortId} />

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {judges.map((j) => {
        const name = userLabel(j.userId, names);
        return (
          <Card key={j.id} style={styles.judgeCard}>
            <Avatar name={name} size={32} />
            <Text style={styles.cardTitle}>{name}</Text>
            <Pressable style={styles.smallDangerButton} onPress={() => onRemove(j.id)}>
              <Text style={styles.smallDangerButtonText}>Remove</Text>
            </Pressable>
          </Card>
        );
      })}
      {judges.length === 0 && !loading ? <Text style={styles.emptyText}>No judges assigned yet.</Text> : null}

      <Card>
        <Text style={styles.cardTitle}>Assign judge</Text>
        <UserPicker onSelect={onAssign} placeholder="Search by name or email" />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
  judgeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: { ...typography.body, fontWeight: '600', flex: 1 },
  smallDangerButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  smallDangerButtonText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.danger },
});
