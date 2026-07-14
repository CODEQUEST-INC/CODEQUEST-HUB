import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { reviewProposal, ReviewAction } from '../../api/proposals';
import { useAuth } from '../../auth/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { SupervisorStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SupervisorStackParamList, 'ReviewDetail'>;

const FEEDBACK_MIN_LENGTH = 10;

export default function ReviewDetailScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const [proposal, setProposal] = useState(route.params.proposal);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<ReviewAction | null>(null);

  const canReview = proposal.status === 'submitted' || proposal.status === 'under_review';
  const feedbackTooShort = feedback.trim().length < FEEDBACK_MIN_LENGTH;

  const act = async (action: ReviewAction) => {
    if (action !== 'approved' && feedbackTooShort) {
      setError(`Feedback must be at least ${FEEDBACK_MIN_LENGTH} characters for this action.`);
      return;
    }
    setError(null);
    setSubmittingAction(action);
    try {
      const updated = await reviewProposal(proposal.id, { action, feedback: feedback.trim() || undefined }, token!);
      setProposal(updated);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit review');
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBadge status={proposal.status} />
      <Text style={styles.title}>{proposal.title}</Text>

      <Text style={styles.sectionHeading}>Problem statement</Text>
      <Text style={styles.body}>{proposal.problemStatement}</Text>

      <Text style={styles.sectionHeading}>Objectives</Text>
      <Text style={styles.body}>{proposal.objectives}</Text>

      <Text style={styles.sectionHeading}>Tech stack</Text>
      <Text style={styles.body}>{proposal.techStack}</Text>

      {canReview ? (
        <>
          <Text style={[styles.label, styles.feedbackLabel]}>
            Feedback (required for reject / request changes)
          </Text>
          <TextInput
            style={styles.input}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Explain what needs to change..."
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.approveButton} onPress={() => act('approved')} disabled={!!submittingAction}>
            {submittingAction === 'approved' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Approve</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.changesButton}
            onPress={() => act('changes_requested')}
            disabled={!!submittingAction}
          >
            {submittingAction === 'changes_requested' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Request changes</Text>
            )}
          </Pressable>
          <Pressable style={styles.rejectButton} onPress={() => act('rejected')} disabled={!!submittingAction}>
            {submittingAction === 'rejected' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Reject</Text>
            )}
          </Pressable>
        </>
      ) : (
        <Text style={styles.meta}>This proposal has already been reviewed.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 16 },
  sectionHeading: { fontSize: 15, fontWeight: '600', marginTop: 16 },
  body: { fontSize: 14, color: '#374151' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  feedbackLabel: { marginTop: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 90,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  error: { color: '#dc2626', marginTop: 8 },
  approveButton: {
    backgroundColor: '#15803d',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  changesButton: {
    backgroundColor: '#b45309',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  rejectButton: {
    backgroundColor: '#b91c1c',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
