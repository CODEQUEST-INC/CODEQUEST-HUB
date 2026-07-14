import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GroupResponse, listGroupsByCohort } from '../../api/groups';
import { getMyScorecard, JudgingCriterion, listCriteria, ScoreEntry, submitScorecard } from '../../api/judging';
import { useAuth } from '../../auth/AuthContext';
import CohortPicker from '../../components/CohortPicker';

export default function ScorecardScreen() {
  const { token } = useAuth();
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
    setGroupId(null);
    setScores({});
    setSuccess(false);
    setLoading(true);
    setError(null);
    Promise.all([listGroupsByCohort(cohortId, token), listCriteria(cohortId, token)])
      .then(([groupList, criteriaList]) => {
        setGroups(groupList);
        setCriteria(criteriaList.filter((c) => c.active));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load cohort data'))
      .finally(() => setLoading(false));
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Cohort</Text>
      <CohortPicker selectedCohortId={cohortId} onSelect={setCohortId} />

      {loading ? <ActivityIndicator /> : null}

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
        <View style={styles.card}>
          {criteria.map((c) => (
            <View key={c.id} style={styles.scoreRow}>
              <Text style={styles.criterionName}>
                {c.name} <Text style={styles.criterionWeight}>({c.weight}%)</Text>
              </Text>
              <TextInput
                style={styles.scoreInput}
                value={scores[c.id] ?? ''}
                onChangeText={(v) => setScores((prev) => ({ ...prev, [c.id]: v }))}
                keyboardType="numeric"
                placeholder="1-10"
                maxLength={2}
              />
            </View>
          ))}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>Scorecard submitted.</Text> : null}

          <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit scorecard</Text>}
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#374151' },
  chipTextSelected: { color: '#fff' },
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    gap: 12,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  criterionName: { fontSize: 14, flex: 1 },
  criterionWeight: { color: '#6b7280' },
  scoreInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    width: 60,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  button: { backgroundColor: '#2563eb', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  emptyText: { color: '#6b7280' },
  error: { color: '#dc2626' },
  success: { color: '#15803d' },
});
