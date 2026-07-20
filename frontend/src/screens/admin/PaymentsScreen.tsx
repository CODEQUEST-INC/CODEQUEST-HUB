import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../../components/TextInput';
import Text from '../../components/Text';
import {
  getCohortPaymentStatuses,
  getFeeConfig,
  GroupPaymentStatus,
  PaymentFeeConfig,
  setFeeConfig,
} from '../../api/payments';
import { useAuth } from '../../auth/AuthContext';
import Card from '../../components/Card';
import CohortPicker from '../../components/CohortPicker';
import PaidBadge from '../../components/PaidBadge';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';

export default function PaymentsScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [feeConfig, setFeeConfigState] = useState<PaymentFeeConfig | null>(null);
  const [statuses, setStatuses] = useState<GroupPaymentStatus[]>([]);
  const [amountInput, setAmountInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          {statuses.map((s) => (
            <Card key={s.groupId} style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={styles.cardTitle}>
                  Group {s.groupNumber} {s.groupName ? `— ${s.groupName}` : ''}
                </Text>
                <PaidBadge status={s.status} />
              </View>
              {s.amountPesewas != null ? (
                <Text style={styles.cardMeta}>{(s.amountPesewas / 100).toFixed(2)} GHS</Text>
              ) : null}
            </Card>
          ))}
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
