import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import TextInput from '../components/TextInput';
import Text from '../components/Text';
import Button from '../components/Button';
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen';
import { forgotPassword, resetPassword } from '../api/auth';
import { AuthStackParamList } from '../navigation/types';
import { Colors, radius, spacing, typography, useTheme } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const glow = (colors: Colors) => ({
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.32,
  shadowRadius: 16,
  elevation: 8,
});

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);

  const onRequestCode = async () => {
    setRequestError(null);
    setRequestSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setStep('reset');
    } catch (e) {
      setRequestError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const onResetPassword = async () => {
    setResetError(null);
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }
    setResetSubmitting(true);
    try {
      await resetPassword(code.trim(), newPassword);
      setResetDone(true);
    } catch (e) {
      setResetError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingScreen style={styles.screen}>
      <View style={styles.container}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to log in"
        >
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>

        {resetDone ? (
          <>
            <View style={styles.successIconWrap}>
              <Feather name="check-circle" size={28} color={colors.accents.green.fg} />
            </View>
            <Text style={styles.title}>Password reset</Text>
            <Text style={styles.subtitle}>Your password has been changed. Log in with your new password.</Text>
            <Button
              label="Back to log in"
              onPress={() => navigation.navigate('Login')}
              style={[styles.button, glow(colors)]}
            />
          </>
        ) : step === 'request' ? (
          <>
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.subtitle}>
              Enter your account email and we'll send a code to reset your password.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@knust.edu.gh"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                accessibilityLabel="Email"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {requestError ? <Text style={styles.error}>{requestError}</Text> : null}

            <Button
              label="Send reset code"
              onPress={onRequestCode}
              loading={requestSubmitting}
              disabled={!email.trim()}
              style={[styles.button, glow(colors)]}
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>Enter your reset code</Text>
            <Text style={styles.subtitle}>
              If an account exists for {email.trim()}, a reset code was sent. Enter it below along with your new
              password.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Reset code</Text>
              <TextInput
                style={styles.input}
                placeholder="Paste the code from your email"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Reset code"
                value={code}
                onChangeText={setCode}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>New password</Text>
              <View style={[styles.input, styles.passwordRow]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  accessibilityLabel="New password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            </View>

            {resetError ? <Text style={styles.error}>{resetError}</Text> : null}

            <Button
              label="Reset password"
              onPress={onResetPassword}
              loading={resetSubmitting}
              disabled={!code.trim() || !newPassword}
              style={[styles.button, glow(colors)]}
            />

            <Pressable
              onPress={() => setStep('request')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Use a different email"
            >
              <Text style={styles.link}>Use a different email</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingScreen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center' },
    container: {
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
      padding: spacing.xxl,
      gap: spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    successIconWrap: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.accents.green.tint,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: spacing.sm,
    },
    title: { ...typography.heading, fontSize: 26, color: colors.text },
    subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
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
    passwordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    passwordInput: { flex: 1, fontSize: 16, padding: 0 },
    button: { marginTop: spacing.sm, borderRadius: radius.xxxl },
    error: { color: colors.danger },
    link: { color: colors.primary, textAlign: 'center', marginTop: spacing.md, fontWeight: '600' },
  });
}
