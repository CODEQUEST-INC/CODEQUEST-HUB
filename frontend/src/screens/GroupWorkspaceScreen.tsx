import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Text from '../components/Text';
import { getMyGroup, GroupResponse, resolveGroupPhotoUrl, uploadGroupPhoto } from '../api/groups';
import {
  getFeeConfig,
  getGroupPaymentStatus,
  initializePayment,
  PaymentFeeConfig,
  PaymentRecord,
  verifyPayment,
} from '../api/payments';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useUserNames, userLabel } from '../hooks/useUserNames';
import Avatar from '../components/Avatar';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import PaidBadge from '../components/PaidBadge';
import { Colors, radius, spacing, typography, useTheme } from '../theme';

const SHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

function formatAmount(amountPesewas: number, currency: string): string {
  return `${currency} ${(amountPesewas / 100).toFixed(2)}`;
}

export default function GroupWorkspaceScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [feeConfig, setFeeConfig] = useState<PaymentFeeConfig | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentRecord | null>(null);
  const [shirtSize, setShirtSize] = useState('M');
  const [payingLoading, setPayingLoading] = useState(false);
  const [verifyingLoading, setVerifyingLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const g = await getMyGroup(token);
      setGroup(g);
      // Payment info is optional — a cohort with no fee configured, or a
      // group with no payment attempt yet, is a normal state, not an error.
      const [fee, status] = await Promise.all([
        getFeeConfig(g.cohortId, token).catch(() => null),
        getGroupPaymentStatus(g.id, token).catch(() => null),
      ]);
      setFeeConfig(fee);
      setPaymentStatus(status);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setGroup(null);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load group');
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

  const names = useUserNames([
    group?.groupLeaderId,
    group?.supervisorId,
    ...(group?.members.map((m) => m.userId) ?? []),
  ]);

  const onPickPhoto = async () => {
    if (!token || !group) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to upload a group photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const extension = asset.uri.split('.').pop()?.toLowerCase();
    const mimeType = asset.mimeType ?? (extension === 'png' ? 'image/png' : 'image/jpeg');
    const fileName = `group.${extension === 'png' ? 'png' : 'jpg'}`;

    setError(null);
    setUploadingPhoto(true);
    try {
      const updated = await uploadGroupPhoto(group.id, { uri: asset.uri, name: fileName, type: mimeType }, token);
      setGroup(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onPayNow = async () => {
    if (!token || !group) return;
    setPaymentError(null);
    setPayingLoading(true);
    try {
      const result = await initializePayment(group.id, shirtSize, token);
      // No public callback URL exists for Paystack to redirect back to, so we
      // re-fetch status ourselves (picking up the new "pending" record) and
      // rely on the "I've paid — verify" button once the student returns.
      const status = await getGroupPaymentStatus(group.id, token).catch(() => null);
      setPaymentStatus(status);
      await Linking.openURL(result.authorizationUrl);
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : 'Failed to start payment');
    } finally {
      setPayingLoading(false);
    }
  };

  const onVerifyPayment = async () => {
    if (!token || !paymentStatus) return;
    setPaymentError(null);
    setVerifyingLoading(true);
    try {
      const record = await verifyPayment(paymentStatus.paystackReference, token);
      setPaymentStatus(record);
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : 'Failed to verify payment');
    } finally {
      setVerifyingLoading(false);
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

  if (!group) {
    return (
      <View style={styles.centered}>
        <EmptyState icon="users" heading="No group yet" subtext="You're not currently assigned to a group." />
      </View>
    );
  }

  const photo = resolveGroupPhotoUrl(group.photoUrl);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.photoWrap} onPress={onPickPhoto} disabled={uploadingPhoto}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Feather name="image" size={22} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.photoEditBadge}>
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Feather name="camera" size={12} color={colors.textOnPrimary} />
            )}
          </View>
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{group.name ?? `Group ${group.groupNumber}`}</Text>
          <Text style={styles.subtitle}>Group #{group.groupNumber}</Text>
        </View>
      </View>

      {group.groupLeaderId ? (
        <Text style={styles.meta}>Leader: {userLabel(group.groupLeaderId, names)}</Text>
      ) : null}
      {group.supervisorId ? (
        <Text style={styles.meta}>Supervisor: {userLabel(group.supervisorId, names)}</Text>
      ) : null}

      {feeConfig ? (
        <Card style={styles.paymentCard} tint={colors.accents.pink}>
          <View style={styles.paymentHeaderRow}>
            <Text style={styles.cardTitle}>Registration fee</Text>
            <PaidBadge status={paymentStatus?.status ?? 'unpaid'} />
          </View>
          <Text style={styles.cardMeta}>
            {formatAmount(feeConfig.amountPesewas * group.members.length, feeConfig.currency)} total for{' '}
            {group.members.length} member{group.members.length === 1 ? '' : 's'}
          </Text>

          {paymentError ? <Text style={styles.error}>{paymentError}</Text> : null}

          {paymentStatus?.status !== 'success' ? (
            <>
              <Text style={styles.hint}>Shirt size</Text>
              <View style={styles.shirtRow}>
                {SHIRT_SIZES.map((size) => (
                  <Pressable
                    key={size}
                    style={[styles.shirtChip, shirtSize === size && styles.shirtChipSelected]}
                    onPress={() => setShirtSize(size)}
                  >
                    <Text style={[styles.shirtChipText, shirtSize === size && styles.shirtChipTextSelected]}>
                      {size}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.payButton} onPress={onPayNow} disabled={payingLoading}>
                {payingLoading ? (
                  <ActivityIndicator color={colors.textOnPrimary} />
                ) : (
                  <Text style={styles.payButtonText}>Pay now</Text>
                )}
              </Pressable>

              {paymentStatus?.status === 'pending' ? (
                <Pressable style={styles.verifyButton} onPress={onVerifyPayment} disabled={verifyingLoading}>
                  {verifyingLoading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={styles.verifyButtonText}>I've paid — verify</Text>
                  )}
                </Pressable>
              ) : null}
            </>
          ) : null}
        </Card>
      ) : null}

      <Text style={styles.sectionHeading}>Members ({group.members.length})</Text>
      <FlatList
        style={styles.memberList}
        data={group.members}
        keyExtractor={(m) => m.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        renderItem={({ item }) => {
          const name = userLabel(item.userId, names);
          const isLeader = item.userId === group.groupLeaderId;
          return (
            <View style={styles.memberRow}>
              <Avatar name={name} size={36} />
              <View style={styles.memberTextWrap}>
                <Text style={styles.memberText}>{name}</Text>
                {isLeader ? <Text style={styles.leaderLabel}>Group leader</Text> : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No members yet.</Text>}
      />
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, padding: spacing.xxl, backgroundColor: colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    photoWrap: { position: 'relative' },
    photo: { width: 64, height: 64, borderRadius: radius.md },
    photoPlaceholder: { backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    photoEditBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      width: 22,
      height: 22,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.bg,
    },
    headerTextWrap: { flex: 1 },
    title: { ...typography.heading, fontSize: 20 },
    subtitle: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
    meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    sectionHeading: { ...typography.subheading, marginTop: spacing.xl, marginBottom: spacing.sm },
    paymentCard: { marginTop: spacing.lg, gap: spacing.sm },
    paymentHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardTitle: { ...typography.body, fontWeight: '600' },
    cardMeta: { ...typography.caption, color: colors.textMuted },
    hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
    shirtRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    shirtChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    shirtChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    shirtChipText: { ...typography.caption, color: colors.text, fontWeight: '600' },
    shirtChipTextSelected: { color: colors.textOnPrimary },
    payButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    payButtonText: { color: colors.textOnPrimary, fontWeight: '600' },
    verifyButton: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: 'center',
    },
    verifyButtonText: { color: colors.primary, fontWeight: '600' },
    memberList: { flex: 1 },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    memberTextWrap: { flex: 1 },
    memberText: { ...typography.body, fontWeight: '600' },
    leaderLabel: { ...typography.caption, color: colors.primaryForeground, marginTop: 1 },
    emptyText: { color: colors.textMuted, textAlign: 'center' },
    error: { color: colors.danger, textAlign: 'center' },
  });
}
