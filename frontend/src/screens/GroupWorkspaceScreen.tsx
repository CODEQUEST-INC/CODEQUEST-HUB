import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Text from '../components/Text';
import { deleteGroupPhoto, getMyGroup, GroupResponse, resolveGroupPhotoUrl, uploadGroupPhoto } from '../api/groups';
import {
  getFeeConfig,
  getGroupPaymentSummary,
  getMyPaymentStatus,
  GroupPaymentSummary,
  initializePayment,
  PaymentFeeConfig,
  PaymentRecord,
  verifyPayment,
} from '../api/payments';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useUserNames, userLabel } from '../hooks/useUserNames';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import PaidBadge from '../components/PaidBadge';
import { Colors, radius, spacing, typography, useTheme } from '../theme';

const SHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

function formatAmount(amountPesewas: number, currency: string): string {
  return `${currency} ${(amountPesewas / 100).toFixed(2)}`;
}

export default function GroupWorkspaceScreen() {
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);

  const [feeConfig, setFeeConfig] = useState<PaymentFeeConfig | null>(null);
  const [myPayment, setMyPayment] = useState<PaymentRecord | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<GroupPaymentSummary | null>(null);
  const [shirtSize, setShirtSize] = useState('M');
  const [payingLoading, setPayingLoading] = useState(false);
  const [verifyingLoading, setVerifyingLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [membersExpanded, setMembersExpanded] = useState(false);

  const refreshPaymentInfo = useCallback(
    async (g: GroupResponse) => {
      if (!token) return;
      const [fee, mine, summary] = await Promise.all([
        getFeeConfig(g.cohortId, token).catch(() => null),
        getMyPaymentStatus(g.id, token).catch(() => null),
        getGroupPaymentSummary(g.id, token).catch(() => null),
      ]);
      setFeeConfig(fee);
      setMyPayment(mine);
      setPaymentSummary(summary);
    },
    [token]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const g = await getMyGroup(token);
      setGroup(g);
      // Payment info is optional — a cohort with no fee configured, or no
      // payment attempts yet, is a normal state, not an error.
      await refreshPaymentInfo(g);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setGroup(null);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load group');
      }
    } finally {
      setLoading(false);
    }
  }, [token, refreshPaymentInfo]);

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

  const onRemovePhoto = async () => {
    if (!token || !group) return;
    setError(null);
    setRemovingPhoto(true);
    try {
      const updated = await deleteGroupPhoto(group.id, token);
      setGroup(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove photo');
    } finally {
      setRemovingPhoto(false);
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
      await refreshPaymentInfo(group);
      await Linking.openURL(result.authorizationUrl);
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : 'Failed to start payment');
    } finally {
      setPayingLoading(false);
    }
  };

  const onVerifyPayment = async () => {
    if (!token || !group || !myPayment) return;
    setPaymentError(null);
    setVerifyingLoading(true);
    try {
      const record = await verifyPayment(myPayment.paystackReference, token);
      setMyPayment(record);
      // A successful verify may have just made the group fully paid.
      const summary = await getGroupPaymentSummary(group.id, token).catch(() => null);
      setPaymentSummary(summary);
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
        <Pressable
          style={({ pressed }) => [styles.photoWrap, pressed && styles.photoWrapPressed]}
          onPress={onPickPhoto}
          disabled={uploadingPhoto || removingPhoto}
          accessibilityRole="button"
          accessibilityLabel={photo ? 'Change group photo' : 'Add group photo'}
        >
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
          {photo ? (
            <Pressable
              style={styles.photoRemoveBadge}
              onPress={onRemovePhoto}
              disabled={removingPhoto || uploadingPhoto}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Remove group photo"
            >
              {removingPhoto ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Feather name="x" size={12} color={colors.textOnPrimary} />
              )}
            </Pressable>
          ) : null}
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{group.name ?? `Group ${group.groupNumber}`}</Text>
          <Text style={styles.subtitle}>Group #{group.groupNumber}</Text>
        </View>
      </View>

      {group.groupLeaderId || group.supervisorId ? (
        <Card style={styles.infoCard}>
          {group.groupLeaderId ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Leader</Text>
              <Text style={styles.infoValue}>{userLabel(group.groupLeaderId, names)}</Text>
            </View>
          ) : null}
          {group.groupLeaderId && group.supervisorId ? <View style={styles.infoDivider} /> : null}
          {group.supervisorId ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Supervisor</Text>
              <Text style={styles.infoValue}>{userLabel(group.supervisorId, names)}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {feeConfig ? (
        <Card style={[styles.paymentCard, styles.bigRadius]} tint={colors.accents.pink}>
          <View style={styles.paymentHeaderRow}>
            <Text style={styles.cardTitle}>My registration fee</Text>
            <PaidBadge status={myPayment?.status ?? 'unpaid'} />
          </View>
          <Text style={styles.cardMeta}>{formatAmount(feeConfig.amountPesewas, feeConfig.currency)}</Text>

          {paymentError ? <Text style={styles.error}>{paymentError}</Text> : null}

          {myPayment?.status !== 'success' ? (
            <>
              <Text style={styles.hint}>Shirt size</Text>
              <View style={styles.shirtRow}>
                {SHIRT_SIZES.map((size) => (
                  <Pressable
                    key={size}
                    style={({ pressed }) => [
                      styles.shirtChip,
                      shirtSize === size && styles.shirtChipSelected,
                      pressed && styles.shirtChipPressed,
                    ]}
                    onPress={() => setShirtSize(size)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: shirtSize === size }}
                    accessibilityLabel={`Shirt size ${size}`}
                  >
                    <Text style={[styles.shirtChipText, shirtSize === size && styles.shirtChipTextSelected]}>
                      {size}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Button label="Pay now" onPress={onPayNow} loading={payingLoading} icon="credit-card" style={styles.payButton} />

              {myPayment?.status === 'pending' ? (
                <>
                  <Text style={styles.hint}>
                    Complete payment in the browser, then come back here and tap verify.
                  </Text>
                  <Button
                    label="I've paid — verify"
                    onPress={onVerifyPayment}
                    loading={verifyingLoading}
                    variant="secondary"
                  />
                </>
              ) : null}
            </>
          ) : null}
        </Card>
      ) : null}

      {feeConfig && paymentSummary ? (
        <Card
          style={[styles.paymentCard, styles.bigRadius]}
          tint={paymentSummary.allPaid ? colors.accents.green : colors.accents.amber}
        >
          <Pressable
            style={({ pressed }) => [styles.paymentHeaderRow, styles.expandRow, pressed && styles.expandRowPressed]}
            onPress={() => setMembersExpanded((prev) => !prev)}
            accessibilityRole="button"
            accessibilityState={{ expanded: membersExpanded }}
            accessibilityLabel={membersExpanded ? 'Collapse member payment list' : 'Expand member payment list'}
          >
            <Text style={styles.cardTitle}>Group payment status</Text>
            <View style={styles.memberPaymentRight}>
              <Text style={styles.cardMeta}>
                {paymentSummary.paidCount} of {paymentSummary.totalMembers} paid
              </Text>
              <Feather name={membersExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
            </View>
          </Pressable>
          {paymentSummary.allPaid ? (
            <View style={styles.allPaidBanner}>
              <Feather name="check-circle" size={16} color={colors.accents.green.fg} />
              <Text style={[styles.allPaidText, { color: colors.accents.green.fg }]}>
                Everyone in the group has paid!
              </Text>
            </View>
          ) : null}
          {membersExpanded
            ? paymentSummary.members.map((m) => (
                <View key={m.userId} style={styles.memberPaymentRow}>
                  <Text style={styles.memberPaymentName}>
                    {userLabel(m.userId, names)}
                    {m.userId === user?.id ? ' (you)' : ''}
                  </Text>
                  <View style={styles.memberPaymentRight}>
                    {m.shirtSize ? <Text style={styles.memberPaymentShirt}>{m.shirtSize}</Text> : null}
                    <PaidBadge status={m.status} />
                  </View>
                </View>
              ))
            : null}
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
              <Avatar name={name} size={40} />
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
    photoWrapPressed: { opacity: 0.85 },
    photo: { width: 64, height: 64, borderRadius: radius.xxl },
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
    photoRemoveBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 20,
      height: 20,
      borderRadius: radius.pill,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.bg,
    },
    headerTextWrap: { flex: 1 },
    title: { ...typography.heading, fontSize: 24 },
    subtitle: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
    meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    infoCard: { marginTop: spacing.lg, gap: 0 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
    infoLabel: { ...typography.body, color: colors.textMuted },
    infoValue: { ...typography.body, fontWeight: '700' },
    infoDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
    sectionHeading: { ...typography.subheading, marginTop: spacing.xl, marginBottom: spacing.sm },
    paymentCard: { marginTop: spacing.lg, gap: spacing.sm },
    bigRadius: { borderRadius: radius.xxl },
    paymentHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    expandRow: { minHeight: 44 },
    expandRowPressed: { opacity: 0.7 },
    cardTitle: { ...typography.body, fontWeight: '600' },
    cardMeta: { ...typography.caption, color: colors.textMuted },
    hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
    shirtRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    shirtChip: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    shirtChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    shirtChipPressed: { opacity: 0.8 },
    shirtChipText: { ...typography.caption, color: colors.text, fontWeight: '600' },
    shirtChipTextSelected: { color: colors.textOnPrimary },
    payButton: { marginTop: spacing.xs },
    allPaidBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    allPaidText: { ...typography.body, fontWeight: '600' },
    memberPaymentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    memberPaymentName: { ...typography.body, flex: 1 },
    memberPaymentRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    memberPaymentShirt: { ...typography.caption, color: colors.textMuted },
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
