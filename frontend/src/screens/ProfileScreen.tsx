import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Text from '../components/Text';
import Button from '../components/Button';
import { Cohort, listCohorts } from '../api/cohorts';
import { getMyGroup, GroupResponse } from '../api/groups';
import { listMyNotifications, markNotificationRead, Notification } from '../api/notifications';
import { getMyPaymentHistory, PaymentRecord } from '../api/payments';
import { useAuth } from '../auth/AuthContext';
import Card from '../components/Card';
import PaidBadge from '../components/PaidBadge';
import { RootStackParamList } from '../navigation/types';
import { radius, spacing, typography, useTheme } from '../theme';
import { confirmAction } from '../utils/confirm';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, token, logout } = useAuth();
  const { mode, colors, toggleTheme } = useTheme();
  const styles = createStyles(colors);
  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== 'student') return;
    getMyGroup(token)
      .then(setGroup)
      .catch(() => setGroup(null));
  }, [token, user?.role]);

  useEffect(() => {
    if (!token) return;
    listCohorts(token)
      .then(setCohorts)
      .catch(() => setCohorts([]));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    listMyNotifications(token)
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [token]);

  useEffect(() => {
    if (!token || !group) return;
    getMyPaymentHistory(group.id, token)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [token, group]);

  const onNotificationPress = (n: Notification) => {
    if (!token || n.readAt) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    markNotificationRead(n.id, token).catch(() => {});
  };

  const onLogout = () => {
    confirmAction({
      title: 'Log out?',
      message: "You'll need to sign in again to get back in.",
      confirmLabel: 'Log out',
      onConfirm: logout,
    });
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const cohortYear = useMemo(
    () => (group ? cohorts.find((c) => c.id === group.cohortId)?.year : undefined),
    [group, cohorts]
  );

  if (!user) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user.fullName)}</Text>
        </View>
        <Text style={styles.name}>{user.fullName}</Text>
        <Text style={styles.role}>
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          {user.studentId ? ` · ${user.studentId}` : ''}
        </Text>
        {user.role === 'student' && group ? (
          <View style={styles.chipRow}>
            <View style={styles.chipFilled}>
              <Text style={styles.chipFilledText}>{group.name ?? `Group ${group.groupNumber}`}</Text>
            </View>
            {cohortYear ? (
              <View style={styles.chipOutline}>
                <Text style={styles.chipOutlineText}>{cohortYear} cohort</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {history.length > 0 || notifications.length > 0 ? (
        <Card style={styles.listCard}>
          {history.length > 0 ? (
            <>
              <Pressable
                style={styles.row}
                onPress={() => setHistoryExpanded((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: historyExpanded }}
                accessibilityLabel={`Payment history, ${history.length} payment${history.length === 1 ? '' : 's'}, ${historyExpanded ? 'expanded' : 'collapsed'}`}
              >
                <Feather name="credit-card" size={18} color={colors.text} />
                <Text style={styles.rowLabel}>Payment history</Text>
                <Text style={styles.rowValue}>{history.length}</Text>
                <Feather name={historyExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
              </Pressable>
              {historyExpanded
                ? history.map((h) => (
                    <View key={h.id} style={styles.nestedRow}>
                      <View style={styles.nestedRowText}>
                        <Text style={styles.nestedRowTitle}>
                          {h.currency} {(h.amountPesewas / 100).toFixed(2)}
                        </Text>
                        <Text style={styles.nestedRowMeta}>{new Date(h.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <PaidBadge status={h.status} />
                    </View>
                  ))
                : null}
            </>
          ) : null}

          {notifications.length > 0 ? (
            <>
              <Pressable
                style={[styles.row, history.length > 0 && styles.rowBorder]}
                onPress={() => setNotificationsExpanded((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: notificationsExpanded }}
                accessibilityLabel={`Notifications, ${unreadCount} unread, ${notificationsExpanded ? 'expanded' : 'collapsed'}`}
              >
                <Feather name="bell" size={18} color={colors.text} />
                <Text style={styles.rowLabel}>Notifications</Text>
                {unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                ) : null}
                <Feather
                  name={notificationsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textMuted}
                />
              </Pressable>
              {notificationsExpanded
                ? notifications.map((n) => (
                    <Pressable
                      key={n.id}
                      onPress={() => onNotificationPress(n)}
                      style={styles.nestedRow}
                      accessibilityRole="button"
                      accessibilityLabel={`${n.title}${n.readAt ? '' : ', unread'}`}
                    >
                      {!n.readAt ? <View style={styles.unreadDot} /> : <View style={styles.unreadDotSpacer} />}
                      <View style={styles.nestedRowText}>
                        <Text style={[styles.nestedRowTitle, !n.readAt && styles.notificationTitleUnread]}>
                          {n.title}
                        </Text>
                        {n.body ? <Text style={styles.nestedRowMeta}>{n.body}</Text> : null}
                        <Text style={styles.nestedRowMeta}>{timeAgo(n.createdAt)}</Text>
                      </View>
                    </Pressable>
                  ))
                : null}
            </>
          ) : null}
        </Card>
      ) : null}

      <Card style={styles.listCard}>
        <View style={styles.row}>
          <Feather name={mode === 'dark' ? 'moon' : 'sun'} size={18} color={colors.text} />
          <Text style={styles.rowLabel}>Appearance</Text>
          <Text style={styles.rowValueAccent}>{mode === 'dark' ? 'Dark' : 'Light'}</Text>
          <Switch
            value={mode === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityLabel={`Dark mode, currently ${mode === 'dark' ? 'on' : 'off'}`}
          />
        </View>
        <Pressable
          style={[styles.row, styles.rowBorder]}
          onPress={() => navigation.navigate('Help')}
          accessibilityRole="button"
          accessibilityLabel="Help and rules"
        >
          <Feather name="help-circle" size={18} color={colors.text} />
          <Text style={styles.rowLabel}>Help & rules</Text>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </Pressable>
      </Card>

      <Button
        label="Log out"
        icon="log-out"
        variant="dangerOutline"
        onPress={onLogout}
        style={styles.logoutButton}
      />
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.lg, backgroundColor: colors.bg, flexGrow: 1 },
    header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: radius.xxl,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 8,
    },
    avatarText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 34 },
    name: { ...typography.heading, fontSize: 22 },
    role: { ...typography.caption, color: colors.textMuted },
    chipRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    chipFilled: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
    chipFilledText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 13 },
    chipOutline: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipOutlineText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
    listCard: { gap: 0, padding: 0, overflow: 'hidden', borderRadius: radius.xxl },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, minHeight: 44 },
    rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    rowLabel: { ...typography.body, fontWeight: '700', flex: 1 },
    rowValue: { ...typography.body, color: colors.textMuted },
    rowValueAccent: { ...typography.body, fontWeight: '600', color: colors.primary },
    unreadBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: radius.pill,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    unreadBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textOnPrimary },
    nestedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingLeft: spacing.xxl + spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    nestedRowText: { flex: 1, gap: 2 },
    nestedRowTitle: { ...typography.body, fontWeight: '500' },
    notificationTitleUnread: { fontWeight: '700' },
    nestedRowMeta: { ...typography.caption, color: colors.textMuted },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
    unreadDotSpacer: { width: 8 },
    logoutButton: { borderRadius: radius.xxxl },
  });
}
