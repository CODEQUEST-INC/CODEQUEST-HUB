import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Text from '../../components/Text';
import { getGroupById, resolveGroupPhotoUrl } from '../../api/groups';
import { getSupervisorProposals, ProposalResponse } from '../../api/proposals';
import { useAuth } from '../../auth/AuthContext';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { SupervisorStackParamList } from '../../navigation/types';
import { Colors, proposalStatusStyle, radius, spacing, typography, useTheme } from '../../theme';

type Props = NativeStackScreenProps<SupervisorStackParamList, 'ReviewQueue'>;

interface Row {
  proposal: ProposalResponse;
  groupLabel: string;
  groupPhotoUrl: string | null;
}

type StatusFilter = 'pending' | 'approved' | 'changes';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'changes', label: 'Returned' },
];

function matchesFilter(status: ProposalResponse['status'], filter: StatusFilter): boolean {
  switch (filter) {
    case 'pending':
      return status === 'submitted' || status === 'under_review';
    case 'approved':
      return status === 'approved';
    case 'changes':
      return status === 'rejected' || status === 'changes_requested';
  }
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ReviewQueueScreen({ navigation }: Props) {
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const proposals = await getSupervisorProposals(token);
      const withGroups = await Promise.all(
        proposals.map(async (proposal) => {
          try {
            const group = await getGroupById(proposal.groupId, token);
            return {
              proposal,
              groupLabel: group.name ?? `Group ${group.groupNumber}`,
              groupPhotoUrl: group.photoUrl,
            };
          } catch {
            return { proposal, groupLabel: proposal.groupId, groupPhotoUrl: null };
          }
        })
      );
      setRows(withGroups);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visibleRows = useMemo(() => rows.filter((r) => matchesFilter(r.proposal.status, filter)), [rows, filter]);

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

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.list}
      data={visibleRows}
      keyExtractor={(r) => r.proposal.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          {user?.fullName ? (
            <Text style={styles.greeting}>Welcome, {user.fullName}</Text>
          ) : null}
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Review queue</Text>
              <Text style={styles.subtitle}>
                {user?.fullName ? `${user.fullName} · ` : ''}
                {rows.length} assigned
              </Text>
            </View>
            {user ? (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(user.fullName)}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.filterRow}>
            {FILTERS.map((f) => {
              const count = rows.filter((r) => matchesFilter(r.proposal.status, f.key)).length;
              return (
                <Pressable
                  key={f.key}
                  style={({ pressed }) => [
                    styles.filterChip,
                    filter === f.key && styles.filterChipSelected,
                    pressed && styles.filterChipPressed,
                  ]}
                  onPress={() => setFilter(f.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === f.key }}
                >
                  <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextSelected]}>
                    {f.label} {count}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigation.navigate('ReviewDetail', { proposal: item.proposal })}
          accessibilityRole="button"
          accessibilityLabel={`Review ${item.proposal.title}, ${item.groupLabel}`}
        >
          {({ pressed }) => (
            <Card
              tint={proposalStatusStyle(colors, item.proposal.status)}
              style={[styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.proposal.title}</Text>
                <StatusBadge status={item.proposal.status} />
              </View>
              <View style={styles.groupRow}>
                <Avatar name={item.groupLabel} size={20} photoUrl={resolveGroupPhotoUrl(item.groupPhotoUrl)} />
                <Text style={styles.cardMeta}>{item.groupLabel}</Text>
                <Text style={styles.cardMeta}>
                  · {new Date(item.proposal.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </Card>
          )}
        </Pressable>
      )}
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          {rows.length === 0 ? 'No proposals from your groups yet.' : 'Nothing matches this filter.'}
        </Text>
      }
    />
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    list: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
    listHeader: { gap: spacing.md, marginBottom: spacing.xs },
    greeting: { fontSize: 15, fontWeight: 'bold', color: colors.text },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    headerText: { flex: 1 },
    title: { ...typography.heading, fontSize: 26 },
    subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: radius.xl,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    filterChip: {
      minHeight: 44,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    filterChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipPressed: { opacity: 0.8 },
    filterChipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    filterChipTextSelected: { color: colors.textOnPrimary },
    card: { borderRadius: radius.xxl },
    cardPressed: { opacity: 0.85 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    cardTitle: { ...typography.body, fontWeight: '600', flexShrink: 1 },
    groupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
    cardMeta: { ...typography.caption, color: colors.textMuted },
    emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
    error: { color: colors.danger, textAlign: 'center' },
  });
}
