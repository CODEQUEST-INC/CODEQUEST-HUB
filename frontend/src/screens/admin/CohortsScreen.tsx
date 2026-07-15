import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../api/client';
import { Cohort, createCohort, listCohorts, updateCohort } from '../../api/cohorts';
import { useAuth } from '../../auth/AuthContext';
import Card from '../../components/Card';
import { accentList, colors, radius, spacing, typography } from '../../theme';

export default function CohortsScreen() {
  const { token } = useAuth();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newYear, setNewYear] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editActive, setEditActive] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setCohorts(await listCohorts(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cohorts');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onCreate = async () => {
    if (!token) return;
    const year = parseInt(newYear, 10);
    if (!newName.trim() || Number.isNaN(year)) {
      setError('Enter a name and a numeric year.');
      return;
    }
    setError(null);
    try {
      await createCohort({ name: newName.trim(), year }, token);
      setNewName('');
      setNewYear('');
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create cohort');
    }
  };

  const startEdit = (c: Cohort) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditYear(String(c.year));
    setEditActive(c.active);
  };

  const onSaveEdit = async () => {
    if (!token || !editingId) return;
    const year = parseInt(editYear, 10);
    if (!editName.trim() || Number.isNaN(year)) {
      setError('Enter a name and a numeric year.');
      return;
    }
    setError(null);
    try {
      await updateCohort(editingId, { name: editName.trim(), year, active: editActive }, token);
      setEditingId(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update cohort');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {cohorts.map((c, i) =>
        editingId === c.id ? (
          <Card key={c.id}>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Name" />
            <TextInput
              style={styles.input}
              value={editYear}
              onChangeText={setEditYear}
              placeholder="Year"
              keyboardType="numeric"
            />
            <View style={styles.switchRow}>
              <Text style={styles.body}>Active</Text>
              <Switch value={editActive} onValueChange={setEditActive} trackColor={{ true: colors.primary }} />
            </View>
            <View style={styles.rowButtons}>
              <Pressable style={styles.smallButton} onPress={onSaveEdit}>
                <Text style={styles.smallButtonText}>Save</Text>
              </Pressable>
              <Pressable style={styles.smallSecondaryButton} onPress={() => setEditingId(null)}>
                <Text style={styles.smallSecondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </Card>
        ) : (
          <Card key={c.id} tint={accentList[i % accentList.length]}>
            <Text style={styles.cardTitle}>
              {c.name} ({c.year}) {!c.active ? '· inactive' : ''}
            </Text>
            <Pressable style={styles.smallButton} onPress={() => startEdit(c)}>
              <Text style={styles.smallButtonText}>Edit</Text>
            </Pressable>
          </Card>
        )
      )}
      {cohorts.length === 0 && !loading ? <Text style={styles.emptyText}>No cohorts yet.</Text> : null}

      <Card>
        <Text style={styles.cardTitle}>Add cohort</Text>
        <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Name (e.g. CodeQuest 2026)" />
        <TextInput
          style={styles.input}
          value={newYear}
          onChangeText={setNewYear}
          placeholder="Year"
          keyboardType="numeric"
        />
        <Pressable style={styles.button} onPress={onCreate}>
          <Text style={styles.buttonText}>Add</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
  cardTitle: { ...typography.body, fontWeight: '600' },
  body: { ...typography.body },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 15,
    backgroundColor: colors.surface,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowButtons: { flexDirection: 'row', gap: spacing.sm },
  button: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
  buttonText: { color: colors.textOnPrimary, fontWeight: '600' },
  smallButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  smallButtonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 13 },
  smallSecondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  smallSecondaryButtonText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.danger },
});
