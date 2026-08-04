import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import TextInput from '../components/TextInput';
import Text from '../components/Text';
import Button from '../components/Button';
import { useAuth } from '../auth/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { Colors, radius, spacing, typography, useTheme } from '../theme';

const logo = require('../../assets/logo-mark.png');

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <Image source={logo} style={styles.logo} resizeMode="contain" accessible={false} />
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your CodeQuest Hub account</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, emailFocused && styles.inputFocused]}
            placeholder="you@knust.edu.gh"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            accessibilityLabel="Email"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={[styles.input, styles.passwordRow, passwordFocused && styles.inputFocused]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              textContentType="password"
              autoComplete="password"
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Log in"
          onPress={onSubmit}
          loading={submitting}
          style={[
            styles.button,
            {
              borderRadius: radius.xxxl,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.32,
              shadowRadius: 16,
              elevation: 8,
            },
          ]}
        />

        <Pressable
          onPress={() => navigation.navigate('Register')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Need an account? Register"
        >
          <Text style={styles.link}>Need an account? Register</Text>
        </Pressable>
      </View>
    </View>
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
    logo: {
      width: 72,
      height: 72,
      alignSelf: 'center',
      marginBottom: spacing.lg,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 14,
      elevation: 6,
    },
    title: {
      ...typography.heading,
      fontSize: 30,
      textAlign: 'center',
      color: colors.text,
    },
    subtitle: {
      ...typography.body,
      textAlign: 'center',
      color: colors.textMuted,
      marginBottom: spacing.xl,
    },
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
    inputFocused: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    passwordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    passwordInput: { flex: 1, fontSize: 16, padding: 0 },
    button: { marginTop: spacing.sm },
    error: { color: colors.danger },
    link: { color: colors.primary, textAlign: 'center', marginTop: spacing.lg, fontWeight: '600' },
  });
}
