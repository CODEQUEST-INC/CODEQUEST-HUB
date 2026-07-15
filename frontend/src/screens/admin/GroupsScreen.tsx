import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { assignGroupMembers, createGroup, GroupResponse, listGroupsByCohort, setGroupLeader } from '../../api/groups';
import { useAuth } from '../../auth/AuthContext';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import CohortPicker from '../../components/CohortPicker';
import { useUserNames, userLabel } from '../../hooks/useUserNames';
import { colors, radius, spacing, typography } from '../../theme';

export default function GroupsScreen() {
  const { token } = useAuth();
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newSupervisorId, setNewSupervisorId] = useState('');

  const [addMemberIds, setAddMemberIds] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!token || !cohortId) return;
    setLoading(true);
    setError(null);
    try {
      setGroups(await listGroupsByCohort(cohortId, token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [token, cohortId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const allUserIds = groups.flatMap((g) => [
    ...g.members.map((m) => m.userId),
    ...(g.supervisorId ? [g.supervisorId] : []),
  ]);
  const names = useUserNames(allUserIds);

  const onCreate = async () => {
    if (!token || !cohortId) return;
    const groupNumber = parseInt(newNumber, 10);
    if (Number.isNaN(groupNumber)) {
      setError('Enter a numeric group number.');
      return;
    }
    setError(null);
    try {
      await createGroup(
        {
          cohortId,
          groupNumber,
          name: newName.trim() || undefined,
          supervisorId: newSupervisorId.trim() || undefined,
        },
        token
      );
      setNewNumber('');
      setNewName('');
      setNewSupervisorId('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create group');
    }
  };

  const onAddMembers = async (groupId: string) => {
    if (!token) return;
    const raw = addMemberIds[groupId] ?? '';
    const userIds = raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (userIds.length === 0) return;
    setError(null);
    try {
      await assignGroupMembers(groupId, userIds, token);
      setAddMemberIds((prev) => ({ ...prev, [groupId]: '' }));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add members');
    }
  };

  const onSetLeader = async (groupId: string, userId: string) => {
    if (!token) return;
    setError(null);
    try {
      await setGroupLeader(groupId, userId, token);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set leader');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <CohortPicker selectedCohortId={cohortId} onSelect={setCohortId} />

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {groups.map((g) => (
        <Card key={g.id}>
          <Text style={styles.cardTitle}>
            Group {g.groupNumber} {g.name ? `— ${g.name}` : ''}
          </Text>
          {g.supervisorId ? (
            <Text style={styles.cardMeta}>Supervisor: {userLabel(g.supervisorId, names)}</Text>
          ) : (
            <Text style={styles.cardMeta}>No supervisor assigned</Text>
          )}

          <View style={styles.memberRow}>
            {g.members.map((m) => {
              const name = userLabel(m.userId, names);
              const isLeader = g.groupLeaderId === m.userId;
              return (
                <Pressable key={m.id} style={styles.memberChip} onPress={() => onSetLeader(g.id, m.userId)}>
                  <Avatar name={name} size={24} />
                  <Text style={styles.memberChipText}>
                    {name} {isLeader ? '★' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {g.members.length === 0 ? <Text style={styles.hint}>No members yet.</Text> : null}
          {g.members.length > 0 ? <Text style={styles.hint}>Tap a member to make them group leader.</Text> : null}

          <Text style={styles.hint}>Add members — paste user IDs (comma or space separated).</Text>
          <TextInput
            style={styles.input}
            value={addMemberIds[g.id] ?? ''}
            onChangeText={(v) => setAddMemberIds((prev) => ({ ...prev, [g.id]: v }))}
            placeholder="User IDs"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable style={styles.smallButton} onPress={() => onAddMembers(g.id)}>
            <Text style={styles.smallButtonText}>Add members</Text>
          </Pressable>
        </Card>
      ))}
      {groups.length === 0 && !loading && cohortId ? (
        <Text style={styles.emptyText}>No groups in this cohort yet.</Text>
      ) : null}

      {cohortId ? (
        <Card>
          <Text style={styles.cardTitle}>Create group</Text>
          <TextInput
            style={styles.input}
            value={newNumber}
            onChangeText={setNewNumber}
            placeholder="Group number"
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Name (optional)"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.hint}>Supervisor ID (optional) — there's no user search yet.</Text>
          <TextInput
            style={styles.input}
            value={newSupervisorId}
            onChangeText={setNewSupervisorId}
            placeholder="Supervisor user ID"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable style={styles.button} onPress={onCreate}>
            <Text style={styles.buttonText}>Create</Text>
          </Pressable>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
  cardTitle: { ...typography.body, fontWeight: '600' },
  cardMeta: { ...typography.caption },
  hint: { ...typography.caption },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  memberChipText: { ...typography.caption, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 15,
    backgroundColor: colors.surface,
  },
  button: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
  buttonText: { color: colors.textOnPrimary, fontWeight: '600' },
  smallButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  smallButtonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 13 },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.danger },
});
