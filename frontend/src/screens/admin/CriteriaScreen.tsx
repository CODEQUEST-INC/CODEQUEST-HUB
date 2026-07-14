import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../api/client';
import { createCriterion, deleteCriterion, JudgingCriterion, listCriteria, updateCriterion } from '../../api/judging';
import { useAuth } from '../../auth/AuthContext';
import CohortPicker from '../../components/CohortPicker';

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

      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {criteria.map((c) =>
        editingId === c.id ? (
          <View key={c.id} style={styles.card}>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Name" />
            <TextInput
              style={styles.input}
              value={editWeight}
              onChangeText={setEditWeight}
              placeholder="Weight"
              keyboardType="numeric"
            />
            <View style={styles.switchRow}>
              <Text>Active</Text>
              <Switch value={editActive} onValueChange={setEditActive} />
            </View>
            <View style={styles.rowButtons}>
              <Pressable style={styles.smallButton} onPress={onSaveEdit}>
                <Text style={styles.smallButtonText}>Save</Text>
              </Pressable>
              <Pressable style={styles.smallSecondaryButton} onPress={() => setEditingId(null)}>
                <Text style={styles.smallSecondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View key={c.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {c.name} {!c.active ? '(retired)' : ''}
            </Text>
            <Text style={styles.cardMeta}>Weight: {c.weight}</Text>
            <View style={styles.rowButtons}>
              <Pressable style={styles.smallButton} onPress={() => startEdit(c)}>
                <Text style={styles.smallButtonText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.smallDangerButton} onPress={() => onDelete(c.id)}>
                <Text style={styles.smallDangerButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )
      )}

      <View style={styles.card}>
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
  cardTitle: { fontWeight: '600', fontSize: 15 },
  cardMeta: { fontSize: 13, color: '#6b7280' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowButtons: { flexDirection: 'row', gap: 8 },
  button: { backgroundColor: '#2563eb', borderRadius: 8, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  smallButton: { backgroundColor: '#2563eb', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14 },
  smallButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  smallSecondaryButton: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14 },
  smallSecondaryButtonText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  smallDangerButton: { borderWidth: 1, borderColor: '#dc2626', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14 },
  smallDangerButtonText: { color: '#dc2626', fontWeight: '600', fontSize: 13 },
  error: { color: '#dc2626' },
});
