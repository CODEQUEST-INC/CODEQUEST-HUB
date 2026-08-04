import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../../components/TextInput';
import Text from '../../components/Text';
import Button from '../../components/Button';
import KeyboardAvoidingScreen from '../../components/KeyboardAvoidingScreen';
import { GroupResponse, listGroupsByCohort, resolveGroupPhotoUrl } from '../../api/groups';
import { getMyScorecard, JudgingCriterion, listCriteria, ScoreEntry, submitScorecard } from '../../api/judging';
import { useAuth } from '../../auth/AuthContext';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import CohortPicker from '../../components/CohortPicker';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';

interface Draft {
  scores: Record<string, string>;
  comment: string;
}

function SegmentedScore({
  value,
  onChange,
  color,
  accessibilityLabel,
}: {
  value: number | null;
  onChange: (n: number) => void;
  color: string;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.segmentRow}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          hitSlop={4}
          style={[styles.segmentBlock, value !== null && n <= value ? { backgroundColor: color } : styles.segmentBlockEmpty]}
          accessibilityRole="button"
          accessibilityLabel={`${accessibilityLabel}: ${n}`}
          accessibilityState={{ selected: value === n }}
        />
      ))}
    </View>
  );
}

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
  const [comment, setComment] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  // Keeps in-progress scores for a project when you switch to another one in
  // the picker and come back — session-only, never sent to the server. A real
  // "submit" always still requires every criterion, same as before.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [justSaved, setJustSaved] = useState(false);
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
    setComment('');
    setSuccess(false);
    setDrafts({});
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
    setJustSaved(false);

    const draft = drafts[groupId];
    if (draft) {
      setScores(draft.scores);
      setComment(draft.comment);
      setHasSubmitted(false);
      return;
    }

    getMyScorecard(groupId, token)
      .then((scorecard) => {
        if (scorecard) {
          const prefilled: Record<string, string> = {};
          scorecard.scores.forEach((s) => {
            prefilled[s.criterionId] = String(s.score);
          });
          setScores(prefilled);
          setComment(scorecard.comment ?? '');
          setHasSubmitted(true);
        } else {
          setScores({});
          setComment('');
          setHasSubmitted(false);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load your existing scorecard'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, groupId]);

  const onChangeScore = (criterionId: string, n: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: String(n) }));
    setJustSaved(false);
  };

  const onSave = () => {
    if (!groupId) return;
    setDrafts((prev) => ({ ...prev, [groupId]: { scores, comment } }));
    setJustSaved(true);
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
      await submitScorecard(groupId, entries, token, comment.trim());
      setSuccess(true);
      setHasSubmitted(true);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit scorecard');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedGroup = groups.find((g) => g.id === groupId) ?? null;
  const selectedIndex = groupId ? groups.findIndex((g) => g.id === groupId) : -1;

  const weightedTotal = criteria.reduce((sum, c) => {
    const raw = scores[c.id];
    const value = raw ? parseInt(raw, 10) : NaN;
    if (Number.isNaN(value)) return sum;
    return sum + (value * Number(c.weight)) / 100;
  }, 0);

  return (
    <KeyboardAvoidingScreen>
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
                style={({ pressed }) => [styles.chip, groupId === g.id && styles.chipSelected, pressed && styles.chipPressed]}
                onPress={() => setGroupId(g.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: groupId === g.id }}
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

      {selectedGroup && criteria.length > 0 ? (
        <>
          <View style={styles.projectHeaderRow}>
            <Text style={styles.projectEyebrow}>
              PROJECT {selectedIndex + 1} OF {groups.length}
            </Text>
            <View style={[styles.statusPill, hasSubmitted ? styles.statusPillScored : styles.statusPillDraft]}>
              <Text style={[styles.statusPillText, { color: hasSubmitted ? colors.accents.green.fg : colors.textMuted }]}>
                {hasSubmitted ? 'Scored' : 'Draft'}
              </Text>
            </View>
          </View>
          <Text style={styles.projectTitle}>{selectedGroup.name ?? `Group ${selectedGroup.groupNumber}`}</Text>
          <Text style={styles.projectMeta}>
            Group {selectedGroup.groupNumber} · {selectedGroup.members.length} member{selectedGroup.members.length === 1 ? '' : 's'}
          </Text>

          {criteria.map((c, i) => {
            const raw = scores[c.id];
            const value = raw ? parseInt(raw, 10) : null;
            const barColor = accentList[i % accentList.length].accent;
            return (
              <Card key={c.id} style={styles.criterionCard}>
                <View style={styles.criterionHeader}>
                  <Text style={styles.criterionName}>{c.name}</Text>
                  <View style={styles.criterionScoreWrap}>
                    <Text style={styles.criterionWeight}>{c.weight}%</Text>
                    <Text style={styles.criterionScoreValue}>{value ?? '—'}</Text>
                  </View>
                </View>
                <SegmentedScore
                  value={value}
                  onChange={(n) => onChangeScore(c.id, n)}
                  color={barColor}
                  accessibilityLabel={`Score for ${c.name}`}
                />
              </Card>
            );
          })}

          <Card style={styles.criterionCard}>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={(v) => {
                setComment(v);
                setJustSaved(false);
              }}
              placeholder="Comment to the team — optional, shared after results"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
              maxLength={2000}
              accessibilityLabel="Comment for this group, optional"
            />
          </Card>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? (
            <View style={styles.successRow}>
              <Feather name="check-circle" size={16} color={colors.accents.green.fg} />
              <Text style={styles.success}>Scorecard submitted.</Text>
            </View>
          ) : null}
          {justSaved ? (
            <View style={styles.successRow}>
              <Feather name="check-circle" size={16} color={colors.textMuted} />
              <Text style={styles.savedText}>Saved for this session.</Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <View style={styles.footerWeighted}>
              <Text style={styles.footerWeightedLabel}>WEIGHTED</Text>
              <Text style={styles.footerWeightedValue}>
                {weightedTotal.toFixed(1)}
                <Text style={styles.footerWeightedMax}>/10</Text>
              </Text>
            </View>
            <View style={styles.footerButtons}>
              <Button label="Save" onPress={onSave} variant="secondary" style={styles.saveButton} accessibilityLabel="Save progress for this session" />
              <Button
                label="Submit"
                onPress={onSubmit}
                loading={submitting}
                style={[
                  styles.submitButton,
                  {
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 14,
                    elevation: 6,
                  },
                ]}
              />
            </View>
          </View>
        </>
      ) : null}
      </ScrollView>
    </KeyboardAvoidingScreen>
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
      minHeight: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipPressed: { opacity: 0.8 },
    chipText: { color: colors.text },
    chipTextSelected: { color: colors.textOnPrimary },
    projectHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
    },
    projectEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.textMuted },
    statusPill: { paddingVertical: 3, paddingHorizontal: spacing.md, borderRadius: radius.pill },
    statusPillDraft: { backgroundColor: colors.surfaceSunken },
    statusPillScored: { backgroundColor: colors.accents.green.tint },
    statusPillText: { fontSize: 11, fontWeight: '700' },
    projectTitle: { ...typography.heading, fontSize: 22, marginTop: 4 },
    projectMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2, marginBottom: spacing.sm },
    criterionCard: { borderRadius: radius.xxl, gap: spacing.md },
    criterionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    criterionName: { ...typography.body, fontWeight: '700', flex: 1 },
    criterionScoreWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    criterionWeight: { ...typography.caption, color: colors.textMuted },
    criterionScoreValue: { fontSize: 22, fontWeight: '800', color: colors.text, minWidth: 24, textAlign: 'right' },
    segmentRow: { flexDirection: 'row', gap: 4 },
    segmentBlock: { flex: 1, height: 32, borderRadius: radius.sm },
    segmentBlockEmpty: { backgroundColor: colors.surfaceSunken },
    commentInput: {
      minHeight: 60,
      textAlignVertical: 'top',
      color: colors.text,
      fontSize: 14,
    },
    emptyText: { color: colors.textMuted },
    error: { color: colors.danger },
    successRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    success: { color: colors.accents.green.fg },
    savedText: { color: colors.textMuted },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginTop: spacing.md,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerWeighted: { gap: 2 },
    footerWeightedLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.textMuted },
    footerWeightedValue: { fontSize: 28, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
    footerWeightedMax: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
    footerButtons: { flexDirection: 'row', gap: spacing.sm },
    saveButton: { borderRadius: radius.xxxl },
    submitButton: { borderRadius: radius.xxxl },
  });
}
