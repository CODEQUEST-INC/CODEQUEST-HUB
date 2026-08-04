import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../../components/TextInput';
import Text from '../../components/Text';
import Button from '../../components/Button';
import DatePicker from '../../components/DatePicker';
import KeyboardAvoidingScreen from '../../components/KeyboardAvoidingScreen';
import { getMyGroup, GroupMember } from '../../api/groups';
import { assignTask, createTask, deleteTask, updateTask } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import { useUserNames, userLabel } from '../../hooks/useUserNames';
import { TaskStackParamList } from '../../navigation/types';
import { Colors, radius, spacing, useTheme } from '../../theme';
import { confirmAction } from '../../utils/confirm';

type Props = NativeStackScreenProps<TaskStackParamList, 'TaskForm'>;

export default function TaskFormScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
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

  const onDelete = () => {
    if (!token || mode !== 'edit') return;
    confirmAction({
      title: 'Delete task',
      message: `Delete "${existing!.title}"? This can't be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setSubmitting(true);
        try {
          await deleteTask(existing!.id, token);
          navigation.navigate('TaskBoard');
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to delete task');
          setSubmitting(false);
        }
      },
    });
  };

  return (
    <KeyboardAvoidingScreen>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
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
      <DatePicker value={dueDate} onChange={setDueDate} placeholder="No due date" />

      <Text style={styles.label}>Assignee</Text>
      <View style={styles.chipRow}>
        <Pressable
          style={({ pressed }) => [styles.chip, !assigneeId && styles.chipSelected, pressed && styles.chipPressed]}
          onPress={() => setAssigneeId(null)}
          accessibilityRole="button"
          accessibilityState={{ selected: !assigneeId }}
        >
          <Text style={[styles.chipText, !assigneeId && styles.chipTextSelected]}>Unassigned</Text>
        </Pressable>
        {members.map((m) => (
          <Pressable
            key={m.userId}
            style={({ pressed }) => [
              styles.chip,
              assigneeId === m.userId && styles.chipSelected,
              pressed && styles.chipPressed,
            ]}
            onPress={() => setAssigneeId(m.userId)}
            accessibilityRole="button"
            accessibilityState={{ selected: assigneeId === m.userId }}
            accessibilityLabel={`Assign to ${userLabel(m.userId, names)}`}
          >
            <Text style={[styles.chipText, assigneeId === m.userId && styles.chipTextSelected]} numberOfLines={1}>
              {userLabel(m.userId, names)}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Save task"
        onPress={onSave}
        loading={submitting}
        style={[
          styles.button,
          {
            borderRadius: radius.xxxl,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 14,
            elevation: 6,
          },
        ]}
      />

      {mode === 'edit' ? (
        <Button
          label="Delete task"
          onPress={onDelete}
          disabled={submitting}
          variant="dangerOutline"
          style={styles.deleteButton}
        />
      ) : null}
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.sm, backgroundColor: colors.bg },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: spacing.sm },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      fontSize: 16,
      backgroundColor: colors.surface,
    },
    multiline: { minHeight: 70, textAlignVertical: 'top' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      minHeight: 44,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipPressed: { opacity: 0.8 },
    chipText: { color: colors.text },
    chipTextSelected: { color: colors.textOnPrimary },
    button: { marginTop: spacing.xl },
    deleteButton: { marginTop: spacing.md },
    error: { color: colors.danger },
  });
}
