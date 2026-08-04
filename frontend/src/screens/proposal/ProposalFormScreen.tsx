import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import TextInput from '../../components/TextInput';
import Text from '../../components/Text';
import Button from '../../components/Button';
import { ApiError } from '../../api/client';
import { ProposalContentRequest, ProposalPdfFile, resubmitProposal, submitProposal } from '../../api/proposals';
import { useAuth } from '../../auth/AuthContext';
import { ProposalStackParamList } from '../../navigation/types';
import { Colors, radius, spacing, useTheme } from '../../theme';
import { confirmAction } from '../../utils/confirm';

type Props = NativeStackScreenProps<ProposalStackParamList, 'ProposalForm'>;

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export default function ProposalFormScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { mode } = route.params;
  const existing = mode === 'resubmit' ? route.params.proposal : null;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [problemStatement, setProblemStatement] = useState(existing?.problemStatement ?? '');
  const [objectives, setObjectives] = useState(existing?.objectives ?? '');
  const [techStack, setTechStack] = useState(existing?.techStack ?? '');
  const [pdfFile, setPdfFile] = useState<ProposalPdfFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const leavingIntentionally = useRef(false);

  // Guard against accidentally losing a half-written proposal to a stray
  // back-swipe or hardware back press — a full autosave-to-disk would need a
  // new storage dependency we can't verify builds correctly in this pass, so
  // this is the safe interim mitigation.
  useEffect(() => {
    const hasContent = Boolean(
      title.trim() || problemStatement.trim() || objectives.trim() || techStack.trim() || pdfFile
    );
    return navigation.addListener('beforeRemove', (e) => {
      if (!hasContent || leavingIntentionally.current) return;
      e.preventDefault();
      confirmAction({
        title: 'Discard proposal draft?',
        message: 'You have unsaved changes. Leaving now will lose them.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        onConfirm: () => navigation.dispatch(e.data.action),
      });
    });
  }, [navigation, title, problemStatement, objectives, techStack, pdfFile]);

  const onPickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_PDF_BYTES) {
      setError('PDF must be smaller than 10MB.');
      return;
    }
    setError(null);
    setPdfFile({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/pdf' });
  };

  const onSubmit = async () => {
    if (!token) return;
    if (!pdfFile) {
      setError('A PDF attachment is required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const req: ProposalContentRequest = { title, problemStatement, objectives, techStack };
    try {
      if (mode === 'resubmit') {
        await resubmitProposal(existing!.id, req, pdfFile, token);
      } else {
        await submitProposal(req, pdfFile, token);
      }
      leavingIntentionally.current = true;
      navigation.navigate('ProposalStatus');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError(`${e.message} Pull to refresh the status screen to see it.`);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to submit proposal');
      }
    } finally {
      setSubmitting(false);
    }
  };

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

      <Text style={styles.label}>Problem statement</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={problemStatement}
        onChangeText={setProblemStatement}
        placeholder="What problem does this project solve?"
        placeholderTextColor={colors.textMuted}
        multiline
      />

      <Text style={styles.label}>Objectives</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={objectives}
        onChangeText={setObjectives}
        placeholder="Key objectives"
        placeholderTextColor={colors.textMuted}
        multiline
      />

      <Text style={styles.label}>Tech stack</Text>
      <TextInput
        style={styles.input}
        value={techStack}
        onChangeText={setTechStack}
        placeholder="e.g. React Native, Spring Boot, Postgres"
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.helperText}>Comma-separated list of languages, frameworks, and tools</Text>

      <Text style={styles.label}>PDF attachment</Text>
      <Pressable
        style={({ pressed }) => [styles.pdfPicker, pressed && styles.pdfPickerPressed]}
        onPress={onPickPdf}
        accessibilityRole="button"
        accessibilityLabel={pdfFile ? `Change PDF attachment, currently ${pdfFile.name}` : 'Select a PDF, required'}
      >
        <Feather name={pdfFile ? 'file-text' : 'upload'} size={16} color={colors.primary} />
        <Text style={styles.pdfPickerText} numberOfLines={1}>
          {pdfFile ? pdfFile.name : 'Select a PDF (required)'}
        </Text>
        {pdfFile ? <Text style={styles.pdfChangeLink}>Change</Text> : null}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={mode === 'resubmit' ? 'Resubmit' : 'Submit proposal'}
        onPress={onSubmit}
        loading={submitting}
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
    </ScrollView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: spacing.xs },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      fontSize: 16,
      backgroundColor: colors.surface,
    },
    multiline: { minHeight: 90, textAlignVertical: 'top' },
    helperText: { fontSize: 12, color: colors.textMuted, marginTop: -spacing.xs },
    pdfPicker: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      backgroundColor: colors.surface,
    },
    pdfPickerPressed: { opacity: 0.8 },
    pdfPickerText: { flex: 1, color: colors.text },
    pdfChangeLink: { color: colors.primary, fontWeight: '600', fontSize: 13 },
    button: { marginTop: spacing.sm },
    error: { color: colors.danger },
  });
}
