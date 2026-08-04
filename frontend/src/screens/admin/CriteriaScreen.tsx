import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, View } from 'react-native';
import TextInput from '../../components/TextInput';
import Text from '../../components/Text';
import Button from '../../components/Button';
import { ApiError } from '../../api/client';
import { createCriterion, deleteCriterion, JudgingCriterion, listCriteria, updateCriterion } from '../../api/judging';
import { useAuth } from '../../auth/AuthContext';
import Card from '../../components/Card';
import CohortPicker from '../../components/CohortPicker';
import ProgressBar from '../../components/ProgressBar';
import KeyboardAvoidingScreen from '../../components/KeyboardAvoidingScreen';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';

export default function CriteriaScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const accentList = Object.values(colors.accents);
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
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Guards against an in-flight request for a since-abandoned cohort
  // resolving after a newer one and clobbering it with stale data.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!token || !cohortId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await listCriteria(cohortId, token);
      if (requestIdRef.current === requestId) setCriteria(data);
    } catch (e) {
      if (requestIdRef.current === requestId) {
        setError(e instanceof Error ? e.message : 'Failed to load criteria');
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
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      setTimeout(() => setConfirmingDeleteId((current) => (current === id ? null : current)), 4000);
      return;
    }
    setConfirmingDeleteId(null);
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

  const activeWeightTotal = criteria.filter((c) => c.active).reduce((sum, c) => sum + c.weight, 0);
  const weightMismatch = criteria.some((c) => c.active) && activeWeightTotal !== 100;

  return (
    <KeyboardAvoidingScreen>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <CohortPicker selectedCohortId={cohortId} onSelect={setCohortId} />

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {weightMismatch ? (
        <Text style={styles.warning}>
          Active criteria weights add up to {activeWeightTotal}%, not 100% — scores may not total correctly.
        </Text>
      ) : null}

      {criteria.map((c, i) =>
        editingId === c.id ? (
          <Card key={c.id} style={styles.card}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Name" />
            <Text style={styles.fieldLabel}>Weight</Text>
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
              <Button label="Save" onPress={onSaveEdit} size="sm" accessibilityLabel="Save criterion" />
              <Button
                label="Cancel"
                onPress={() => setEditingId(null)}
                size="sm"
                variant="secondary"
                accessibilityLabel="Cancel editing"
              />
            </View>
          </Card>
        ) : (
          <Card key={c.id} tint={accentList[i % accentList.length]} style={styles.card}>
            <Text style={styles.cardTitle}>
              {c.name} {!c.active ? '(retired)' : ''}
            </Text>
            <ProgressBar
              value={c.weight / 100}
              color={c.active ? accentList[i % accentList.length].accent : colors.border}
            />
            <Text style={styles.cardMeta}>{c.weight}% of the total score</Text>
            <View style={styles.rowButtons}>
              <Button label="Edit" onPress={() => startEdit(c)} size="sm" accessibilityLabel={`Edit ${c.name}`} />
              <Button
                label={confirmingDeleteId === c.id ? 'Tap again to confirm' : 'Delete'}
                onPress={() => onDelete(c.id)}
                size="sm"
                variant="dangerOutline"
                accessibilityLabel={confirmingDeleteId === c.id ? 'Tap again to confirm delete' : `Delete ${c.name}`}
              />
            </View>
          </Card>
        )
      )}

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Add criterion</Text>
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Name" />
        <Text style={styles.fieldLabel}>Weight</Text>
        <TextInput
          style={styles.input}
          value={newWeight}
          onChangeText={setNewWeight}
          placeholder="Weight (0-100)"
          keyboardType="numeric"
        />
        <Button label="Add" onPress={onCreate} style={styles.button} accessibilityLabel="Add criterion" />
      </Card>
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
    card: { borderRadius: radius.xxl },
    cardTitle: { ...typography.body, fontWeight: '600' },
    cardMeta: { ...typography.caption, color: colors.textMuted },
    fieldLabel: { ...typography.label, color: colors.textMuted },
    body: { ...typography.body },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      fontSize: 15,
      backgroundColor: colors.surface,
    },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowButtons: { flexDirection: 'row', gap: spacing.sm },
    button: { marginTop: spacing.xs },
    warning: {
      ...typography.caption,
      color: colors.accents.amber.fg,
      backgroundColor: colors.accents.amber.tint,
      padding: spacing.md,
      borderRadius: radius.sm,
    },
    error: { color: colors.danger },
  });
}
