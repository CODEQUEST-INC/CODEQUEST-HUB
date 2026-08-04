import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../components/TextInput';
import Text from '../components/Text';
import Button from '../components/Button';
import { changePassword } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { Colors, radius, spacing, typography, useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

function PasswordField({
  label,
  value,
  onChangeText,
  accessibilityLabel,
  textContentType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  accessibilityLabel: string;
  textContentType: 'password' | 'newPassword';
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!visible}
          textContentType={textContentType}
          accessibilityLabel={accessibilityLabel}
          value={value}
          onChangeText={onChangeText}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <Feather name={visible ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

export default function ChangePasswordScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!token) return;
    setError(null);
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword, token);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Text style={styles.subtitle}>Enter your current password, then choose a new one.</Text>

      <PasswordField
        label="Current password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        accessibilityLabel="Current password"
        textContentType="password"
      />
      <PasswordField
        label="New password"
        value={newPassword}
        onChangeText={setNewPassword}
        accessibilityLabel="New password"
        textContentType="newPassword"
      />
      <PasswordField
        label="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        accessibilityLabel="Confirm new password"
        textContentType="newPassword"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Change password"
        onPress={onSubmit}
        loading={submitting}
        disabled={!currentPassword || !newPassword || !confirmPassword}
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
    subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.sm },
    field: { gap: spacing.xs },
    label: { ...typography.label, color: colors.textMuted },
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      minHeight: 44,
      backgroundColor: colors.surface,
    },
    passwordInput: { flex: 1, fontSize: 16, padding: 0 },
    error: { color: colors.danger },
    button: { marginTop: spacing.md },
  });
}
