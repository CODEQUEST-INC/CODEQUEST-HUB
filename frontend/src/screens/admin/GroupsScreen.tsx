import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../../components/TextInput';
import Text from '../../components/Text';
import {
  assignGroupMembers,
  autoGroupCohort,
  createGroup,
  GroupResponse,
  listGroupsByCohort,
  removeGroupMember,
  resolveGroupPhotoUrl,
  setGroupLeader,
  updateGroupSupervisor,
} from '../../api/groups';
import { CohortGroupPaymentSummary, getCohortPaymentStatuses } from '../../api/payments';
import { UserSearchResult } from '../../api/users';
import { useAuth } from '../../auth/AuthContext';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Card from '../../components/Card';
import CohortPicker from '../../components/CohortPicker';
import PaidBadge from '../../components/PaidBadge';
import UserPicker from '../../components/UserPicker';
import KeyboardAvoidingScreen from '../../components/KeyboardAvoidingScreen';
import { useUserNames, userLabel } from '../../hooks/useUserNames';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';

export default function GroupsScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<CohortGroupPaymentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newSupervisor, setNewSupervisor] = useState<UserSearchResult | null>(null);

  const [groupSize, setGroupSize] = useState('5');
  const [confirmingAutoGroup, setConfirmingAutoGroup] = useState(false);
  const [autoGrouping, setAutoGrouping] = useState(false);
  const [editingSupervisorGroupId, setEditingSupervisorGroupId] = useState<string | null>(null);

  // Guards against an in-flight request for a since-abandoned cohort
  // resolving after a newer one and clobbering it with stale data.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!token || !cohortId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      // Groups and payment status are independent — fetch both at once
      // instead of one after the other.
      const [data, statuses] = await Promise.all([
        listGroupsByCohort(cohortId, token),
        // Payment info is optional — a cohort with no fee configured yet is a
        // normal state, not an error, so a failure here shouldn't block the list.
        getCohortPaymentStatuses(cohortId, token).catch(() => []),
      ]);
      if (requestIdRef.current === requestId) {
        setGroups(data);
        setPaymentStatuses(statuses);
      }
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

  const paidGroupIds = new Set(paymentStatuses.filter((s) => s.allPaid).map((s) => s.groupId));

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

  const onAutoGroup = async () => {
    if (!token || !cohortId) return;
    const size = parseInt(groupSize, 10);
    if (Number.isNaN(size) || size < 1) {
      setError('Enter a valid group size.');
      return;
    }
    if (!confirmingAutoGroup) {
      setConfirmingAutoGroup(true);
      setTimeout(() => setConfirmingAutoGroup(false), 5000);
      return;
    }
    setConfirmingAutoGroup(false);
    setError(null);
    setAutoGrouping(true);
    try {
      await autoGroupCohort(cohortId, size, token);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to auto-generate groups');
    } finally {
      setAutoGrouping(false);
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

  const onRemoveMember = async (groupId: string, userId: string) => {
    if (!token) return;
    setError(null);
    try {
      await removeGroupMember(groupId, userId, token);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove member');
    }
  };

  const onChangeSupervisor = async (groupId: string, supervisorId: string | null) => {
    if (!token) return;
    setError(null);
    try {
      await updateGroupSupervisor(groupId, supervisorId, token);
      setEditingSupervisorGroupId(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update supervisor');
    }
  };

  return (
    <KeyboardAvoidingScreen>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <CohortPicker selectedCohortId={cohortId} onSelect={setCohortId} />

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {cohortId ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Auto-generate groups</Text>
          <Text style={styles.hint}>
            Dissolves every existing group in this cohort and rebuilds them from scratch, chunking all
            registered students into fixed-size groups ordered by index number. This cannot be undone.
          </Text>
          <Text style={styles.fieldLabel}>Group size</Text>
          <TextInput
            style={styles.input}
            value={groupSize}
            onChangeText={setGroupSize}
            placeholder="Group size"
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />
          <Button
            label={confirmingAutoGroup ? 'Tap again to confirm — this resets the cohort' : 'Auto-generate groups'}
            onPress={onAutoGroup}
            loading={autoGrouping}
            variant="dangerOutline"
            style={styles.dangerButton}
          />
        </Card>
      ) : null}

      {groups.map((g) => (
        <Card key={g.id} tint={paidGroupIds.has(g.id) ? colors.accents.green : undefined} style={styles.card}>
          <View style={styles.groupHeader}>
            <Avatar name={g.name ?? `Group ${g.groupNumber}`} size={32} photoUrl={resolveGroupPhotoUrl(g.photoUrl)} />
            <Text style={[styles.cardTitle, styles.groupHeaderTitle]}>
              Group {g.groupNumber} {g.name ? `— ${g.name}` : ''}
            </Text>
            {paidGroupIds.has(g.id) ? <PaidBadge status="success" /> : null}
          </View>
          {editingSupervisorGroupId === g.id ? (
            <View>
              <UserPicker
                onSelect={(user) => onChangeSupervisor(g.id, user.id)}
                roleFilter="supervisor"
                placeholder="Search supervisors"
              />
              <Pressable
                onPress={() => setEditingSupervisorGroupId(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cancel changing supervisor"
              >
                <Text style={styles.changeLink}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.supervisorRow}>
              <Text style={styles.cardMeta}>
                {g.supervisorId ? `Supervisor: ${userLabel(g.supervisorId, names)}` : 'No supervisor assigned'}
              </Text>
              <Pressable
                onPress={() => setEditingSupervisorGroupId(g.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Change supervisor"
              >
                <Text style={styles.changeLink}>Change</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.memberRow}>
            {g.members.map((m) => {
              const name = userLabel(m.userId, names);
              const isLeader = g.groupLeaderId === m.userId;
              return (
                <Pressable
                  key={m.id}
                  style={({ pressed }) => [styles.memberChip, pressed && styles.memberChipPressed]}
                  onPress={() => onSetLeader(g.id, m.userId)}
                  accessibilityRole="button"
                  accessibilityLabel={isLeader ? `${name}, group leader. Tap to keep as leader` : `Make ${name} group leader`}
                >
                  <Avatar name={name} size={24} />
                  <Text style={styles.memberChipText}>
                    {name} {isLeader ? '★' : ''}
                  </Text>
                  <Pressable
                    onPress={() => onRemoveMember(g.id, m.userId)}
                    hitSlop={16}
                    style={styles.memberRemoveButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${name} from group`}
                  >
                    <Feather name="x" size={12} color={colors.textMuted} />
                  </Pressable>
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
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Create group</Text>
          <Text style={styles.fieldLabel}>Group number</Text>
          <TextInput
            style={styles.input}
            value={newNumber}
            onChangeText={setNewNumber}
            placeholder="Group number"
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.fieldLabel}>Name</Text>
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
              <Pressable
                onPress={() => setNewSupervisor(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear selected supervisor"
              >
                <Text style={styles.changeLink}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <UserPicker onSelect={setNewSupervisor} roleFilter="supervisor" placeholder="Search supervisors" />
          )}
          <Button label="Create" onPress={onCreate} style={styles.button} accessibilityLabel="Create group" />
        </Card>
      ) : null}
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
    card: { borderRadius: radius.xxl },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    groupHeaderTitle: { flex: 1 },
    cardTitle: { ...typography.body, fontWeight: '600' },
    cardMeta: { ...typography.caption, color: colors.textMuted },
    fieldLabel: { ...typography.label, color: colors.textMuted },
    hint: { ...typography.caption, color: colors.textMuted },
    memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    memberChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 32,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    memberChipPressed: { opacity: 0.8 },
    memberChipText: { ...typography.caption, color: colors.text },
    memberRemoveButton: { marginLeft: spacing.xs },
    supervisorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    selectedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      backgroundColor: colors.surface,
    },
    selectedName: { ...typography.body, fontWeight: '600', flex: 1 },
    changeLink: { ...typography.caption, color: colors.primary, fontWeight: '600' },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      fontSize: 15,
      backgroundColor: colors.surface,
    },
    button: { marginTop: spacing.xs },
    dangerButton: { marginTop: spacing.sm },
    emptyText: { color: colors.textMuted, textAlign: 'center' },
    error: { color: colors.danger },
  });
}
