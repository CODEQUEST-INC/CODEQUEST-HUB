import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
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
  setCoverPhoto,
  ShowcaseEntryResponse,
  upsertShowcaseEntry,
} from '../../api/showcase';
import { useAuth } from '../../auth/AuthContext';
import Button from '../../components/Button';
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
  const [uploadingCover, setUploadingCover] = useState(false);
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

  // Photos attach to an existing entry on the backend, but there's no reason
  // the user has to click a separate "Save" first — if the entry doesn't
  // exist yet, silently create it from whatever's currently in the form
  // before the upload, instead of blocking the upload entirely.
  const ensureEntry = async (): Promise<ShowcaseEntryResponse | null> => {
    if (entry) return entry;
    if (!token || !groupId) return null;
    if (!title.trim() || !description.trim() || !githubUrl.trim()) {
      setError('Add a title, description, and GitHub repository link before uploading photos.');
      return null;
    }
    const saved = await upsertShowcaseEntry(groupId, { title, description, githubUrl }, token);
    setEntry(saved);
    return saved;
  };

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to upload a showcase image.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || result.assets.length === 0) return null;
    const asset = result.assets[0];
    const extension = asset.uri.split('.').pop()?.toLowerCase();
    const mimeType = asset.mimeType ?? (extension === 'png' ? 'image/png' : 'image/jpeg');
    const fileName = `showcase.${extension === 'png' ? 'png' : 'jpg'}`;
    return { uri: asset.uri, name: fileName, type: mimeType };
  }

  // Uploads a new photo, then swaps it into the cover (position 0) slot —
  // works whether there's already a cover (swaps, non-destructively demoting
  // the old one) or this is the very first photo (already lands at 0).
  const onReplaceCover = async () => {
    if (!token || !groupId) return;
    if (photos.length >= MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos reached — remove one below before replacing the cover.`);
      return;
    }
    const file = await pickImage();
    if (!file) return;

    setError(null);
    setUploadingCover(true);
    try {
      const currentEntry = await ensureEntry();
      if (!currentEntry) return;
      const afterAdd = await addShowcasePhoto(groupId, file, token);
      const newPhoto = afterAdd.photos[afterAdd.photos.length - 1];
      const afterCover = await setCoverPhoto(groupId, newPhoto.id, token);
      setEntry(afterCover);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update cover photo');
    } finally {
      setUploadingCover(false);
    }
  };

  const onPickPhoto = async () => {
    if (!token || !groupId) return;
    const file = await pickImage();
    if (!file) return;

    setError(null);
    setUploadingPhoto(true);
    try {
      const currentEntry = await ensureEntry();
      if (!currentEntry) return;
      const saved = await addShowcasePhoto(groupId, file, token);
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

  const onPreview = () => {
    if (!entry) return;
    navigation.navigate('ShowcaseDetail', { entry: { ...entry, title, description, githubUrl } });
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
  const additionalPhotos = photos.slice(1);
  const atCap = photos.length >= MAX_PHOTOS;
  const coverUrl = photos.length > 0 ? resolvePhotoUrl(photos[0].url) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.coverWrap}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[colors.accents.pink.accent, colors.accents.pink.fg]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverImage}
            />
          )}
          <Pressable
            style={({ pressed }) => [styles.replaceCoverButton, pressed && styles.replaceCoverButtonPressed]}
            onPress={onReplaceCover}
            disabled={uploadingCover}
            accessibilityRole="button"
            accessibilityLabel={coverUrl ? 'Replace cover photo' : 'Add cover photo'}
          >
            {uploadingCover ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Feather name="plus" size={16} color="#1D1B2E" />
                <Text style={styles.replaceCoverButtonText}>{coverUrl ? 'Replace cover' : 'Add cover'}</Text>
              </>
            )}
          </Pressable>
        </View>
        <Text style={styles.coverHint}>16:9 · minimum 1600px wide</Text>

        <Text style={styles.fieldLabel}>Public title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Project title"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="What did you build?"
          placeholderTextColor={colors.textMuted}
          multiline
        />

        <Text style={styles.fieldLabel}>Repository</Text>
        <TextInput
          style={styles.input}
          value={githubUrl}
          onChangeText={setGithubUrl}
          placeholder="https://github.com/..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={[styles.fieldLabel, styles.photoLabel]}>
          Additional photos ({photos.length}/{MAX_PHOTOS})
        </Text>
        {additionalPhotos.length > 0 ? (
          <View style={styles.photoGrid}>
            {additionalPhotos.map((p) => {
              const uri = resolvePhotoUrl(p.url);
              return (
                <View key={p.id} style={styles.photoTile}>
                  {uri ? <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" /> : null}
                  <Pressable
                    style={styles.photoDeleteBadge}
                    onPress={() => onDeletePhoto(p.id)}
                    disabled={deletingPhotoId === p.id}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo"
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
          <Button
            label="Add photo"
            icon="upload"
            variant="secondary"
            style={styles.secondaryButton}
            onPress={onPickPhoto}
            loading={uploadingPhoto}
          />
        )}

        {entry ? (
          <Button
            label={confirmingTakeDown ? 'Tap again to confirm take down' : 'Take down from showcase'}
            icon="trash-2"
            variant="dangerOutline"
            style={styles.dangerButton}
            onPress={onTakeDown}
            loading={takingDown}
          />
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Preview"
          variant="secondary"
          disabled={!entry}
          onPress={onPreview}
          style={styles.footerButtonSecondary}
        />
        <Button
          label={entry ? 'Save changes' : 'Publish'}
          onPress={onSaveText}
          loading={savingText}
          style={[
            styles.footerButtonPrimary,
            {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 14,
              elevation: 6,
            },
          ]}
        />
      </View>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.sm, backgroundColor: colors.bg, paddingBottom: spacing.xxxl },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
    coverWrap: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: radius.xxl,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverImage: { ...StyleSheet.absoluteFillObject },
    replaceCoverButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255,255,255,0.85)',
    },
    replaceCoverButtonPressed: { opacity: 0.85 },
    replaceCoverButtonText: { fontWeight: '700', fontSize: 14, color: '#1D1B2E' },
    coverHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginTop: spacing.md,
    },
    photoLabel: { marginTop: spacing.xl, textTransform: 'none', fontSize: 14, fontWeight: '600', letterSpacing: 0 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      fontSize: 16,
      backgroundColor: colors.surface,
      marginTop: spacing.xs,
    },
    multiline: { minHeight: 90, textAlignVertical: 'top' },
    secondaryButton: { marginTop: spacing.sm },
    dangerButton: { marginTop: spacing.xl },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    photoTile: { width: '31%', aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden', position: 'relative' },
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
    footer: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    footerButtonSecondary: { flex: 1, borderRadius: radius.xxxl },
    footerButtonPrimary: { flex: 1.4, borderRadius: radius.xxxl },
  });
}
