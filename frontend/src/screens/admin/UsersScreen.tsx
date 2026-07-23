import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../../components/TextInput';
import Text from '../../components/Text';
import { deleteUser, searchUsers, UserSearchResult } from '../../api/users';
import { useAuth } from '../../auth/AuthContext';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';

export default function UsersScreen() {
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Same type-ahead convention as UserPicker: nothing under 2 characters,
  // debounced so every keystroke doesn't fire a request.
  useEffect(() => {
    if (!token || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(() => {
      searchUsers(query.trim(), token)
        .then((r) => {
          if (!cancelled) setResults(r);
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to search users');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, token]);

  const onDelete = async (id: string) => {
    if (!token) return;
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      setTimeout(() => setConfirmingDeleteId((current) => (current === id ? null : current)), 4000);
      return;
    }
    setConfirmingDeleteId(null);
    setError(null);
    setDeletingId(id);
    try {
      await deleteUser(id, token);
      setResults((current) => current.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete account');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or email"
        placeholderTextColor={colors.textMuted}
      />

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {results.map((r) => (
        <Card key={r.id} style={styles.row}>
          <Avatar name={r.fullName} size={32} />
          <View style={styles.rowText}>
            <Text style={styles.name}>{r.fullName}</Text>
            <Text style={styles.role}>{r.role}</Text>
          </View>
          <Pressable
            style={styles.smallDangerButton}
            onPress={() => onDelete(r.id)}
            disabled={deletingId === r.id || r.id === user?.id}
          >
            {deletingId === r.id ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Text style={styles.smallDangerButtonText}>
                {confirmingDeleteId === r.id ? 'Tap again to confirm' : 'Delete'}
              </Text>
            )}
          </Pressable>
        </Card>
      ))}

      {query.trim().length >= 2 && results.length === 0 && !loading ? (
        <Text style={styles.emptyText}>No matching users.</Text>
      ) : null}
      {query.trim().length < 2 ? (
        <Text style={styles.hint}>Type at least 2 characters to search.</Text>
      ) : null}
    </ScrollView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      padding: spacing.md,
      fontSize: 15,
      backgroundColor: colors.surface,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rowText: { flex: 1 },
    name: { ...typography.body, fontWeight: '600' },
    role: { ...typography.caption, color: colors.textMuted },
    smallDangerButton: {
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    smallDangerButtonText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
    hint: { ...typography.caption, color: colors.textMuted },
    emptyText: { color: colors.textMuted, textAlign: 'center' },
    error: { color: colors.danger },
  });
}
