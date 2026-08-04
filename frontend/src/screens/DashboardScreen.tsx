import { Feather } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/Text';
import { getMyProposal, ProposalResponse } from '../api/proposals';
import { getMyGroup } from '../api/groups';
import { getFeeConfig, getMyPaymentStatus, PaymentFeeConfig, PaymentRecord } from '../api/payments';
import { listTasksForGroup, TaskResponse } from '../api/tasks';
import { useAuth } from '../auth/AuthContext';
import EmptyState from '../components/EmptyState';
import StatTile from '../components/StatTile';
import { MainTabsParamList } from '../navigation/types';
import { Colors, elevation, radius, spacing, typography, useTheme } from '../theme';

type Props = BottomTabScreenProps<MainTabsParamList, 'Dashboard'>;

function initials(fullName?: string): string {
  if (!fullName) return '';
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function DashboardScreen({ navigation }: Props) {
  const { user, token } = useAuth();
  const { mode, colors } = useTheme();
  const styles = createStyles(colors, mode);
  const [openTasks, setOpenTasks] = useState<number | null>(null);
  const [proposal, setProposal] = useState<ProposalResponse | null>(null);
  const [feeConfig, setFeeConfig] = useState<PaymentFeeConfig | null>(null);
  const [myPayment, setMyPayment] = useState<PaymentRecord | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token || user?.role !== 'student') return;
      let cancelled = false;

      getMyGroup(token).then((group) => {
        listTasksForGroup(group.id, token)
          .then((tasks: TaskResponse[]) => {
            if (!cancelled) setOpenTasks(tasks.filter((t) => t.status !== 'done').length);
          })
          .catch(() => {
            if (!cancelled) setOpenTasks(null);
          });

        // Surfaces the registration-fee reminder here too (not just on the
        // Group tab) since it's the one blocking action a student is most
        // likely to miss if they never open Group on their own.
        getFeeConfig(group.cohortId, token)
          .then((fee) => {
            if (cancelled) return;
            setFeeConfig(fee);
            return getMyPaymentStatus(group.id, token).then((payment) => {
              if (!cancelled) setMyPayment(payment);
            });
          })
          .catch(() => {
            if (!cancelled) {
              setFeeConfig(null);
              setMyPayment(null);
            }
          });
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

  const feeUnpaid = Boolean(feeConfig) && myPayment?.status !== 'success';
  const firstName = user?.fullName?.trim().split(/\s+/)[0] ?? '';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.date}>{today}</Text>
          <Text style={styles.greeting}>Hi, {firstName}</Text>
        </View>
        <View style={styles.avatar} accessible={false}>
          <Text style={styles.avatarText}>{initials(user?.fullName)}</Text>
        </View>
      </View>

      {user?.role === 'student' ? (
        <>
          <View style={styles.statGrid}>
            <StatTile
              icon="check-square"
              label="Open tasks"
              value={openTasks ?? '—'}
              tint={colors.accents.teal}
            />
            <StatTile
              icon="file-text"
              label="Proposal"
              value={proposal ? proposal.status.replace('_', ' ') : 'None yet'}
              tint={colors.accents.violet}
            />
          </View>

          <Text style={styles.sectionHeading}>Needs you</Text>

          {feeUnpaid ? (
            <Pressable
              style={({ pressed }) => [styles.needsCard, pressed && styles.needsCardPressed]}
              onPress={() => navigation.navigate('Group')}
              accessibilityRole="button"
              accessibilityLabel={`Registration fee, ${feeConfig!.currency} ${(feeConfig!.amountPesewas / 100).toFixed(2)}, pay now`}
            >
              <View style={[styles.needsIcon, { backgroundColor: colors.accents.coral.tint }]}>
                <Feather name="credit-card" size={20} color={colors.accents.coral.fg} />
              </View>
              <View style={styles.needsText}>
                <Text style={styles.needsTitle}>Registration fee</Text>
                <Text style={styles.needsSubtitle}>
                  {feeConfig!.currency} {(feeConfig!.amountPesewas / 100).toFixed(2)}
                </Text>
              </View>
              <Text style={styles.payPill}>Pay</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.needsCard, pressed && styles.needsCardPressed]}
            onPress={() => navigation.navigate('Tasks')}
            accessibilityRole="button"
            accessibilityLabel="Continue to Task Board"
          >
            <View style={[styles.needsIcon, { backgroundColor: colors.primaryTint }]}>
              <Feather name="check-square" size={20} color={colors.primaryForeground} />
            </View>
            <View style={styles.needsText}>
              <Text style={styles.needsTitle}>Continue task board</Text>
              <Text style={styles.needsSubtitle}>
                {openTasks ? `${openTasks} open task${openTasks === 1 ? '' : 's'}` : 'Nothing open right now'}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textMuted} />
          </Pressable>
        </>
      ) : null}

      {user?.role === 'mentor' ? (
        <EmptyState
          icon="clock"
          heading="Mentor dashboard coming soon"
          subtext="There's no dedicated mentor dashboard yet — that's coming in a later milestone."
        />
      ) : null}
    </View>
  );
}

function createStyles(colors: Colors, mode: 'light' | 'dark') {
  return StyleSheet.create({
    container: { flex: 1, padding: spacing.xxl, gap: spacing.lg, backgroundColor: colors.bg },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    date: { ...typography.caption, color: colors.textMuted },
    greeting: { ...typography.heading, fontSize: 26, marginTop: 2 },
    avatar: {
      marginLeft: 'auto',
      width: 44,
      height: 44,
      borderRadius: radius.xl,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
    statGrid: { flexDirection: 'row', gap: spacing.md },
    sectionHeading: { ...typography.subheading, fontSize: 18, marginTop: spacing.xs },
    needsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 44,
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      padding: spacing.lg,
      ...(mode === 'dark' ? { borderWidth: 1, borderColor: colors.border } : elevation(mode, 'sm')),
    },
    needsCardPressed: { opacity: 0.85 },
    needsIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    needsText: { flex: 1, gap: 2 },
    needsTitle: { ...typography.body, fontWeight: '700' },
    needsSubtitle: { ...typography.caption, color: colors.textMuted },
    payPill: {
      backgroundColor: colors.primary,
      color: colors.textOnPrimary,
      borderRadius: radius.xl,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      fontSize: 14,
      fontWeight: '700',
      overflow: 'hidden',
    },
  });
}
