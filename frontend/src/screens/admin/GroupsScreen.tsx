import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { assignGroupMembers, createGroup, GroupResponse, listGroupsByCohort, setGroupLeader } from '../../api/groups';
import { UserSearchResult } from '../../api/users';
import { useAuth } from '../../auth/AuthContext';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import CohortPicker from '../../components/CohortPicker';
import UserPicker from '../../components/UserPicker';
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
  const [newSupervisor, setNewSupervisor] = useState<UserSearchResult | null>(null);

  // Guards against an in-flight request for a since-abandoned cohort
  // resolving after a newer one and clobbering it with stale data.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!token || !cohortId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await listGroupsByCohort(cohortId, token);
      if (requestIdRef.current === requestId) setGroups(data);
    } catch (e) {
      if (requestIdRef.current === requestId) {
        setError(e instanceof Error ? e.message : 'Failed to load groups');
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
          supervisorId: newSupervisor?.id,
        },
        token
      );
      setNewNumber('');
      setNewName('');
      setNewSupervisor(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create group');
    }
  };

  const onAddMember = async (groupId: string, user: UserSearchResult) => {
    if (!token) return;
    setError(null);
    try {
      await assignGroupMembers(groupId, [user.id], token);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add member');
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

          <Text style={styles.hint}>Add a member</Text>
          <UserPicker onSelect={(user) => onAddMember(g.id, user)} placeholder="Search by name or email" />
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
          <Text style={styles.hint}>Supervisor (optional)</Text>
          {newSupervisor ? (
            <View style={styles.selectedRow}>
              <Avatar name={newSupervisor.fullName} size={28} />
              <Text style={styles.selectedName}>{newSupervisor.fullName}</Text>
              <Pressable onPress={() => setNewSupervisor(null)}>
                <Text style={styles.changeLink}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <UserPicker onSelect={setNewSupervisor} roleFilter="supervisor" placeholder="Search supervisors" />
          )}
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
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  selectedName: { ...typography.body, fontWeight: '600', flex: 1 },
  changeLink: { ...typography.caption, color: colors.primary, fontWeight: '600' },
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
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.danger },
});
