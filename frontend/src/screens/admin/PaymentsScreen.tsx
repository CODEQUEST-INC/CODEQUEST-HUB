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
  setFeeConfig,
} from '../../api/payments';
import { useAuth } from '../../auth/AuthContext';
import Card from '../../components/Card';
import CohortPicker from '../../components/CohortPicker';
import PaidBadge from '../../components/PaidBadge';
import { useUserNames, userLabel } from '../../hooks/useUserNames';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';

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

  const onSave = async () => {
    if (!token || !cohortId) return;
    const amount = parseFloat(amountInput);
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Enter a valid fee amount.');
      return;
    }
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
          />
          <Pressable style={styles.button} onPress={onSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.buttonText}>{feeConfig ? 'Update fee' : 'Set fee'}</Text>
            )}
          </Pressable>
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
                <Pressable style={styles.statusRow} onPress={() => toggleExpanded(s.groupId)}>
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
    statusCard: { gap: spacing.xs },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
      borderRadius: radius.sm,
      padding: spacing.md,
      fontSize: 15,
      backgroundColor: colors.surface,
    },
    button: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
    buttonText: { color: colors.textOnPrimary, fontWeight: '600' },
    emptyText: { color: colors.textMuted, textAlign: 'center' },
    error: { color: colors.danger },
  });
}
