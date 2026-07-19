import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Text from '../../components/Text';
import { getGroupById } from '../../api/groups';
import { getSupervisorProposals, ProposalResponse, ProposalStatus } from '../../api/proposals';
import { useAuth } from '../../auth/AuthContext';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { SupervisorStackParamList } from '../../navigation/types';
import { AccentSwatch, Colors, spacing, typography, useTheme } from '../../theme';

type Props = NativeStackScreenProps<SupervisorStackParamList, 'ReviewQueue'>;

interface Row {
  proposal: ProposalResponse;
  groupLabel: string;
}

function getStatusTint(colors: Colors): Record<ProposalStatus, AccentSwatch> {
  return {
    draft: colors.accents.violet,
    submitted: colors.accents.violet,
    under_review: colors.accents.amber,
    changes_requested: colors.accents.amber,
    approved: colors.accents.green,
    rejected: { accent: colors.danger, tint: colors.dangerTint, fg: colors.danger },
  };
}

export default function ReviewQueueScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const STATUS_TINT = getStatusTint(colors);
  const [rows, setRows] = useState<Row[]>([]);
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
            return { proposal, groupLabel: group.name ?? `Group ${group.groupNumber}` };
          } catch {
            return { proposal, groupLabel: proposal.groupId };
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
      data={rows}
      keyExtractor={(r) => r.proposal.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      renderItem={({ item }) => (
        <Pressable onPress={() => navigation.navigate('ReviewDetail', { proposal: item.proposal })}>
          <Card tint={STATUS_TINT[item.proposal.status]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.proposal.title}</Text>
              <StatusBadge status={item.proposal.status} />
            </View>
            <Text style={styles.cardMeta}>{item.groupLabel}</Text>
          </Card>
        </Pressable>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No proposals from your groups yet.</Text>}
    />
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    list: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    cardTitle: { ...typography.body, fontWeight: '600', flexShrink: 1 },
    cardMeta: { ...typography.caption, color: colors.textMuted },
    emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
    error: { color: colors.danger, textAlign: 'center' },
  });
}
