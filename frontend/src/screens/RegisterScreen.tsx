import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../components/TextInput';
import Text from '../components/Text';
import { UserRole } from '../api/auth';
import { Cohort, listCohorts } from '../api/cohorts';
import { useAuth } from '../auth/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { Colors, radius, spacing, typography, useTheme } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const ROLES: UserRole[] = ['student', 'supervisor', 'admin', 'mentor'];

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [indexNumber, setIndexNumber] = useState('');
  const [studentId, setStudentId] = useState('');
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listCohorts()
      .then((list) => {
        setCohorts(list);
        if (list.length > 0) setCohortId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const onSubmit = async () => {
    if (role === 'student' && !indexNumber.trim()) {
      setError('Index number is required for students.');
      return;
    }
    if (role === 'student' && !studentId.trim()) {
      setError('Student ID is required for students.');
      return;
    }
    if (role === 'student' && !cohortId) {
      setError('Select a cohort.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        indexNumber: role === 'student' ? indexNumber.trim() : undefined,
        studentId: role === 'student' ? studentId.trim() : undefined,
        cohortId: role === 'student' ? cohortId ?? undefined : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create account</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        placeholderTextColor={colors.textMuted}
        value={fullName}
        onChangeText={setFullName}
      />
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
        placeholder="Password (min 8 characters)"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Text style={styles.label}>Role</Text>
      <View style={styles.roleRow}>
        {ROLES.map((r) => (
          <Pressable
            key={r}
            style={[styles.roleChip, role === r && styles.roleChipSelected]}
            onPress={() => setRole(r)}
          >
            <Text style={[styles.roleChipText, role === r && styles.roleChipTextSelected]}>{r}</Text>
          </Pressable>
        ))}
      </View>

      {role === 'student' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Index number"
            placeholderTextColor={colors.textMuted}
            value={indexNumber}
            onChangeText={setIndexNumber}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Student ID"
            placeholderTextColor={colors.textMuted}
            value={studentId}
            onChangeText={setStudentId}
          />

          <Text style={styles.label}>Cohort</Text>
          {cohorts.length === 0 ? (
            <Text style={styles.hint}>No cohorts available yet — contact an admin.</Text>
          ) : (
            <View style={styles.roleRow}>
              {cohorts.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.roleChip, cohortId === c.id && styles.roleChipSelected]}
                  onPress={() => setCohortId(c.id)}
                >
                  <Text style={[styles.roleChipText, cohortId === c.id && styles.roleChipTextSelected]}>
                    {c.name} ({c.year})
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.xxl,
      gap: spacing.md,
      backgroundColor: colors.bg,
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
    },
    title: {
      ...typography.heading,
      fontSize: 28,
      textAlign: 'center',
      marginBottom: spacing.xxl,
      color: colors.primaryForeground,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      fontSize: 16,
      backgroundColor: colors.surface,
    },
    label: { ...typography.body, fontWeight: '600', color: colors.text, marginTop: spacing.xs },
    hint: { ...typography.caption, color: colors.textMuted },
    roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    roleChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    roleChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    roleChipText: { color: colors.text, textTransform: 'capitalize' },
    roleChipTextSelected: { color: colors.textOnPrimary },
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
}
