import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { assignJudge, Judge, listJudges, removeJudge } from '../../api/judging';
import { useAuth } from '../../auth/AuthContext';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import CohortPicker from '../../components/CohortPicker';
import { useUserNames, userLabel } from '../../hooks/useUserNames';
import { colors, radius, spacing, typography } from '../../theme';

export default function JudgesScreen() {
  const { token } = useAuth();
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUserId, setNewUserId] = useState('');

  const load = useCallback(async () => {
    if (!token || !cohortId) return;
    setLoading(true);
    setError(null);
    try {
      setJudges(await listJudges(cohortId, token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load judges');
    } finally {
      setLoading(false);
    }
  }, [token, cohortId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const names = useUserNames(judges.map((j) => j.userId));

  const onAssign = async () => {
    if (!token || !cohortId || !newUserId.trim()) return;
    setError(null);
    try {
      await assignJudge(cohortId, newUserId.trim(), token);
      setNewUserId('');
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
        <Text style={styles.hint}>Enter the user's ID (UUID) — there's no user search yet.</Text>
        <TextInput
          style={styles.input}
          value={newUserId}
          onChangeText={setNewUserId}
          placeholder="User ID"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable style={styles.button} onPress={onAssign}>
          <Text style={styles.buttonText}>Assign</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
  judgeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: { ...typography.body, fontWeight: '600', flex: 1 },
  hint: { ...typography.caption },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 15,
    backgroundColor: colors.surface,
  },
  button: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
  buttonText: { color: colors.textOnPrimary, fontWeight: '600' },
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
