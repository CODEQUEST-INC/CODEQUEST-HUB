import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getMyProposal, ProposalResponse } from '../api/proposals';
import { getMyGroup } from '../api/groups';
import { listTasksForGroup, TaskResponse } from '../api/tasks';
import { useAuth } from '../auth/AuthContext';
import StatTile from '../components/StatTile';
import { accents, colors, radius, spacing, typography } from '../theme';

export default function DashboardScreen() {
  const { user, token, logout } = useAuth();
  const [openTasks, setOpenTasks] = useState<number | null>(null);
  const [proposal, setProposal] = useState<ProposalResponse | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token || user?.role !== 'student') return;
      let cancelled = false;

      getMyGroup(token)
        .then((group) => listTasksForGroup(group.id, token))
        .then((tasks: TaskResponse[]) => {
          if (!cancelled) setOpenTasks(tasks.filter((t) => t.status !== 'done').length);
        })
        .catch(() => {
          if (!cancelled) setOpenTasks(null);
        });

      getMyProposal(token)
        .then((p) => {
          if (!cancelled) setProposal(p);
        })
        .catch(() => {
          if (!cancelled) setProposal(null);
        });

      return () => {
        cancelled = true;
      };
    }, [token, user?.role])
  );

  return (
    <View style={styles.container}>
      <View style={styles.greetingRow}>
        <View style={styles.greetingIcon}>
          <Feather name="sun" size={18} color={colors.primaryForeground} />
        </View>
        <View>
          <Text style={styles.greeting}>Welcome, {user?.fullName}</Text>
          <Text style={styles.role}>{user?.role}</Text>
        </View>
      </View>

      {user?.role === 'student' ? (
        <View style={styles.statGrid}>
          <StatTile
            icon="check-square"
            label="Open tasks"
            value={openTasks ?? '—'}
            tint={accents.teal}
          />
          <StatTile
            icon="file-text"
            label="Proposal"
            value={proposal ? proposal.status.replace('_', ' ') : 'None yet'}
            tint={accents.violet}
          />
        </View>
      ) : null}

      {user?.role === 'mentor' ? (
        <View style={styles.card}>
          <Text style={styles.cardText}>
            There's no dedicated mentor dashboard yet — that's coming in a later milestone.
          </Text>
        </View>
      ) : null}

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Feather name="log-out" size={16} color={colors.danger} />
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xxl, gap: spacing.xl, backgroundColor: colors.bg },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  greetingIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { ...typography.heading, fontSize: 20 },
  role: { ...typography.caption, textTransform: 'capitalize' },
  statGrid: { flexDirection: 'row', gap: spacing.md },
  card: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  cardText: { color: colors.textMuted },
  logoutButton: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  logoutText: { color: colors.danger, fontWeight: '600' },
});
