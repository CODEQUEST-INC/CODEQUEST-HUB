import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../../components/TextInput';
import Text from '../../components/Text';
import { reviewProposal, ReviewAction } from '../../api/proposals';
import { useAuth } from '../../auth/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { SupervisorStackParamList } from '../../navigation/types';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';

type Props = NativeStackScreenProps<SupervisorStackParamList, 'ReviewDetail'>;

const FEEDBACK_MIN_LENGTH = 10;

export default function ReviewDetailScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
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
            placeholderTextColor={colors.textMuted}
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.approveButton} onPress={() => act('approved')} disabled={!!submittingAction}>
            {submittingAction === 'approved' ? (
              <ActivityIndicator color={colors.textOnPrimary} />
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
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.buttonText}>Request changes</Text>
            )}
          </Pressable>
          <Pressable style={styles.rejectButton} onPress={() => act('rejected')} disabled={!!submittingAction}>
            {submittingAction === 'rejected' ? (
              <ActivityIndicator color={colors.textOnPrimary} />
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

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.sm, backgroundColor: colors.bg },
    title: { ...typography.heading, fontSize: 20, marginTop: spacing.sm },
    meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg },
    sectionHeading: { ...typography.subheading, fontSize: 15, marginTop: spacing.lg },
    body: { ...typography.body, color: colors.textMuted },
    label: { ...typography.body, fontWeight: '600' },
    feedbackLabel: { marginTop: spacing.xl },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      fontSize: 16,
      minHeight: 90,
      textAlignVertical: 'top',
      marginTop: spacing.sm,
      backgroundColor: colors.surface,
    },
    error: { color: colors.danger, marginTop: spacing.sm },
    approveButton: {
      backgroundColor: colors.accents.green.accent,
      borderRadius: radius.md,
      padding: spacing.lg,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    changesButton: {
      backgroundColor: colors.accents.amber.accent,
      borderRadius: radius.md,
      padding: spacing.lg,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    rejectButton: {
      backgroundColor: colors.danger,
      borderRadius: radius.md,
      padding: spacing.lg,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    buttonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 16 },
  });
}
