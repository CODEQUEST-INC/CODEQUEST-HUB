import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { assignJudge, Judge, listJudges, removeJudge } from '../../api/judging';
import { useAuth } from '../../auth/AuthContext';
import CohortPicker from '../../components/CohortPicker';
import { useUserNames, userLabel } from '../../hooks/useUserNames';

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

      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {judges.map((j) => (
        <View key={j.id} style={styles.card}>
          <Text style={styles.cardTitle}>{userLabel(j.userId, names)}</Text>
          <Pressable style={styles.smallDangerButton} onPress={() => onRemove(j.id)}>
            <Text style={styles.smallDangerButtonText}>Remove</Text>
          </Pressable>
        </View>
      ))}
      {judges.length === 0 && !loading ? <Text style={styles.emptyText}>No judges assigned yet.</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assign judge</Text>
        <Text style={styles.hint}>Enter the user's ID (UUID) — there's no user search yet.</Text>
        <TextInput style={styles.input} value={newUserId} onChangeText={setNewUserId} placeholder="User ID" />
        <Pressable style={styles.button} onPress={onAssign}>
          <Text style={styles.buttonText}>Assign</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  cardTitle: { fontWeight: '600', fontSize: 14 },
  hint: { fontSize: 12, color: '#6b7280' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  button: { backgroundColor: '#2563eb', borderRadius: 8, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  smallDangerButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  smallDangerButtonText: { color: '#dc2626', fontWeight: '600', fontSize: 13 },
  emptyText: { color: '#6b7280', textAlign: 'center' },
  error: { color: '#dc2626' },
});
