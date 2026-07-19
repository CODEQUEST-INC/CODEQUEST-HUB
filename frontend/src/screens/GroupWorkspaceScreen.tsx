import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Text from '../components/Text';
import { getMyGroup, GroupResponse, resolveGroupPhotoUrl, uploadGroupPhoto } from '../api/groups';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useUserNames, userLabel } from '../hooks/useUserNames';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import { Colors, radius, spacing, typography, useTheme } from '../theme';

export default function GroupWorkspaceScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const g = await getMyGroup(token);
      setGroup(g);
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
