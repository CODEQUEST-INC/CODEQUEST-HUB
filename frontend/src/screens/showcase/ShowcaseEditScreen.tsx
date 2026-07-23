import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../../components/TextInput';
import Text from '../../components/Text';
import { ApiError } from '../../api/client';
import { getMyGroup } from '../../api/groups';
import { getMyProposal, ProposalResponse } from '../../api/proposals';
import {
  addShowcasePhoto,
  deleteShowcaseEntry,
  deleteShowcasePhoto,
  getShowcaseEntry,
  resolvePhotoUrl,
  ShowcaseEntryResponse,
  upsertShowcaseEntry,
} from '../../api/showcase';
import { useAuth } from '../../auth/AuthContext';
import EmptyState from '../../components/EmptyState';
import { ShowcaseStackParamList } from '../../navigation/types';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';

type Props = NativeStackScreenProps<ShowcaseStackParamList, 'ShowcaseEdit'>;

export default function ShowcaseEditScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [loading, setLoading] = useState(true);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ProposalResponse | null>(null);
  const [entry, setEntry] = useState<ShowcaseEntryResponse | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savingText, setSavingText] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [confirmingTakeDown, setConfirmingTakeDown] = useState(false);
  const [takingDown, setTakingDown] = useState(false);

  const MAX_PHOTOS = 5;

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        // Group and proposal are independent — fetch both at once.
        const [group, myProposal] = await Promise.all([
          getMyGroup(token),
          getMyProposal(token).catch(() => null),
        ]);
        setGroupId(group.id);
        setProposal(myProposal);
        if (myProposal?.status === 'approved') {
          const existing = await getShowcaseEntry(group.id).catch(() => null);
          if (existing) {
            setEntry(existing);
            setTitle(existing.title);
            setDescription(existing.description);
            setGithubUrl(existing.githubUrl);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load your group');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const onSaveText = async () => {
    if (!token || !groupId) return;
    setError(null);
    setSavingText(true);
    try {
      const saved = await upsertShowcaseEntry(groupId, { title, description, githubUrl }, token);
      setEntry(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSavingText(false);
    }
  };

  const onPickPhoto = async () => {
    if (!token || !groupId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to upload a showcase image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const extension = asset.uri.split('.').pop()?.toLowerCase();
    const mimeType = asset.mimeType ?? (extension === 'png' ? 'image/png' : 'image/jpeg');
    const fileName = `showcase.${extension === 'png' ? 'png' : 'jpg'}`;

    setError(null);
    setUploadingPhoto(true);
    try {
      const saved = await addShowcasePhoto(groupId, { uri: asset.uri, name: fileName, type: mimeType }, token);
      setEntry(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onDeletePhoto = async (photoId: string) => {
    if (!token || !groupId) return;
    setError(null);
    setDeletingPhotoId(photoId);
    try {
      const saved = await deleteShowcasePhoto(groupId, photoId, token);
      setEntry(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete photo');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const onTakeDown = async () => {
    if (!token || !groupId || !entry) return;
    if (!confirmingTakeDown) {
      setConfirmingTakeDown(true);
      setTimeout(() => setConfirmingTakeDown(false), 4000);
      return;
    }
    setConfirmingTakeDown(false);
    setError(null);
    setTakingDown(true);
    try {
      await deleteShowcaseEntry(groupId, token);
      setEntry(null);
      setTitle('');
      setDescription('');
      setGithubUrl('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to take down showcase entry');
    } finally {
      setTakingDown(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!proposal || proposal.status !== 'approved') {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="lock"
          heading="Not available yet"
          subtext={
            proposal
              ? `Your proposal is currently "${proposal.status.replace('_', ' ')}". It must be approved before you can publish a showcase entry.`
              : "Your group hasn't submitted a proposal yet, so there's nothing to showcase."
          }
        />
      </View>
    );
  }

  const photos = entry?.photos ?? [];
  const atCap = photos.length >= MAX_PHOTOS;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Project title"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="What did you build?"
        placeholderTextColor={colors.textMuted}
        multiline
      />

      <Text style={styles.label}>GitHub URL</Text>
      <TextInput
        style={styles.input}
        value={githubUrl}
        onChangeText={setGithubUrl}
        placeholder="https://github.com/..."
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSaveText} disabled={savingText}>
        {savingText ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <Text style={styles.buttonText}>{entry ? 'Save changes' : 'Publish'}</Text>
        )}
      </Pressable>

      <Text style={[styles.label, styles.photoLabel]}>Photos ({photos.length}/{MAX_PHOTOS})</Text>
      {entry ? (
        <>
          {photos.length > 0 ? (
            <View style={styles.photoGrid}>
              {photos.map((p) => {
                const uri = resolvePhotoUrl(p.url);
                return (
                  <View key={p.id} style={styles.photoTile}>
                    {uri ? <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" /> : null}
                    <Pressable
                      style={styles.photoDeleteBadge}
                      onPress={() => onDeletePhoto(p.id)}
                      disabled={deletingPhotoId === p.id}
                    >
                      {deletingPhotoId === p.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Feather name="x" size={14} color="#fff" />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}
          {atCap ? (
            <Text style={styles.hint}>Maximum {MAX_PHOTOS} photos reached — remove one to add another.</Text>
          ) : (
            <Pressable style={styles.secondaryButton} onPress={onPickPhoto} disabled={uploadingPhoto}>
              {uploadingPhoto ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Feather name="upload" size={15} color={colors.primary} />
                  <Text style={styles.secondaryButtonText}>Add photo</Text>
                </>
              )}
            </Pressable>
          )}
        </>
      ) : (
        <Text style={styles.hint}>Save the details above first, then you can upload photos.</Text>
      )}

      {entry ? (
        <Pressable style={styles.dangerButton} onPress={onTakeDown} disabled={takingDown}>
          {takingDown ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <>
              <Feather name="trash-2" size={15} color={colors.danger} />
              <Text style={styles.dangerButtonText}>
                {confirmingTakeDown ? 'Tap again to confirm take down' : 'Take down from showcase'}
              </Text>
            </>
          )}
        </Pressable>
      ) : null}

      <Pressable onPress={() => navigation.navigate('ShowcaseGallery')}>
        <Text style={styles.link}>Back to gallery</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.sm, backgroundColor: colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
    label: { ...typography.body, fontWeight: '600', marginTop: spacing.sm },
    photoLabel: { marginTop: spacing.xl },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      fontSize: 16,
      backgroundColor: colors.surface,
    },
    multiline: { minHeight: 90, textAlignVertical: 'top' },
    button: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      padding: spacing.lg,
      alignItems: 'center',
      marginTop: spacing.md,
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
      marginTop: spacing.sm,
    },
    secondaryButtonText: { color: colors.primary, fontWeight: '600' },
    dangerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginTop: spacing.xl,
    },
    dangerButtonText: { color: colors.danger, fontWeight: '600' },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    photoTile: { width: '31%', aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
    photoImage: { width: '100%', height: '100%' },
    photoDeleteBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    hint: { ...typography.caption, color: colors.textMuted },
    error: { color: colors.danger },
    link: { color: colors.primary, textAlign: 'center', marginTop: spacing.xl, fontWeight: '600' },
  });
}
