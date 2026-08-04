import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet } from 'react-native';
import TextInput from '../../components/TextInput';
import Text from '../../components/Text';
import { resolveProposalPdfUrl, reviewProposal, ReviewAction } from '../../api/proposals';
import { useAuth } from '../../auth/AuthContext';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { SupervisorStackParamList } from '../../navigation/types';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';
import { confirmAction } from '../../utils/confirm';

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
  const leavingIntentionally = useRef(false);

  const canReview = proposal.status === 'submitted' || proposal.status === 'under_review';
  const feedbackTooShort = feedback.trim().length < FEEDBACK_MIN_LENGTH;

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (!feedback.trim() || leavingIntentionally.current) return;
        e.preventDefault();
        confirmAction({
          title: 'Discard feedback?',
          message: "You've written feedback that hasn't been submitted yet.",
          confirmLabel: 'Discard',
          cancelLabel: 'Keep editing',
          onConfirm: () => navigation.dispatch(e.data.action),
        });
      }),
    [navigation, feedback]
  );

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
      leavingIntentionally.current = true;
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

      {proposal.pdfUrl ? (
        <Button
          label="View PDF attachment"
          icon="file-text"
          variant="secondary"
          style={styles.pdfButton}
          onPress={() => {
            const url = resolveProposalPdfUrl(proposal.pdfUrl)!;
            Linking.openURL(url).catch(() => setError('Could not open the PDF attachment.'));
          }}
        />
      ) : null}

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
            accessibilityLabel="Feedback"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Approve"
            icon="check-circle"
            variant="accentGreen"
            style={styles.approveButton}
            onPress={() => act('approved')}
            disabled={!!submittingAction}
            loading={submittingAction === 'approved'}
          />
          <Button
            label="Request changes"
            icon="edit-3"
            variant="accentAmber"
            style={styles.changesButton}
            onPress={() => act('changes_requested')}
            disabled={!!submittingAction}
            loading={submittingAction === 'changes_requested'}
          />

          {/* Reject is deliberately styled quieter (outline, not solid fill)
              and set apart with extra spacing so it doesn't carry equal
              visual weight to Approve/Request changes — it's the most
              severe of the three actions. */}
          <Button
            label="Reject"
            icon="x-circle"
            variant="dangerOutline"
            style={styles.rejectButton}
            onPress={() => act('rejected')}
            disabled={!!submittingAction}
            loading={submittingAction === 'rejected'}
          />
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
      borderRadius: radius.xl,
      padding: spacing.md,
      fontSize: 16,
      minHeight: 90,
      textAlignVertical: 'top',
      marginTop: spacing.sm,
      backgroundColor: colors.surface,
    },
    error: { color: colors.danger, marginTop: spacing.sm },
    pdfButton: { marginTop: spacing.lg },
    approveButton: { marginTop: spacing.lg },
    changesButton: { marginTop: spacing.md },
    rejectButton: { marginTop: spacing.xl },
  });
}
