import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { getMyGroup, GroupResponse } from '../api/groups';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useUserNames, userLabel } from '../hooks/useUserNames';

export default function GroupWorkspaceScreen() {
  const { token } = useAuth();
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
        <ActivityIndicator />
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
        <Text style={styles.emptyText}>You're not currently assigned to a group yet.</Text>
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
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <Text style={styles.memberText}>
              {userLabel(item.userId, names)}
              {item.userId === group.groupLeaderId ? ' (leader)' : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No members yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  sectionHeading: { fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  memberList: { flex: 1 },
  memberRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  memberText: { fontSize: 14 },
  emptyText: { color: '#6b7280', textAlign: 'center' },
  error: { color: '#dc2626', textAlign: 'center' },
});
