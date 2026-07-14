import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getMyGroup, GroupMember } from '../../api/groups';
import { assignTask, createTask, deleteTask, updateTask } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import { useUserNames, userLabel } from '../../hooks/useUserNames';
import { TaskStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

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
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Task title"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Optional details"
        placeholderTextColor={colors.textMuted}
        multiline
      />

      <Text style={styles.label}>Due date</Text>
      <TextInput
        style={styles.input}
        value={dueDate}
        onChangeText={setDueDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textMuted}
      />

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
        {submitting ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <Text style={styles.buttonText}>Save task</Text>
        )}
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
  container: { padding: spacing.xxl, gap: spacing.sm, backgroundColor: colors.bg },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextSelected: { color: colors.textOnPrimary },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 16 },
  deleteButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  deleteButtonText: { color: colors.danger, fontWeight: '600' },
  error: { color: colors.danger },
});
