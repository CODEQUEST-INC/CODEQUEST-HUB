import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { getMyGroup } from '../../api/groups';
import { listTasksForGroup, TaskResponse, TaskStatus, updateTaskStatus } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import { useUserNames, userLabel } from '../../hooks/useUserNames';
import { TaskStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TaskStackParamList, 'TaskBoard'>;

const SECTIONS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'To do' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'done', label: 'Done' },
];

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: null,
};

export default function TaskBoardScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const group = await getMyGroup(token);
      setGroupId(group.id);
      const groupTasks = await listTasksForGroup(group.id, token);
      setTasks(groupTasks);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setGroupId(null);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load tasks');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const names = useUserNames(tasks.map((t) => t.assigneeId));

  const advanceStatus = async (task: TaskResponse) => {
    const next = NEXT_STATUS[task.status];
    if (!next || !token) return;
    try {
      const updated = await updateTaskStatus(task.id, next, token);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update task status');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!groupId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>You're not currently assigned to a group yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {SECTIONS.map((section) => {
        const sectionTasks = tasks.filter((t) => t.status === section.status);
        return (
          <View key={section.status} style={styles.section}>
            <Text style={styles.sectionHeading}>
              {section.label} ({sectionTasks.length})
            </Text>
            {sectionTasks.length === 0 ? <Text style={styles.emptySection}>Nothing here.</Text> : null}
            {sectionTasks.map((task) => (
              <Pressable
                key={task.id}
                style={styles.card}
                onPress={() => navigation.navigate('TaskForm', { mode: 'edit', task })}
              >
                <Text style={styles.cardTitle}>{task.title}</Text>
                {task.dueDate ? <Text style={styles.cardMeta}>Due {task.dueDate}</Text> : null}
                {task.assigneeId ? (
                  <Text style={styles.cardMeta}>Assigned to {userLabel(task.assigneeId, names)}</Text>
                ) : (
                  <Text style={styles.cardMeta}>Unassigned</Text>
                )}
                {NEXT_STATUS[task.status] ? (
                  <Pressable style={styles.advanceButton} onPress={() => advanceStatus(task)}>
                    <Text style={styles.advanceButtonText}>
                      Move to {SECTIONS.find((s) => s.status === NEXT_STATUS[task.status])?.label}
                    </Text>
                  </Pressable>
                ) : null}
              </Pressable>
            ))}
          </View>
        );
      })}

      <Pressable style={styles.newButton} onPress={() => navigation.navigate('TaskForm', { mode: 'create' })}>
        <Text style={styles.newButtonText}>+ New task</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  section: { marginBottom: 20 },
  sectionHeading: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  emptySection: { color: '#9ca3af', fontSize: 13 },
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    gap: 2,
  },
  cardTitle: { fontWeight: '600', fontSize: 15 },
  cardMeta: { fontSize: 12, color: '#6b7280' },
  advanceButton: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  advanceButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  newButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  newButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  emptyText: { color: '#6b7280', textAlign: 'center' },
  error: { color: '#dc2626', textAlign: 'center', marginBottom: 8 },
});
