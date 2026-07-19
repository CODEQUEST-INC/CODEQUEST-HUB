import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../../components/TextInput';
import Text from '../../components/Text';
import { GroupResponse, listGroupsByCohort, resolveGroupPhotoUrl } from '../../api/groups';
import { getMyScorecard, JudgingCriterion, listCriteria, ScoreEntry, submitScorecard } from '../../api/judging';
import { useAuth } from '../../auth/AuthContext';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import CohortPicker from '../../components/CohortPicker';
import ProgressBar from '../../components/ProgressBar';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';

export default function ScorecardScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const accentList = Object.values(colors.accents);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<JudgingCriterion[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token || !cohortId) return;
    // Guards against an in-flight request for a since-abandoned cohort
    // resolving after a newer one and clobbering it with stale data.
    let cancelled = false;
    setGroupId(null);
    setScores({});
    setSuccess(false);
    setLoading(true);
    setError(null);
    Promise.all([listGroupsByCohort(cohortId, token), listCriteria(cohortId, token)])
      .then(([groupList, criteriaList]) => {
        if (cancelled) return;
        setGroups(groupList);
        setCriteria(criteriaList.filter((c) => c.active));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load cohort data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, cohortId]);

  useEffect(() => {
    if (!token || !groupId) return;
    setSuccess(false);
    setError(null);
    getMyScorecard(groupId, token)
      .then((scorecard) => {
        if (scorecard) {
          const prefilled: Record<string, string> = {};
          scorecard.scores.forEach((s) => {
            prefilled[s.criterionId] = String(s.score);
          });
          setScores(prefilled);
        } else {
          setScores({});
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load your existing scorecard'));
  }, [token, groupId]);

  // maxLength alone only caps digit count ("78" is 2 digits, same as "10") —
  // reject any keystroke that would make the value fall outside 1-10 rather
  // than catching it only at submit time.
  const onChangeScore = (criterionId: string, raw: string) => {
    if (raw !== '' && (!/^\d{1,2}$/.test(raw) || parseInt(raw, 10) > 10)) return;
    setScores((prev) => ({ ...prev, [criterionId]: raw }));
  };

  const onSubmit = async () => {
    if (!token || !groupId) return;
    const entries: ScoreEntry[] = [];
    for (const c of criteria) {
      const raw = scores[c.id];
      const value = raw ? parseInt(raw, 10) : NaN;
      if (Number.isNaN(value) || value < 1 || value > 10) {
        setError(`Enter a score from 1-10 for every criterion (missing/invalid: "${c.name}").`);
        return;
      }
      entries.push({ criterionId: c.id, score: value });
    }
    setError(null);
    setSubmitting(true);
    try {
      await submitScorecard(groupId, entries, token);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit scorecard');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Text style={styles.label}>Cohort</Text>
      <CohortPicker selectedCohortId={cohortId} onSelect={setCohortId} />

      {loading ? <ActivityIndicator color={colors.primary} /> : null}

      {cohortId && !loading ? (
        <>
          <Text style={styles.label}>Group to score</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {groups.map((g) => (
              <Pressable
                key={g.id}
                style={[styles.chip, groupId === g.id && styles.chipSelected]}
                onPress={() => setGroupId(g.id)}
              >
                <Avatar name={g.name ?? `Group ${g.groupNumber}`} size={20} photoUrl={resolveGroupPhotoUrl(g.photoUrl)} />
                <Text style={[styles.chipText, groupId === g.id && styles.chipTextSelected]}>
                  {g.name ?? `Group ${g.groupNumber}`}
                </Text>
              </Pressable>
            ))}
            {groups.length === 0 ? <Text style={styles.emptyText}>No groups in this cohort.</Text> : null}
          </ScrollView>
        </>
      ) : null}

      {groupId && criteria.length === 0 && !loading ? (
        <Text style={styles.emptyText}>No active judging criteria configured for this cohort yet.</Text>
      ) : null}

      {groupId && criteria.length > 0 ? (
        <Card style={styles.scoreCard}>
          {criteria.map((c, i) => {
            const raw = scores[c.id];
            const value = raw ? parseInt(raw, 10) : NaN;
            const barColor = accentList[i % accentList.length].accent;
            return (
              <View key={c.id} style={styles.scoreRow}>
                <View style={styles.scoreRowTop}>
                  <Text style={styles.criterionName}>
                    {c.name} <Text style={styles.criterionWeight}>({c.weight}%)</Text>
                  </Text>
                  <TextInput
                    style={styles.scoreInput}
                    value={scores[c.id] ?? ''}
                    onChangeText={(v) => onChangeScore(c.id, v)}
                    keyboardType="numeric"
                    placeholder="1-10"
                    maxLength={2}
                  />
                </View>
                <ProgressBar value={Number.isFinite(value) ? value / 10 : 0} color={barColor} />
              </View>
            );
          })}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? (
            <View style={styles.successRow}>
              <Feather name="check-circle" size={16} color={colors.accents.green.fg} />
              <Text style={styles.success}>Scorecard submitted.</Text>
            </View>
          ) : null}

          <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.buttonText}>Submit scorecard</Text>
            )}
          </Pressable>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.sm, backgroundColor: colors.bg },
    label: { ...typography.subheading, fontSize: 14, marginTop: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.text },
    chipTextSelected: { color: colors.textOnPrimary },
    scoreCard: { marginTop: spacing.md, gap: spacing.lg },
    scoreRow: { gap: spacing.sm },
    scoreRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    criterionName: { ...typography.body, flex: 1 },
    criterionWeight: { color: colors.textMuted },
    scoreInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      padding: spacing.sm,
      width: 60,
      textAlign: 'center',
      backgroundColor: colors.surface,
    },
    button: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' },
    buttonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 16 },
    emptyText: { color: colors.textMuted },
    error: { color: colors.danger },
    successRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    success: { color: colors.accents.green.fg },
  });
}
