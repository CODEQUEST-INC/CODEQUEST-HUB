import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';

const logo = require('../../assets/logo-mark.png');

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <View style={styles.container}>
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>CodeQuestHub</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color={colors.textOnPrimary} /> : <Text style={styles.buttonText}>Log in</Text>}
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Need an account? Register</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
  logo: { width: 88, height: 88, alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.heading, fontSize: 28, textAlign: 'center', marginBottom: spacing.xxl, color: colors.primaryForeground },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 16 },
  error: { color: colors.danger },
  link: { color: colors.primary, textAlign: 'center', marginTop: spacing.lg, fontWeight: '600' },
});
