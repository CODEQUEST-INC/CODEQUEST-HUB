import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../components/TextInput';
import Text from '../components/Text';
import Button from '../components/Button';
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen';
import { UserRole } from '../api/auth';
import { Cohort, listCohorts } from '../api/cohorts';
import { useAuth } from '../auth/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { Colors, radius, spacing, typography, useTheme } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const ROLES: UserRole[] = ['student', 'supervisor', 'admin'];

// Purely a client-side UX signal (length + variety), not a security policy —
// the backend is the source of truth on what passwords it'll accept.
function passwordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password) || password.length >= 12) score++;
  return score;
}

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
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);

  useEffect(() => {
    listCohorts(null, true)
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
    <KeyboardAvoidingScreen>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create account</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput
        style={[styles.input, focusedField === 'name' && styles.inputFocused]}
        placeholder="Full name"
        placeholderTextColor={colors.textMuted}
        textContentType="name"
        autoComplete="name"
        accessibilityLabel="Full name"
        value={fullName}
        onChangeText={setFullName}
        onFocus={() => setFocusedField('name')}
        onBlur={() => setFocusedField(null)}
      />
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, focusedField === 'email' && styles.inputFocused]}
        placeholder="you@knust.edu.gh"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        accessibilityLabel="Email"
        value={email}
        onChangeText={setEmail}
        onFocus={() => setFocusedField('email')}
        onBlur={() => setFocusedField(null)}
      />
      <Text style={styles.label}>Password</Text>
      <TextInput
        style={[styles.input, focusedField === 'password' && styles.inputFocused]}
        placeholder="Min 8 characters"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="password-new"
        accessibilityLabel="Password"
        value={password}
        onChangeText={setPassword}
        onFocus={() => setFocusedField('password')}
        onBlur={() => setFocusedField(null)}
      />
      {password.length > 0 ? (
        <View style={styles.strengthRow} accessibilityLabel={`Password strength: ${strength} of 3`}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.strengthBar,
                i < strength && (strength === 1 ? styles.strengthWeak : strength === 2 ? styles.strengthOk : styles.strengthGood),
              ]}
            />
          ))}
        </View>
      ) : null}

      <Text style={styles.label}>Role</Text>
      <View style={styles.roleRow}>
        {ROLES.map((r) => (
          <Pressable
            key={r}
            style={({ pressed }) => [styles.roleChip, role === r && styles.roleChipSelected, pressed && styles.roleChipPressed]}
            onPress={() => setRole(r)}
            accessibilityRole="button"
            accessibilityState={{ selected: role === r }}
          >
            <Text style={[styles.roleChipText, role === r && styles.roleChipTextSelected]}>{r}</Text>
          </Pressable>
        ))}
      </View>

      {role === 'student' ? (
        <>
          <Text style={styles.label}>Index number</Text>
          <TextInput
            style={styles.input}
            placeholder="Index number"
            placeholderTextColor={colors.textMuted}
            value={indexNumber}
            onChangeText={setIndexNumber}
            keyboardType="numeric"
            accessibilityLabel="Index number"
          />
          <Text style={styles.label}>Student ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Student ID"
            placeholderTextColor={colors.textMuted}
            value={studentId}
            onChangeText={setStudentId}
            accessibilityLabel="Student ID"
          />

          <Text style={styles.label}>Cohort</Text>
          {cohorts.length === 0 ? (
            <Text style={styles.hint}>No cohorts available yet — contact an admin.</Text>
          ) : (
            <View style={styles.roleRow}>
              {cohorts.map((c) => (
                <Pressable
                  key={c.id}
                  style={({ pressed }) => [
                    styles.roleChip,
                    cohortId === c.id && styles.roleChipSelected,
                    pressed && styles.roleChipPressed,
                  ]}
                  onPress={() => setCohortId(c.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: cohortId === c.id }}
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

      <Pressable
        style={styles.consentRow}
        onPress={() => setAcceptedRules((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptedRules }}
        accessibilityLabel="I accept the programme rules and academic integrity policy"
      >
        <View style={[styles.checkbox, acceptedRules && styles.checkboxChecked]}>
          {acceptedRules ? <Feather name="check" size={14} color={colors.textOnPrimary} /> : null}
        </View>
        <Text style={styles.consentText}>I accept the programme rules and academic integrity policy.</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Create account"
        onPress={onSubmit}
        loading={submitting}
        disabled={!acceptedRules}
        style={styles.button}
      />

      <Pressable
        onPress={() => navigation.navigate('Login')}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Already have an account? Log in"
      >
        <Text style={styles.link}>Already have an account? Log in</Text>
      </Pressable>
      </ScrollView>
    </KeyboardAvoidingScreen>
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
      fontSize: 30,
      textAlign: 'center',
      marginBottom: spacing.xl,
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      minHeight: 44,
      fontSize: 16,
      backgroundColor: colors.surface,
    },
    inputFocused: { borderColor: colors.primary, borderWidth: 2 },
    strengthRow: { flexDirection: 'row', gap: spacing.xs, marginTop: -spacing.xs },
    strengthBar: { flex: 1, height: 5, borderRadius: radius.pill, backgroundColor: colors.border },
    strengthWeak: { backgroundColor: colors.danger },
    strengthOk: { backgroundColor: colors.accents.amber.accent },
    strengthGood: { backgroundColor: colors.accents.green.accent },
    consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.sm, minHeight: 44 },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    consentText: { ...typography.caption, color: colors.textMuted, flex: 1 },
    label: { ...typography.body, fontWeight: '600', color: colors.text, marginTop: spacing.xs },
    hint: { ...typography.caption, color: colors.textMuted },
    roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    roleChip: {
      minHeight: 44,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    roleChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    roleChipPressed: { opacity: 0.8 },
    roleChipText: { color: colors.text, textTransform: 'capitalize' },
    roleChipTextSelected: { color: colors.textOnPrimary },
    button: {
      marginTop: spacing.sm,
      borderRadius: radius.xxxl,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.32,
      shadowRadius: 16,
      elevation: 8,
    },
    error: { color: colors.danger },
    link: { color: colors.primary, textAlign: 'center', marginTop: spacing.lg, fontWeight: '600' },
  });
}
