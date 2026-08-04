import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Text from '../../components/Text';
import Button from '../../components/Button';
import {
  getLeaderboard,
  getScorecardsForGroup,
  JudgingCriterion,
  LeaderboardEntry,
  listCriteria,
  publishLeaderboard,
  Scorecard,
} from '../../api/judging';
import { resolveGroupPhotoUrl } from '../../api/groups';
import { useAuth } from '../../auth/AuthContext';
import { useUserNames, userLabel } from '../../hooks/useUserNames';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import CohortPicker from '../../components/CohortPicker';
import { confirmAction } from '../../utils/confirm';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';

// weighted total = sum(score * weight / 100) — mirrors JudgingService's own
// computation exactly, so this modal's per-judge totals agree with the
// leaderboard's aggregate average.
function weightedTotal(scorecard: Scorecard, criteria: JudgingCriterion[]): number {
  const weightById = new Map(criteria.map((c) => [c.id, c.weight]));
  const sum = scorecard.scores.reduce((acc, s) => acc + (s.score * (weightById.get(s.criterionId) ?? 0)) / 100, 0);
  return Math.round(sum * 100) / 100;
}

export default function LeaderboardScreen() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const accentList = Object.values(colors.accents);
  const RANK_COLORS = [accentList[0].accent, accentList[1].accent, accentList[2].accent];
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);
  const [detailGroupName, setDetailGroupName] = useState('');
  const [detailScorecards, setDetailScorecards] = useState<Scorecard[]>([]);
  const [detailCriteria, setDetailCriteria] = useState<JudgingCriterion[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const judgeNames = useUserNames(detailScorecards.map((s) => s.judgeId));

  // Guards against an in-flight request for a since-abandoned cohort
  // resolving after a newer one and clobbering it with stale data.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!token || !cohortId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getLeaderboard(cohortId, token);
      if (requestIdRef.current === requestId) {
        setEntries(data.entries);
        setPublished(data.published);
      }
    } catch (e) {
      if (requestIdRef.current === requestId) {
        setError(e instanceof Error ? e.message : 'Failed to load leaderboard');
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

  const onPublish = () => {
    if (!token || !cohortId) return;
    confirmAction({
      title: 'Publish results?',
      message: 'Students and supervisors will be able to see this cohort\'s final standings and each group\'s rank on their showcase entry.',
      confirmLabel: 'Publish',
      destructive: false,
      onConfirm: async () => {
        setPublishing(true);
        try {
          await publishLeaderboard(cohortId, token);
          await load();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to publish results');
        } finally {
          setPublishing(false);
        }
      },
    });
  };

  const openDetail = async (groupId: string, groupName: string) => {
    if (!token || !cohortId) return;
    setDetailGroupId(groupId);
    setDetailGroupName(groupName);
    setDetailScorecards([]);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const [scorecards, criteria] = await Promise.all([
        getScorecardsForGroup(groupId, token),
        listCriteria(cohortId, token),
      ]);
      setDetailScorecards(scorecards);
      setDetailCriteria(criteria);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Failed to load judge scores');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setDetailGroupId(null);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <CohortPicker selectedCohortId={cohortId} onSelect={setCohortId} />

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {cohortId && !loading && isAdmin ? (
        <View style={styles.statusRow}>
          <View style={[styles.statusPill, published ? styles.statusPillPublished : styles.statusPillDraft]}>
            <Feather
              name={published ? 'check-circle' : 'eye-off'}
              size={14}
              color={published ? colors.accents.green.fg : colors.textMuted}
            />
            <Text style={[styles.statusText, { color: published ? colors.accents.green.fg : colors.textMuted }]}>
              {published ? 'Published' : 'Draft — only admins can see this'}
            </Text>
          </View>
          {!published ? (
            <Button label="Publish results" onPress={onPublish} loading={publishing} size="sm" style={styles.publishButton} />
          ) : null}
        </View>
      ) : null}

      {cohortId && !loading && !isAdmin && !published ? (
        <Text style={styles.emptyText}>Results for this cohort haven't been published yet.</Text>
      ) : null}

      {entries.map((e, index) => {
        const name = e.groupName ?? `Group ${e.groupNumber}`;
        const rankColor = RANK_COLORS[index] ?? colors.textMuted;
        const cardContent = (
          <>
            <Text style={[styles.rank, { color: rankColor }]}>#{index + 1}</Text>
            <Avatar name={name} size={40} photoUrl={resolveGroupPhotoUrl(e.groupPhotoUrl)} />
            <View style={styles.details}>
              <Text style={styles.cardTitle}>{name}</Text>
              <Text style={styles.cardMeta}>
                <Text style={styles.tabularNum}>{e.averageScore !== null ? `${e.averageScore} avg` : 'Not scored yet'}</Text>
                {' · '}
                <Text style={styles.tabularNum}>{e.judgeCount}</Text> judge
                {e.judgeCount === 1 ? '' : 's'}
              </Text>
            </View>
            {isAdmin ? <Feather name="chevron-right" size={18} color={colors.textMuted} /> : null}
          </>
        );
        if (!isAdmin) {
          return (
            <Card key={e.groupId} style={styles.card}>
              {cardContent}
            </Card>
          );
        }
        return (
          <Pressable
            key={e.groupId}
            onPress={() => openDetail(e.groupId, name)}
            accessibilityRole="button"
            accessibilityLabel={`View judge scores for ${name}`}
          >
            {({ pressed }) => (
              <Card style={[styles.card, pressed && styles.cardPressed]}>{cardContent}</Card>
            )}
          </Pressable>
        );
      })}
      {entries.length === 0 && !loading && cohortId && (isAdmin || published) ? (
        <Text style={styles.emptyText}>No groups in this cohort yet.</Text>
      ) : null}

      <Modal visible={!!detailGroupId} transparent animationType="fade" onRequestClose={closeDetail}>
        <Pressable style={styles.backdrop} onPress={closeDetail}>
          <Pressable style={styles.detailCard} onPress={(evt) => evt.stopPropagation()}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle} numberOfLines={1}>
                {detailGroupName}
              </Text>
              <Pressable onPress={closeDetail} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <Feather name="x" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.detailScroll}>
              {detailLoading ? <ActivityIndicator color={colors.primary} /> : null}
              {detailError ? <Text style={styles.error}>{detailError}</Text> : null}
              {!detailLoading && !detailError && detailScorecards.length === 0 ? (
                <Text style={styles.emptyText}>No scorecards submitted yet.</Text>
              ) : null}
              {detailScorecards.map((sc, i) => (
                <View key={sc.id} style={[styles.judgeBlock, i === 0 && styles.judgeBlockFirst]}>
                  <View style={styles.judgeHeaderRow}>
                    <Text style={styles.judgeName}>{userLabel(sc.judgeId, judgeNames)}</Text>
                    <Text style={styles.judgeTotal}>{weightedTotal(sc, detailCriteria)} pts</Text>
                  </View>
                  {detailCriteria.map((c) => {
                    const score = sc.scores.find((s) => s.criterionId === c.id)?.score;
                    return (
                      <View key={c.id} style={styles.criterionRow}>
                        <Text style={styles.criterionName}>{c.name}</Text>
                        <Text style={styles.tabularNum}>{score ?? '—'}/10</Text>
                      </View>
                    );
                  })}
                  {sc.comment ? <Text style={styles.judgeComment}>"{sc.comment}"</Text> : null}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.sm, backgroundColor: colors.bg },
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.xxl },
    cardPressed: { opacity: 0.85 },
    rank: { fontSize: 18, fontWeight: '800', width: 30, fontVariant: ['tabular-nums'] },
    details: { flex: 1 },
    cardTitle: { ...typography.body, fontWeight: '600' },
    cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    tabularNum: { fontVariant: ['tabular-nums'] },
    emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
    error: { color: colors.danger },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.xs },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
    },
    statusPillPublished: { backgroundColor: colors.accents.green.tint },
    statusPillDraft: { backgroundColor: colors.surfaceSunken },
    statusText: { ...typography.caption, fontWeight: '600' },
    publishButton: { borderRadius: radius.xxxl },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    detailCard: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '80%',
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    detailTitle: { ...typography.subheading, fontSize: 17, flex: 1 },
    detailScroll: { flexGrow: 0 },
    judgeBlock: { paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
    judgeBlockFirst: { borderTopWidth: 0, paddingTop: 0 },
    judgeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    judgeName: { ...typography.body, fontWeight: '700' },
    judgeTotal: { ...typography.body, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'] },
    criterionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    criterionName: { ...typography.caption, color: colors.textMuted, flex: 1 },
    judgeComment: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  });
}
