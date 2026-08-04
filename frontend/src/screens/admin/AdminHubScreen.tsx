import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../../components/Text';
import { Cohort, listCohorts } from '../../api/cohorts';
import { listCriteria } from '../../api/judging';
import { getAdminPaymentSummary, PaymentSummary } from '../../api/payments';
import { getPendingReviewCount } from '../../api/proposals';
import { getUsersStats, UsersStats } from '../../api/users';
import { useAuth } from '../../auth/AuthContext';
import Card from '../../components/Card';
import ProgressBar from '../../components/ProgressBar';
import { AdminStackParamList } from '../../navigation/types';
import { AccentSwatch, Colors, radius, spacing, typography, useTheme } from '../../theme';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminHub'>;

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatCedis(cedis: number): string {
  return cedis >= 1000 ? `${(cedis / 1000).toFixed(1)}k` : cedis.toFixed(0);
}

interface ManageItem {
  label: string;
  route: keyof AdminStackParamList;
  icon: React.ComponentProps<typeof Feather>['name'];
  tint: AccentSwatch;
  value?: string;
  subtitle?: string;
}

export default function AdminHubScreen({ navigation }: Props) {
  const { user, token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [usersStats, setUsersStats] = useState<UsersStats | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [pendingReviews, setPendingReviews] = useState<number | null>(null);
  const [activeCriteriaCount, setActiveCriteriaCount] = useState<number | null>(null);
  const [unbalancedCohorts, setUnbalancedCohorts] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    listCohorts(token).then(setCohorts).catch(() => setCohorts([]));
    getUsersStats(token).then(setUsersStats).catch(() => setUsersStats(null));
    getAdminPaymentSummary(token).then(setPaymentSummary).catch(() => setPaymentSummary(null));
    getPendingReviewCount(token).then(setPendingReviews).catch(() => setPendingReviews(null));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Criteria are configured per-cohort, so a sitewide count/balance check
  // means asking each cohort for its own criteria — cheap at this app's
  // scale (a handful of cohorts), not worth a dedicated aggregate endpoint.
  useEffect(() => {
    if (!token || cohorts.length === 0) return;
    let cancelled = false;
    Promise.all(cohorts.map((c) => listCriteria(c.id, token)))
      .then((lists) => {
        if (cancelled) return;
        let totalActive = 0;
        let unbalanced = 0;
        lists.forEach((criteria) => {
          const active = criteria.filter((c) => c.active);
          totalActive += active.length;
          const sum = active.reduce((s, c) => s + Number(c.weight), 0);
          if (active.length > 0 && sum !== 100) unbalanced++;
        });
        setActiveCriteriaCount(totalActive);
        setUnbalancedCohorts(unbalanced);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, cohorts]);

  const collectedCedis = paymentSummary ? paymentSummary.collectedPesewas / 100 : 0;
  const expectedCedis = paymentSummary ? paymentSummary.expectedPesewas / 100 : 0;
  const collectedPct = expectedCedis > 0 ? Math.round((collectedCedis / expectedCedis) * 100) : 0;

  const items: ManageItem[] = [
    {
      label: 'Cohorts',
      route: 'Cohorts',
      icon: 'calendar',
      tint: colors.accents.coral,
      value: String(cohorts.length),
      subtitle: `${cohorts.filter((c) => c.active).length} open`,
    },
    {
      label: 'Groups',
      route: 'Groups',
      icon: 'grid',
      tint: colors.accents.green,
      value: usersStats ? String(usersStats.totalGroups) : undefined,
      subtitle: usersStats ? `${usersStats.groupsWithoutSupervisor} without a supervisor` : undefined,
    },
    {
      label: 'Users',
      route: 'Users',
      icon: 'user-x',
      tint: colors.accents.coral,
      value: usersStats ? String(usersStats.totalUsers) : undefined,
      subtitle: '4 roles',
    },
    {
      label: 'Assigned judges',
      route: 'Judges',
      icon: 'users',
      tint: colors.accents.teal,
      value: usersStats ? String(usersStats.totalJudgeAssignments) : undefined,
    },
    {
      label: 'Judging criteria',
      route: 'Criteria',
      icon: 'sliders',
      tint: colors.accents.violet,
      value: activeCriteriaCount !== null ? String(activeCriteriaCount) : undefined,
      subtitle:
        unbalancedCohorts === null
          ? undefined
          : unbalancedCohorts === 0
            ? 'All cohorts balanced'
            : `${unbalancedCohorts} cohort${unbalancedCohorts === 1 ? '' : 's'} need attention`,
    },
    {
      label: 'Payments',
      route: 'Payments',
      icon: 'credit-card',
      tint: colors.accents.pink,
      value: paymentSummary ? String(paymentSummary.outstandingCount) : undefined,
      subtitle: 'Outstanding',
    },
    { label: 'Leaderboard', route: 'Leaderboard', icon: 'award', tint: colors.accents.amber },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin</Text>
        {user ? (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user.fullName)}</Text>
          </View>
        ) : null}
      </View>

      {paymentSummary ? (
        <Card style={styles.feeCard}>
          <View style={styles.feeHeaderRow}>
            <Text style={styles.feeHeading}>Fee collection</Text>
            <Text style={styles.feeSummary}>
              {collectedPct}% · GHS {formatCedis(collectedCedis)}
            </Text>
          </View>
          <ProgressBar value={collectedPct / 100} />
          <View style={styles.feeStatsRow}>
            <View style={styles.feeStat}>
              <Text style={styles.feeStatValue}>{usersStats?.studentCount ?? '—'}</Text>
              <Text style={styles.feeStatLabel}>Students</Text>
            </View>
            <View style={styles.feeStat}>
              <Text style={styles.feeStatValue}>{usersStats?.totalGroups ?? '—'}</Text>
              <Text style={styles.feeStatLabel}>Groups</Text>
            </View>
            <View style={styles.feeStat}>
              <Text style={[styles.feeStatValue, { color: colors.accents.amber.fg }]}>
                {pendingReviews ?? '—'}
              </Text>
              <Text style={styles.feeStatLabel}>Pending reviews</Text>
            </View>
          </View>
        </Card>
      ) : null}

      <Text style={styles.manageEyebrow}>Manage</Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <Pressable
            key={item.route}
            style={styles.gridItem}
            onPress={() => navigation.navigate(item.route as never)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            {({ pressed }) => (
              <Card style={[styles.gridCard, pressed && styles.gridCardPressed]}>
                <View style={[styles.iconWrap, { backgroundColor: item.tint.tint }]}>
                  <Feather name={item.icon} size={18} color={item.tint.fg} />
                </View>
                <View style={styles.gridLabelRow}>
                  <Text style={styles.gridLabel}>{item.label}</Text>
                  {item.value !== undefined ? <Text style={styles.gridValue}>{item.value}</Text> : null}
                </View>
                {item.subtitle ? <Text style={styles.gridSubtitle}>{item.subtitle}</Text> : null}
              </Card>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.lg, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { ...typography.heading, fontSize: 26 },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: radius.xl,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
    feeCard: { borderRadius: radius.xxl, gap: spacing.md },
    feeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    feeHeading: { ...typography.body, fontWeight: '700' },
    feeSummary: { ...typography.caption, color: colors.textMuted, fontVariant: ['tabular-nums'] },
    feeStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    feeStat: { gap: 2 },
    feeStatValue: { fontSize: 22, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
    feeStatLabel: { ...typography.caption, color: colors.textMuted },
    manageEyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    gridItem: { flexBasis: '45%', flexGrow: 1 },
    gridCard: { borderRadius: radius.xxl, gap: 2 },
    gridCardPressed: { opacity: 0.85 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    gridLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
    gridLabel: { ...typography.body, fontWeight: '700', flex: 1 },
    gridValue: { fontSize: 18, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
    gridSubtitle: { ...typography.caption, color: colors.textMuted },
  });
}
