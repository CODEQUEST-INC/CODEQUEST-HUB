import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Text from '../components/Text';
import { getMyGroup, GroupResponse } from '../api/groups';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useUserNames, userLabel } from '../hooks/useUserNames';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import { Colors, spacing, typography, useTheme } from '../theme';

export default function GroupWorkspaceScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const g = await getMyGroup(token);
      setGroup(g);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setGroup(null);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load group');
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

  const names = useUserNames([
    group?.groupLeaderId,
    group?.supervisorId,
    ...(group?.members.map((m) => m.userId) ?? []),
  ]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.centered}>
        <EmptyState icon="users" heading="No group yet" subtext="You're not currently assigned to a group." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{group.name ?? `Group ${group.groupNumber}`}</Text>
      <Text style={styles.subtitle}>Group #{group.groupNumber}</Text>
      {group.groupLeaderId ? (
        <Text style={styles.meta}>Leader: {userLabel(group.groupLeaderId, names)}</Text>
      ) : null}
      {group.supervisorId ? (
        <Text style={styles.meta}>Supervisor: {userLabel(group.supervisorId, names)}</Text>
      ) : null}

      <Text style={styles.sectionHeading}>Members ({group.members.length})</Text>
      <FlatList
        style={styles.memberList}
        data={group.members}
        keyExtractor={(m) => m.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        renderItem={({ item }) => {
          const name = userLabel(item.userId, names);
          const isLeader = item.userId === group.groupLeaderId;
          return (
            <View style={styles.memberRow}>
              <Avatar name={name} size={36} />
              <View style={styles.memberTextWrap}>
                <Text style={styles.memberText}>{name}</Text>
                {isLeader ? <Text style={styles.leaderLabel}>Group leader</Text> : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No members yet.</Text>}
      />
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, padding: spacing.xxl, backgroundColor: colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
    title: { ...typography.heading, fontSize: 20 },
    subtitle: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
    meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    sectionHeading: { ...typography.subheading, marginTop: spacing.xl, marginBottom: spacing.sm },
    memberList: { flex: 1 },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    memberTextWrap: { flex: 1 },
    memberText: { ...typography.body, fontWeight: '600' },
    leaderLabel: { ...typography.caption, color: colors.primaryForeground, marginTop: 1 },
    emptyText: { color: colors.textMuted, textAlign: 'center' },
    error: { color: colors.danger, textAlign: 'center' },
  });
}
