import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../../components/Text';
import { ApiError } from '../../api/client';
import { getMyProposal, ProposalResponse, ProposalStatus, resolveProposalPdfUrl } from '../../api/proposals';
import { useAuth } from '../../auth/AuthContext';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { ProposalStackParamList } from '../../navigation/types';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';

type Props = NativeStackScreenProps<ProposalStackParamList, 'ProposalStatus'>;

const STEPS: { key: ProposalStatus; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under review' },
  { key: 'approved', label: 'Approved' },
];

function ProgressSteps({ status }: { status: ProposalStatus }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const blocked = status === 'rejected' || status === 'changes_requested';
  const activeIndex = blocked ? 2 : STEPS.findIndex((s) => s.key === status);

  return (
    <View style={styles.stepsRow}>
      {STEPS.map((step, i) => {
        const reached = i <= activeIndex;
        const isActive = i === activeIndex;
        const dotColor = isActive && blocked ? colors.danger : reached ? colors.primary : colors.border;
        return (
          <React.Fragment key={step.key}>
            {i > 0 ? (
              <View style={[styles.stepLine, { backgroundColor: i <= activeIndex ? colors.primary : colors.border }]} />
            ) : null}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, { backgroundColor: dotColor }]} />
              <Text style={[styles.stepLabel, reached ? styles.stepLabelActive : null]}>{step.label}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function ProposalStatusScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [proposal, setProposal] = useState<ProposalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const p = await getMyProposal(token);
      setProposal(p);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setProposal(null);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load proposal');
      }
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

  if (!proposal) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="file-plus"
          heading="No proposal yet"
          subtext="Your group hasn't submitted a proposal yet."
          ctaLabel="Submit proposal"
          onPressCta={() => navigation.navigate('ProposalForm', { mode: 'submit' })}
        />
      </View>
    );
  }

  const canResubmit = proposal.status === 'rejected' || proposal.status === 'changes_requested';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <ProgressSteps status={proposal.status} />

      <StatusBadge status={proposal.status} />
      <Text style={styles.title}>{proposal.title}</Text>
      <Text style={styles.meta}>Version {proposal.currentVersion}</Text>

      <Text style={styles.sectionHeading}>Problem statement</Text>
      <Text style={styles.body}>{proposal.problemStatement}</Text>

      <Text style={styles.sectionHeading}>Objectives</Text>
      <Text style={styles.body}>{proposal.objectives}</Text>

      <Text style={styles.sectionHeading}>Tech stack</Text>
      <Text style={styles.body}>{proposal.techStack}</Text>

      {proposal.pdfUrl ? (
        <Pressable
          style={styles.secondaryButton}
          onPress={() => Linking.openURL(resolveProposalPdfUrl(proposal.pdfUrl)!)}
        >
          <Feather name="file-text" size={15} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>View PDF attachment</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('ProposalHistory', { proposalId: proposal.id })}
      >
        <Feather name="clock" size={15} color={colors.primary} />
        <Text style={styles.secondaryButtonText}>View history</Text>
      </Pressable>

      {canResubmit ? (
        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate('ProposalForm', { mode: 'resubmit', proposal })}
        >
          <Text style={styles.buttonText}>Resubmit</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.sm, backgroundColor: colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.xl },
    stepsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
    stepItem: { alignItems: 'center', width: 64 },
    stepDot: { width: 12, height: 12, borderRadius: radius.pill },
    stepLine: { flex: 1, height: 2, marginBottom: 18 },
    stepLabel: { ...typography.caption, color: colors.textMuted, fontSize: 10.5, marginTop: spacing.xs, textAlign: 'center' },
    stepLabelActive: { color: colors.text, fontWeight: '700' },
    title: { ...typography.heading, fontSize: 20, marginTop: spacing.sm },
    meta: { ...typography.caption, color: colors.textMuted },
    sectionHeading: { ...typography.subheading, fontSize: 15, marginTop: spacing.lg },
    body: { ...typography.body, color: colors.textMuted },
    emptyText: { color: colors.textMuted, textAlign: 'center' },
    error: { color: colors.danger, textAlign: 'center' },
    button: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      padding: spacing.lg,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    buttonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 16 },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginTop: spacing.lg,
    },
    secondaryButtonText: { color: colors.primary, fontWeight: '600' },
  });
}
