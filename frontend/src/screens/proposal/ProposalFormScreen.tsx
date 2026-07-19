import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../../components/TextInput';
import Text from '../../components/Text';
import { ApiError } from '../../api/client';
import { ProposalContentRequest, resubmitProposal, submitProposal } from '../../api/proposals';
import { useAuth } from '../../auth/AuthContext';
import { ProposalStackParamList } from '../../navigation/types';
import { Colors, radius, spacing, useTheme } from '../../theme';

type Props = NativeStackScreenProps<ProposalStackParamList, 'ProposalForm'>;

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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!token) return;
    setError(null);
    setSubmitting(true);
    const req: ProposalContentRequest = { title, problemStatement, objectives, techStack };
    try {
      if (mode === 'resubmit') {
        await resubmitProposal(existing!.id, req, token);
      } else {
        await submitProposal(req, token);
      }
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <Text style={styles.buttonText}>{mode === 'resubmit' ? 'Resubmit' : 'Submit proposal'}</Text>
        )}
      </Pressable>
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
      marginTop: spacing.sm,
    },
    buttonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 16 },
    error: { color: colors.danger },
  });
}
