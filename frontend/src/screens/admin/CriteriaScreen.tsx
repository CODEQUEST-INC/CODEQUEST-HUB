import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../api/client';
import { createCriterion, deleteCriterion, JudgingCriterion, listCriteria, updateCriterion } from '../../api/judging';
import { useAuth } from '../../auth/AuthContext';
import Card from '../../components/Card';
import CohortPicker from '../../components/CohortPicker';
import ProgressBar from '../../components/ProgressBar';
import { accentList, colors, radius, spacing, typography } from '../../theme';

export default function CriteriaScreen() {
  const { token } = useAuth();
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<JudgingCriterion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editActive, setEditActive] = useState(true);

  const load = useCallback(async () => {
    if (!token || !cohortId) return;
    setLoading(true);
    setError(null);
    try {
      setCriteria(await listCriteria(cohortId, token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load criteria');
    } finally {
      setLoading(false);
    }
  }, [token, cohortId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onCreate = async () => {
    if (!token || !cohortId) return;
    const weight = parseFloat(newWeight);
    if (!newName.trim() || Number.isNaN(weight)) {
      setError('Enter a name and a numeric weight.');
      return;
    }
    setError(null);
    try {
      await createCriterion({ cohortId, name: newName.trim(), weight }, token);
      setNewName('');
      setNewWeight('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create criterion');
    }
  };

  const startEdit = (c: JudgingCriterion) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditWeight(String(c.weight));
    setEditActive(c.active);
  };

  const onSaveEdit = async () => {
    if (!token || !editingId) return;
    const weight = parseFloat(editWeight);
    if (!editName.trim() || Number.isNaN(weight)) {
      setError('Enter a name and a numeric weight.');
      return;
    }
    setError(null);
    try {
      await updateCriterion(editingId, { name: editName.trim(), weight, active: editActive }, token);
      setEditingId(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update criterion');
    }
  };

  const onDelete = async (id: string) => {
    if (!token) return;
    setError(null);
    try {
      await deleteCriterion(id, token);
      load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError('This criterion already has submitted scores and cannot be deleted.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to delete criterion');
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <CohortPicker selectedCohortId={cohortId} onSelect={setCohortId} />

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {criteria.map((c, i) =>
        editingId === c.id ? (
          <Card key={c.id}>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Name" />
            <TextInput
              style={styles.input}
              value={editWeight}
              onChangeText={setEditWeight}
              placeholder="Weight"
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
              {c.name} {!c.active ? '(retired)' : ''}
            </Text>
            <ProgressBar
              value={c.weight / 100}
              color={c.active ? accentList[i % accentList.length].accent : colors.border}
            />
            <Text style={styles.cardMeta}>{c.weight}% of the total score</Text>
            <View style={styles.rowButtons}>
              <Pressable style={styles.smallButton} onPress={() => startEdit(c)}>
                <Text style={styles.smallButtonText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.smallDangerButton} onPress={() => onDelete(c.id)}>
                <Text style={styles.smallDangerButtonText}>Delete</Text>
              </Pressable>
            </View>
          </Card>
        )
      )}

      <Card>
        <Text style={styles.cardTitle}>Add criterion</Text>
        <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Name" />
        <TextInput
          style={styles.input}
          value={newWeight}
          onChangeText={setNewWeight}
          placeholder="Weight (0-100)"
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
  cardMeta: { ...typography.caption },
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
  smallButton: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  smallButtonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 13 },
  smallSecondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  smallSecondaryButtonText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  smallDangerButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  smallDangerButtonText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  error: { color: colors.danger },
});
