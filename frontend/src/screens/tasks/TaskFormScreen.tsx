import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getMyGroup, GroupMember } from '../../api/groups';
import { assignTask, createTask, deleteTask, updateTask } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import { useUserNames, userLabel } from '../../hooks/useUserNames';
import { TaskStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TaskStackParamList, 'TaskForm'>;

export default function TaskFormScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const { mode } = route.params;
  const existing = mode === 'edit' ? route.params.task : null;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '');
  const [assigneeId, setAssigneeId] = useState(existing?.assigneeId ?? null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    getMyGroup(token)
      .then((g) => setMembers(g.members))
      .catch(() => {});
  }, [token]);

  const names = useUserNames(members.map((m) => m.userId));

  const onSave = async () => {
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'edit') {
        await updateTask(
          existing!.id,
          { title, description: description || undefined, dueDate: dueDate || undefined },
          token
        );
        if (assigneeId && assigneeId !== existing!.assigneeId) {
          await assignTask(existing!.id, assigneeId, token);
        }
      } else {
        await createTask(
          {
            title,
            description: description || undefined,
            dueDate: dueDate || undefined,
            assigneeId: assigneeId || undefined,
          },
          token
        );
      }
      navigation.navigate('TaskBoard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!token || mode !== 'edit') return;
    setSubmitting(true);
    try {
      await deleteTask(existing!.id, token);
      navigation.navigate('TaskBoard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete task');
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Task title" />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Optional details"
        multiline
      />

      <Text style={styles.label}>Due date</Text>
      <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />

      <Text style={styles.label}>Assignee</Text>
      <View style={styles.chipRow}>
        <Pressable
          style={[styles.chip, !assigneeId && styles.chipSelected]}
          onPress={() => setAssigneeId(null)}
        >
          <Text style={[styles.chipText, !assigneeId && styles.chipTextSelected]}>Unassigned</Text>
        </Pressable>
        {members.map((m) => (
          <Pressable
            key={m.userId}
            style={[styles.chip, assigneeId === m.userId && styles.chipSelected]}
            onPress={() => setAssigneeId(m.userId)}
          >
            <Text style={[styles.chipText, assigneeId === m.userId && styles.chipTextSelected]} numberOfLines={1}>
              {userLabel(m.userId, names)}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSave} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save task</Text>}
      </Pressable>

      {mode === 'edit' ? (
        <Pressable style={styles.deleteButton} onPress={onDelete} disabled={submitting}>
          <Text style={styles.deleteButtonText}>Delete task</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#374151' },
  chipTextSelected: { color: '#fff' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: { color: '#dc2626', fontWeight: '600' },
  error: { color: '#dc2626' },
});
