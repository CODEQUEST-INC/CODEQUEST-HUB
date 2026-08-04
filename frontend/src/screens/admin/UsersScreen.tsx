import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import TextInput from '../../components/TextInput';
import Text from '../../components/Text';
import Button from '../../components/Button';
import { deleteUser, getUsersStats, searchUsers, UserSearchResult, UsersStats } from '../../api/users';
import { useAuth } from '../../auth/AuthContext';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import StatTile from '../../components/StatTile';
import KeyboardAvoidingScreen from '../../components/KeyboardAvoidingScreen';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';
import { confirmAction } from '../../utils/confirm';

export default function UsersScreen() {
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [stats, setStats] = useState<UsersStats | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getUsersStats(token)
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

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

  const onDelete = (target: UserSearchResult) => {
    // Deleting another person's account is the single highest-stakes
    // destructive action in the app — irreversible and affects someone
    // else's access, not just the admin's own data. It gets a harder-to-miss
    // confirm dialog than the lighter "tap again" pattern used for
    // reversible actions elsewhere (withdraw proposal, remove judge, etc).
    confirmAction({
      title: 'Delete account?',
      message: `This permanently deletes ${target.fullName}'s account (${target.role}). This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: () => confirmDelete(target.id),
    });
  };

  const confirmDelete = async (id: string) => {
    if (!token) return;
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
    <KeyboardAvoidingScreen>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      {stats ? (
        <View style={styles.statsGrid}>
          <StatTile icon="users" label="Total users" value={stats.totalUsers} tint={colors.accents.violet} />
          <StatTile icon="user" label="Students" value={stats.studentCount} tint={colors.accents.teal} />
          <StatTile icon="briefcase" label="Supervisors" value={stats.supervisorCount} tint={colors.accents.amber} />
          <StatTile
            icon="alert-triangle"
            label="Groups w/o supervisor"
            value={stats.groupsWithoutSupervisor}
            tint={colors.accents.coral}
          />
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or email"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Search users by name or email"
      />

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {results.map((r) => {
        const isSelf = r.id === user?.id;
        return (
          <Card key={r.id} style={styles.row}>
            <Avatar name={r.fullName} size={32} />
            <View style={styles.rowText}>
              <Text style={styles.name}>{r.fullName}</Text>
              <Text style={styles.role}>{r.role}</Text>
            </View>
            {isSelf ? (
              <Text style={styles.selfLabel}>This is you</Text>
            ) : (
              <Button
                label="Delete"
                onPress={() => onDelete(r)}
                size="sm"
                variant="dangerOutline"
                loading={deletingId === r.id}
                accessibilityLabel={`Delete ${r.fullName}'s account`}
              />
            )}
          </Card>
        );
      })}

      {query.trim().length >= 2 && results.length === 0 && !loading ? (
        <Text style={styles.emptyText}>No matching users.</Text>
      ) : null}
      {query.trim().length < 2 ? (
        <Text style={styles.hint}>Type at least 2 characters to search.</Text>
      ) : null}
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      fontSize: 15,
      backgroundColor: colors.surface,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.xxl },
    rowText: { flex: 1 },
    name: { ...typography.body, fontWeight: '600' },
    role: { ...typography.caption, color: colors.textMuted },
    selfLabel: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
    hint: { ...typography.caption, color: colors.textMuted },
    emptyText: { color: colors.textMuted, textAlign: 'center' },
    error: { color: colors.danger },
  });
}
