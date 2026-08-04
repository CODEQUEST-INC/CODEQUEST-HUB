import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import Text from '../../components/Text';
import { ApiError } from '../../api/client';
import { getMyGroup } from '../../api/groups';
import { listTasksForGroup, TaskResponse, TaskStatus, updateTaskStatus } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import Button from '../../components/Button';
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

// Column moves re-filter the task list into different columns instantly —
// without this, a task just vanishes from one column and pops into another
// with no visible transition. LayoutAnimation gives a free crossfade/slide
// without pulling in an animation library.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

      <View style={styles.summaryRow}>
        {COLUMNS.map((column) => {
          const count = tasks.filter((t) => t.status === column.status).length;
          return (
            <View key={column.status} style={[styles.summaryPill, { backgroundColor: column.tint.tint }]}>
              <Feather name={column.icon} size={11} color={column.tint.fg} />
              <Text style={[styles.summaryText, { color: column.tint.fg }]}>
                {column.label} {count}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.board}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      >
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.status);
          return (
            <View key={column.status} style={styles.column}>
              <View style={styles.columnHeader}>
                <View style={[styles.columnDot, { backgroundColor: column.tint.accent }]} />
                <Text style={styles.columnTitle}>{column.label}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{columnTasks.length}</Text>
                </View>
              </View>

              <ScrollView style={styles.columnList} showsVerticalScrollIndicator={false}>
                {columnTasks.length === 0 ? <Text style={styles.emptySection}>Nothing here.</Text> : null}
                {columnTasks.map((task) => (
                  <Pressable
                    key={task.id}
                    onPress={() => navigation.navigate('TaskForm', { mode: 'edit', task })}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit task ${task.title}`}
                  >
                    {({ pressed }) => (
                      <Card style={[styles.taskCard, pressed && styles.taskCardPressed]}>
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
                            style={({ pressed: p }) => [
                              styles.advanceButton,
                              { backgroundColor: column.tint.accent },
                              p && styles.advanceButtonPressed,
                            ]}
                            onPress={() => advanceStatus(task)}
                            accessibilityRole="button"
                            accessibilityLabel={`Move ${task.title} to ${
                              COLUMNS.find((c) => c.status === NEXT_STATUS[task.status])?.label
                            }`}
                          >
                            <Feather name="arrow-right" size={12} color={colors.textOnPrimary} />
                            <Text
                              style={styles.advanceButtonText}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.85}
                            >
                              {COLUMNS.find((c) => c.status === NEXT_STATUS[task.status])?.label}
                            </Text>
                          </Pressable>
                        ) : null}
                      </Card>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      <Button
        label="New task"
        icon="plus"
        style={[
          styles.newButton,
          {
            borderRadius: radius.xxxl,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          },
        ]}
        onPress={() => navigation.navigate('TaskForm', { mode: 'create' })}
      />
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
    summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.lg, paddingBottom: 0 },
    summaryPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: radius.pill,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
    },
    summaryText: { fontSize: 11, fontWeight: '700' },
    board: { padding: spacing.lg, gap: spacing.md },
    column: {
      width: 158,
      maxHeight: '100%',
    },
    columnHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
    columnDot: { width: 9, height: 9, borderRadius: radius.pill },
    columnTitle: { ...typography.label, flex: 1 },
    countBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSunken,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    countText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
    columnList: { maxHeight: 520 },
    emptySection: { color: colors.textMuted, fontSize: 13 },
    taskCard: { marginBottom: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.xxl },
    taskCardPressed: {
      borderWidth: 2,
      borderColor: colors.primary,
      transform: [{ scale: 1.02 }],
    },
    cardTitle: { ...typography.body, fontWeight: '600' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    cardMeta: { ...typography.caption, color: colors.textMuted },
    advanceButton: {
      minHeight: 44,
      borderRadius: radius.xl,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginTop: spacing.xs,
    },
    advanceButtonPressed: { opacity: 0.8 },
    advanceButtonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 12.5 },
    newButton: { margin: spacing.lg, marginTop: 0 },
    error: { color: colors.danger, textAlign: 'center', padding: spacing.md },
  });
}
