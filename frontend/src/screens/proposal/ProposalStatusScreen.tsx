import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../../components/Text';
import { ApiError } from '../../api/client';
import { Cohort, listCohorts } from '../../api/cohorts';
import { getMyGroup, GroupResponse } from '../../api/groups';
import {
  getMyProposal,
  getProposalHistory,
  ProposalResponse,
  ProposalStatus,
  ProposalVersionResponse,
  resolveProposalPdfUrl,
  withdrawProposal,
} from '../../api/proposals';
import { useAuth } from '../../auth/AuthContext';
import { useUserNames, userLabel } from '../../hooks/useUserNames';
import Button, { ButtonVariant } from '../../components/Button';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import { ProposalStackParamList } from '../../navigation/types';
import { Colors, proposalStatusStyle, radius, spacing, typography, useTheme } from '../../theme';

type Props = NativeStackScreenProps<ProposalStackParamList, 'ProposalStatus'>;

const SEGMENTS: { status: ProposalStatus; label: string }[] = [
  { status: 'draft', label: 'Drafted' },
  { status: 'submitted', label: 'Submitted' },
  { status: 'under_review', label: 'Reviewing' },
  { status: 'approved', label: 'Approved' },
];
const SEGMENT_ORDER: ProposalStatus[] = ['draft', 'submitted', 'under_review', 'approved'];
const KNOWN_ACTIONS: ProposalStatus[] = ['submitted', 'approved', 'rejected', 'changes_requested'];

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function SegmentedProgress({ status }: { status: ProposalStatus }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const blocked = status === 'rejected' || status === 'changes_requested';
  const activeIndex = blocked ? 2 : SEGMENT_ORDER.indexOf(status);
  const blockedColor = blocked ? proposalStatusStyle(colors, status).accent : null;

  // Segments 0/1 (Drafted/Submitted) share the primary color when reached;
  // 2 (Reviewing) and 3 (Approved) get their own accent so the bar reads
  // left-to-right as real progress, not just "more of the same color".
  const segmentColor = (i: number) => {
    if (i > activeIndex) return colors.border;
    if (i === activeIndex && blockedColor) return blockedColor;
    if (i === 2) return colors.accents.amber.accent;
    if (i === 3) return colors.accents.green.accent;
    return colors.primary;
  };

  return (
    <View
      accessibilityLabel={`Proposal progress: ${blocked ? proposalStatusStyle(colors, status).label : SEGMENTS[activeIndex]?.label ?? ''}`}
    >
      <View style={styles.segmentRow}>
        {SEGMENTS.map((s, i) => (
          <View key={s.status} style={[styles.segment, { backgroundColor: segmentColor(i) }]} />
        ))}
      </View>
      <View style={styles.segmentLabelRow}>
        {SEGMENTS.map((s, i) => (
          <Text key={s.status} style={[styles.segmentLabel, i <= activeIndex && styles.segmentLabelActive]}>
            {s.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function ProposalStatusScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [proposal, setProposal] = useState<ProposalResponse | null>(null);
  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [history, setHistory] = useState<ProposalVersionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const supervisorNames = useUserNames([group?.supervisorId]);
  const historyActorNames = useUserNames(history.map((h) => h.actorId));

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [p, g, cohortList] = await Promise.all([
        getMyProposal(token),
        getMyGroup(token).catch(() => null),
        listCohorts(token).catch(() => []),
      ]);
      setProposal(p);
      setGroup(g);
      setCohorts(cohortList);
      const h = await getProposalHistory(p.id, token).catch(() => null);
      setHistory(h?.history ?? []);
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

  const onWithdraw = async () => {
    if (!token || !proposal) return;
    if (!confirmingWithdraw) {
      setConfirmingWithdraw(true);
      setTimeout(() => setConfirmingWithdraw(false), 4000);
      return;
    }
    setConfirmingWithdraw(false);
    setError(null);
    setWithdrawing(true);
    try {
      const updated = await withdrawProposal(proposal.id, token);
      setProposal(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to withdraw proposal');
    } finally {
      setWithdrawing(false);
    }
  };

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

  const canResubmit =
    proposal.status === 'rejected' || proposal.status === 'changes_requested' || proposal.status === 'draft';
  const canWithdraw = proposal.status === 'submitted' || proposal.status === 'under_review';
  const statusStyle = proposalStatusStyle(colors, proposal.status);
  const cohort = group ? cohorts.find((c) => c.id === group.cohortId) : undefined;
  const supervisorName = group?.supervisorId ? userLabel(group.supervisorId, supervisorNames) : null;

  let statusSubtext: string;
  if (proposal.status === 'draft') {
    statusSubtext = 'Not submitted yet';
  } else if (proposal.status === 'submitted' || proposal.status === 'under_review') {
    statusSubtext = `Revision ${proposal.currentVersion}${supervisorName ? ` · with ${supervisorName}` : ''} since ${shortDate(proposal.updatedAt)}`;
  } else {
    statusSubtext = `Revision ${proposal.currentVersion} · ${statusStyle.label.toLowerCase()} ${shortDate(proposal.updatedAt)}`;
  }

  const openPdf = () => {
    if (!proposal.pdfUrl) return;
    const url = resolveProposalPdfUrl(proposal.pdfUrl)!;
    Linking.openURL(url).catch(() => setError('Could not open the PDF attachment.'));
  };

  // Two footer slots (matches the design's two-button bar) — which action
  // lands in which slot depends on the proposal's state, but never more than
  // one "withdraw or resubmit" action plus "open the PDF" at a time.
  type FooterSpec = { label: string; onPress: () => void; variant?: ButtonVariant; loading?: boolean };
  let footerLeft: FooterSpec | null = null;
  let footerRight: FooterSpec | null = null;
  if (canWithdraw) {
    footerLeft = {
      label: confirmingWithdraw ? 'Tap again to confirm' : 'Withdraw',
      onPress: onWithdraw,
      variant: 'secondary',
      loading: withdrawing,
    };
    if (proposal.pdfUrl) footerRight = { label: 'Open proposal', onPress: openPdf };
  } else if (canResubmit) {
    if (proposal.pdfUrl) footerLeft = { label: 'Open proposal', onPress: openPdf, variant: 'secondary' };
    footerRight = { label: 'Resubmit', onPress: () => navigation.navigate('ProposalForm', { mode: 'resubmit', proposal }) };
  } else if (proposal.pdfUrl) {
    footerRight = { label: 'Open proposal', onPress: openPdf };
  }

  const reversedHistory = [...history].reverse();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.container}>
        {group ? (
          <Text style={styles.contextLine}>
            {group.name ?? `Group ${group.groupNumber}`}
            {cohort ? ` · ${cohort.year} cohort` : ''}
          </Text>
        ) : null}
        <Text style={styles.title}>{proposal.title}</Text>

        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIconWrap, { backgroundColor: statusStyle.tint }]}>
              <Feather name={statusStyle.icon} size={22} color={statusStyle.fg} />
            </View>
            <View style={styles.statusText}>
              <Text style={styles.statusLabel}>{statusStyle.label}</Text>
              <Text style={styles.statusSub}>{statusSubtext}</Text>
            </View>
          </View>
          <SegmentedProgress status={proposal.status} />
        </Card>

        <Text style={styles.sectionHeading}>Problem statement</Text>
        <Text style={styles.body}>{proposal.problemStatement}</Text>

        <Text style={styles.sectionHeading}>Objectives</Text>
        <Text style={styles.body}>{proposal.objectives}</Text>

        <Text style={styles.sectionHeading}>Tech stack</Text>
        <Text style={styles.body}>{proposal.techStack}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {reversedHistory.length > 0 ? (
          <>
            <Text style={styles.historyEyebrow}>History</Text>
            <View style={styles.timeline}>
              {reversedHistory.map((item, i) => {
                const known = KNOWN_ACTIONS.includes(item.action as ProposalStatus);
                const itemStyle = known ? proposalStatusStyle(colors, item.action as ProposalStatus) : null;
                // Only the most recent couple of events get full color — older
                // history fades to a neutral marker so the timeline reads as
                // "what's currently relevant" rather than a flat colored list.
                const emphasized = i < 2;
                const dotColor = emphasized && itemStyle ? itemStyle.accent : colors.border;
                const title =
                  item.action === 'submitted'
                    ? `Revision ${item.versionNumber} submitted`
                    : itemStyle
                      ? itemStyle.label
                      : item.action.replace('_', ' ');
                return (
                  <View key={item.id} style={styles.timelineItem}>
                    <View style={styles.timelineMarker}>
                      <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
                      {i < reversedHistory.length - 1 ? <View style={styles.timelineLine} /> : null}
                    </View>
                    <View style={styles.timelineBody}>
                      <Text style={styles.timelineTitle}>{title}</Text>
                      <Text style={styles.timelineMeta}>
                        {shortDate(item.createdAt)} · {userLabel(item.actorId, historyActorNames)}
                      </Text>
                      {item.feedback ? (
                        <View style={styles.feedbackBubble}>
                          <Text style={styles.feedbackText}>{item.feedback}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      {footerLeft || footerRight ? (
        <View style={styles.footer}>
          {footerLeft ? (
            <Button
              label={footerLeft.label}
              variant={footerLeft.variant ?? 'secondary'}
              loading={footerLeft.loading}
              onPress={footerLeft.onPress}
              style={styles.footerButtonSecondary}
              accessibilityLabel={footerLeft.label}
            />
          ) : null}
          {footerRight ? (
            <Button
              label={footerRight.label}
              loading={footerRight.loading}
              onPress={footerRight.onPress}
              style={styles.footerButtonPrimary}
              accessibilityLabel={footerRight.label}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.sm, backgroundColor: colors.bg, paddingBottom: spacing.xxxl },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.xl },
    contextLine: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
    title: { ...typography.heading, fontSize: 24, marginTop: 2 },
    statusCard: { marginTop: spacing.md, borderRadius: radius.xxl, gap: spacing.md },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    statusIconWrap: { width: 48, height: 48, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
    statusText: { flex: 1 },
    statusLabel: { ...typography.heading, fontSize: 18 },
    statusSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    segmentRow: { flexDirection: 'row', gap: spacing.xs },
    segment: { flex: 1, height: 6, borderRadius: radius.pill },
    segmentLabelRow: { flexDirection: 'row', marginTop: spacing.xs },
    segmentLabel: { flex: 1, ...typography.caption, fontSize: 10.5, color: colors.textMuted },
    segmentLabelActive: { color: colors.text, fontWeight: '700' },
    sectionHeading: { ...typography.subheading, fontSize: 15, marginTop: spacing.lg },
    body: { ...typography.body, color: colors.textMuted },
    historyEyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginTop: spacing.xl,
      marginBottom: spacing.xs,
    },
    timeline: { gap: 0 },
    timelineItem: { flexDirection: 'row', gap: spacing.md },
    timelineMarker: { alignItems: 'center', width: 12 },
    timelineDot: { width: 12, height: 12, borderRadius: radius.pill, marginTop: 4 },
    timelineLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
    timelineBody: { flex: 1, paddingBottom: spacing.lg },
    timelineTitle: { ...typography.body, fontWeight: '700' },
    timelineMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    feedbackBubble: {
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      backgroundColor: colors.surface,
    },
    feedbackText: { ...typography.body, color: colors.text },
    error: { color: colors.danger, textAlign: 'center' },
    footer: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    footerButtonSecondary: { flex: 1, borderRadius: radius.xxxl },
    footerButtonPrimary: {
      flex: 1.4,
      borderRadius: radius.xxxl,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 14,
      elevation: 6,
    },
  });
}
