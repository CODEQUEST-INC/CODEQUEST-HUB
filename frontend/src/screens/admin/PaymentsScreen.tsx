import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import TextInput from '../../components/TextInput';
import Text from '../../components/Text';
import {
  CohortGroupPaymentSummary,
  getCohortPaymentStatuses,
  getFeeConfig,
  PaymentFeeConfig,
  remindUnpaidMembers,
  setFeeConfig,
} from '../../api/payments';
import { useAuth } from '../../auth/AuthContext';
import Button from '../../components/Button';
import Card from '../../components/Card';
import CohortPicker from '../../components/CohortPicker';
import PaidBadge from '../../components/PaidBadge';
import { useUserNames, userLabel } from '../../hooks/useUserNames';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';
import { confirmAction } from '../../utils/confirm';

export default function PaymentsScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [feeConfig, setFeeConfigState] = useState<PaymentFeeConfig | null>(null);
  const [statuses, setStatuses] = useState<CohortGroupPaymentSummary[]>([]);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [amountInput, setAmountInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remindingGroupId, setRemindingGroupId] = useState<string | null>(null);
  const [reminded, setReminded] = useState<Record<string, number>>({});

  const allMemberIds = statuses.flatMap((s) => s.members.map((m) => m.userId));
  const names = useUserNames(allMemberIds);

  const toggleExpanded = (groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const load = useCallback(async () => {
    if (!token || !cohortId) return;
    setLoading(true);
    setError(null);
    try {
      const [fee, groupStatuses] = await Promise.all([
        getFeeConfig(cohortId, token).catch(() => null),
        getCohortPaymentStatuses(cohortId, token),
      ]);
      setFeeConfigState(fee);
      setAmountInput(fee ? (fee.amountPesewas / 100).toFixed(2) : '');
      setStatuses(groupStatuses);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payment info');
    } finally {
      setLoading(false);
    }
  }, [token, cohortId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const someAlreadyPaid = statuses.some((s) => s.paidCount > 0);

  const onSave = async () => {
    if (!token || !cohortId) return;
    const amount = parseFloat(amountInput);
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Enter a valid fee amount.');
      return;
    }
    // Changing the fee after students have already paid the old amount
    // creates a silent mismatch between what they paid and what's now
    // configured — worth an explicit heads-up before committing.
    if (feeConfig && someAlreadyPaid) {
      confirmAction({
        title: 'Change registration fee?',
        message:
          'Some students have already paid the current amount. Changing it now will not refund or re-charge anyone — it only affects new payments.',
        confirmLabel: 'Change fee',
        onConfirm: () => saveFee(amount),
      });
      return;
    }
    await saveFee(amount);
  };

  const saveFee = async (amount: number) => {
    if (!token || !cohortId) return;
    setError(null);
    setSaving(true);
    try {
      const updated = await setFeeConfig(cohortId, Math.round(amount * 100), token);
      setFeeConfigState(updated);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save fee');
    } finally {
      setSaving(false);
    }
  };

  const onRemind = async (groupId: string) => {
    if (!token) return;
    setError(null);
    setRemindingGroupId(groupId);
    try {
      const result = await remindUnpaidMembers(groupId, token);
      setReminded((prev) => ({ ...prev, [groupId]: result.remindedCount }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send reminders');
    } finally {
      setRemindingGroupId(null);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <CohortPicker selectedCohortId={cohortId} onSelect={setCohortId} />

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {cohortId ? (
        <Card>
          <Text style={styles.cardTitle}>Per-student registration fee (GHS)</Text>
          <TextInput
            style={styles.input}
            value={amountInput}
            onChangeText={setAmountInput}
            placeholder="e.g. 50.00"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Registration fee amount in Ghana cedis"
          />
          <Button
            label={feeConfig ? 'Update fee' : 'Set fee'}
            onPress={onSave}
            loading={saving}
            style={[
              styles.button,
              {
                borderRadius: radius.xxxl,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 14,
                elevation: 6,
              },
            ]}
          />
        </Card>
      ) : null}

      {cohortId && feeConfig ? (
        <View style={styles.statusList}>
          <Text style={styles.sectionHeading}>Group payment status</Text>
          {statuses.map((s) => {
            const expanded = expandedGroupIds.has(s.groupId);
            return (
              <Card
                key={s.groupId}
                style={styles.statusCard}
                tint={s.allPaid ? colors.accents.green : undefined}
              >
                <Pressable
                  style={styles.statusRow}
                  onPress={() => toggleExpanded(s.groupId)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={`Group ${s.groupNumber} payment status, ${s.paidCount} of ${s.totalMembers} paid`}
                >
                  <Text style={styles.cardTitle}>
                    Group {s.groupNumber} {s.groupName ? `— ${s.groupName}` : ''}
                  </Text>
                  <View style={styles.statusRight}>
                    <Text style={styles.cardMeta}>
                      {s.paidCount}/{s.totalMembers} paid
                    </Text>
                    <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                  </View>
                </Pressable>

                {expanded ? (
                  <View style={styles.memberList}>
                    {s.members.map((m) => (
                      <View key={m.userId} style={styles.memberRow}>
                        <Text style={styles.memberName}>{userLabel(m.userId, names)}</Text>
                        <View style={styles.memberRight}>
                          {m.shirtSize ? <Text style={styles.cardMeta}>{m.shirtSize}</Text> : null}
                          <PaidBadge status={m.status} />
                        </View>
                      </View>
                    ))}
                    {!s.allPaid ? (
                      <>
                        <Button
                          label="Remind unpaid members"
                          icon="bell"
                          variant="secondary"
                          size="sm"
                          style={styles.remindButton}
                          onPress={() => onRemind(s.groupId)}
                          loading={remindingGroupId === s.groupId}
                        />
                        {reminded[s.groupId] !== undefined ? (
                          <Text style={styles.hint}>
                            Reminded {reminded[s.groupId]} member{reminded[s.groupId] === 1 ? '' : 's'}.
                          </Text>
                        ) : null}
                      </>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            );
          })}
          {statuses.length === 0 ? <Text style={styles.emptyText}>No groups in this cohort yet.</Text> : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
    cardTitle: { ...typography.body, fontWeight: '600' },
    cardMeta: { ...typography.caption, color: colors.textMuted },
    sectionHeading: { ...typography.subheading, marginTop: spacing.md, marginBottom: spacing.sm },
    statusList: { gap: spacing.sm },
    statusCard: { gap: spacing.xs, borderRadius: radius.xxl },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
    statusRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    memberList: { gap: spacing.xs, marginTop: spacing.xs },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    memberName: { ...typography.body, flex: 1 },
    memberRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      fontSize: 15,
      backgroundColor: colors.surface,
    },
    button: { marginTop: spacing.xs },
    remindButton: { marginTop: spacing.sm },
    hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
    emptyText: { color: colors.textMuted, textAlign: 'center' },
    error: { color: colors.danger },
  });
}
