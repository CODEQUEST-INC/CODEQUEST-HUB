import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../components/TextInput';
import Text from '../components/Text';
import Button from '../components/Button';
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen';
import { resendVerification, verifyEmail } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { Colors, radius, spacing, typography, useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

export default function VerifyEmailScreen({ navigation }: Props) {
  const { user, token, refreshUser } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const verified = !!user?.emailVerifiedAt;

  const onVerify = async () => {
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      await verifyEmail(code.trim(), token);
      await refreshUser();
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!token) return;
    setError(null);
    setResending(true);
    try {
      await resendVerification(token);
      setResent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <View style={[styles.container, styles.verifiedContainer]}>
        <View style={styles.verifiedIconWrap}>
          <Feather name="check-circle" size={28} color={colors.accents.green.fg} />
        </View>
        <Text style={styles.title}>Email verified</Text>
        <Text style={styles.subtitle}>{user?.email} is verified.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingScreen>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Text style={styles.subtitle}>
        We sent a verification code to {user?.email}. Enter it below to verify your account.
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>Verification code</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste the code from your email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Verification code"
          value={code}
          onChangeText={setCode}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {resent ? <Text style={styles.success}>A new code was sent.</Text> : null}

      <Button
        label="Verify email"
        onPress={onVerify}
        loading={submitting}
        disabled={!code.trim()}
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

      <Pressable
        onPress={onResend}
        disabled={resending}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Resend verification code"
      >
        <Text style={styles.link}>{resending ? 'Sending…' : 'Resend code'}</Text>
      </Pressable>
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
    verifiedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    verifiedIconWrap: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.accents.green.tint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    title: { ...typography.heading, fontSize: 22, color: colors.text, textAlign: 'center' },
    subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
    field: { gap: spacing.xs },
    label: { ...typography.label, color: colors.textMuted },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      minHeight: 44,
      fontSize: 16,
      backgroundColor: colors.surface,
    },
    error: { color: colors.danger },
    success: { color: colors.accents.green.fg },
    button: { marginTop: spacing.md },
    link: { color: colors.primary, textAlign: 'center', marginTop: spacing.md, fontWeight: '600' },
  });
}
