import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../api/client';
import { getMyGroup } from '../../api/groups';
import { getMyProposal, ProposalResponse } from '../../api/proposals';
import {
  deleteShowcaseEntry,
  getShowcaseEntry,
  resolvePhotoUrl,
  ShowcaseEntryResponse,
  upsertShowcaseEntry,
  uploadShowcasePhoto,
} from '../../api/showcase';
import { useAuth } from '../../auth/AuthContext';
import EmptyState from '../../components/EmptyState';
import { ShowcaseStackParamList } from '../../navigation/types';
import { colors, radius, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ShowcaseStackParamList, 'ShowcaseEdit'>;

export default function ShowcaseEditScreen({ navigation }: Props) {
  const { token } = useAuth();
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
  const [confirmingTakeDown, setConfirmingTakeDown] = useState(false);
  const [takingDown, setTakingDown] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const group = await getMyGroup(token);
        setGroupId(group.id);
        const myProposal = await getMyProposal(token).catch(() => null);
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
      const saved = await uploadShowcasePhoto(groupId, { uri: asset.uri, name: fileName, type: mimeType }, token);
      setEntry(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
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

  const photo = resolvePhotoUrl(entry?.photoUrl ?? null);

  return (
    <ScrollView contentContainerStyle={styles.container}>
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

      <Text style={[styles.label, styles.photoLabel]}>Photo</Text>
      {entry ? (
        <>
          {photo ? <Image source={{ uri: photo }} style={styles.preview} resizeMode="cover" /> : null}
          <Pressable style={styles.secondaryButton} onPress={onPickPhoto} disabled={uploadingPhoto}>
            {uploadingPhoto ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Feather name="upload" size={15} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>{photo ? 'Replace photo' : 'Upload photo'}</Text>
              </>
            )}
          </Pressable>
        </>
      ) : (
        <Text style={styles.hint}>Save the details above first, then you can upload a photo.</Text>
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

const styles = StyleSheet.create({
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
  preview: { width: '100%', aspectRatio: 16 / 10, borderRadius: radius.lg, marginTop: spacing.sm },
  hint: { ...typography.caption },
  error: { color: colors.danger },
  link: { color: colors.primary, textAlign: 'center', marginTop: spacing.xl, fontWeight: '600' },
});
