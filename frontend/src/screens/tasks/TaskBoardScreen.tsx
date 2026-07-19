import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../../components/Text';
import { ApiError } from '../../api/client';
import { getMyGroup } from '../../api/groups';
import { listTasksForGroup, TaskResponse, TaskStatus, updateTaskStatus } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import { useUserNames, userLabel } from '../../hooks/useUserNames';
import { TaskStackParamList } from '../../navigation/types';
import { AccentSwatch, Accents, Colors, radius, spacing, typography, useTheme } from '../../theme';

type Props = NativeStackScreenProps<TaskStackParamList, 'TaskBoard'>;

interface Column {
  status: TaskStatus;
  label: string;
  tint: AccentSwatch;
  icon: React.ComponentProps<typeof Feather>['name'];
}

function getColumns(accents: Accents): Column[] {
  return [
    { status: 'todo', label: 'To do', tint: accents.coral, icon: 'circle' },
    { status: 'in_progress', label: 'In progress', tint: accents.amber, icon: 'loader' },
    { status: 'done', label: 'Done', tint: accents.green, icon: 'check-circle' },
  ];
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: null,
};

export default function TaskBoardScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const COLUMNS = getColumns(colors.accents);
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
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!groupId) {
    return (
      <View style={styles.centered}>
        <EmptyState icon="clipboard" heading="No group yet" subtext="You're not currently assigned to a group." />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.board}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      >
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.status);
          return (
            <View key={column.status} style={[styles.column, { backgroundColor: column.tint.tint }]}>
              <View style={styles.columnHeader}>
                <Feather name={column.icon} size={14} color={column.tint.fg} />
                <Text style={[styles.columnTitle, { color: column.tint.fg }]}>{column.label}</Text>
                <View style={[styles.countBadge, { backgroundColor: column.tint.accent }]}>
                  <Text style={styles.countText}>{columnTasks.length}</Text>
                </View>
              </View>

              <ScrollView style={styles.columnList} showsVerticalScrollIndicator={false}>
                {columnTasks.length === 0 ? <Text style={styles.emptySection}>Nothing here.</Text> : null}
                {columnTasks.map((task) => (
                  <Pressable key={task.id} onPress={() => navigation.navigate('TaskForm', { mode: 'edit', task })}>
                    <Card tint={column.tint} style={styles.taskCard}>
                      <Text style={styles.cardTitle}>{task.title}</Text>
                      {task.dueDate ? (
                        <View style={styles.metaRow}>
                          <Feather name="calendar" size={11} color={colors.textMuted} />
                          <Text style={styles.cardMeta}>{task.dueDate}</Text>
                        </View>
                      ) : null}
                      <View style={styles.metaRow}>
                        <Feather name="user" size={11} color={colors.textMuted} />
                        <Text style={styles.cardMeta}>
                          {task.assigneeId ? userLabel(task.assigneeId, names) : 'Unassigned'}
                        </Text>
                      </View>
                      {NEXT_STATUS[task.status] ? (
                        <Pressable
                          style={[styles.advanceButton, { backgroundColor: column.tint.accent }]}
                          onPress={() => advanceStatus(task)}
                        >
                          <Text style={styles.advanceButtonText}>
                            Move to {COLUMNS.find((c) => c.status === NEXT_STATUS[task.status])?.label}
                          </Text>
                        </Pressable>
                      ) : null}
                    </Card>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      <Pressable style={styles.newButton} onPress={() => navigation.navigate('TaskForm', { mode: 'create' })}>
        <Feather name="plus" size={16} color={colors.textOnPrimary} />
        <Text style={styles.newButtonText}>New task</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
    board: { padding: spacing.lg, gap: spacing.md },
    column: {
      width: 232,
      borderRadius: radius.lg,
      padding: spacing.md,
      maxHeight: '100%',
    },
    columnHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
    columnTitle: { ...typography.label, flex: 1 },
    countBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    countText: { color: colors.textOnPrimary, fontSize: 11, fontWeight: '700' },
    columnList: { maxHeight: 520 },
    emptySection: { color: colors.textMuted, fontSize: 13 },
    taskCard: { marginBottom: spacing.sm, backgroundColor: colors.surface },
    cardTitle: { ...typography.body, fontWeight: '600' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    cardMeta: { ...typography.caption, color: colors.textMuted },
    advanceButton: {
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    advanceButtonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 12.5 },
    newButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      padding: spacing.lg,
      margin: spacing.lg,
      marginTop: 0,
    },
    newButtonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 16 },
    error: { color: colors.danger, textAlign: 'center', padding: spacing.md },
  });
}
