import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { searchUsers, UserSearchResult } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import Avatar from './Avatar';
import { colors, radius, spacing, typography } from '../theme';

interface Props {
  onSelect: (user: UserSearchResult) => void;
  roleFilter?: string;
  placeholder?: string;
}

// Type-ahead by name/email, resolving straight to a user id — replaces
// pasting raw UUIDs into judge/member/supervisor assignment forms.
export default function UserPicker({ onSelect, roleFilter, placeholder }: Props) {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(() => {
      searchUsers(query.trim(), token, roleFilter)
        .then((r) => {
          if (!cancelled) setResults(r);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, token, roleFilter]);

  const handleSelect = (user: UserSearchResult) => {
    onSelect(user);
    setQuery('');
    setResults([]);
  };

  const showEmpty = query.trim().length >= 2 && !loading && results.length === 0;

  return (
    <View>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder ?? 'Search by name or email'}
        placeholderTextColor={colors.textMuted}
      />
      {loading ? <ActivityIndicator style={styles.spinner} color={colors.primary} /> : null}
      {results.length > 0 ? (
        <View style={styles.dropdown}>
          {results.map((u, i) => (
            <Pressable
              key={u.id}
              style={[styles.row, i === results.length - 1 && styles.rowLast]}
              onPress={() => handleSelect(u)}
            >
              <Avatar name={u.fullName} size={28} />
              <View style={styles.rowText}>
                <Text style={styles.name}>{u.fullName}</Text>
                <Text style={styles.role}>{u.role}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      {showEmpty ? <Text style={styles.empty}>No matches.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 15,
    backgroundColor: colors.surface,
  },
  spinner: { marginTop: spacing.sm },
  dropdown: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1 },
  name: { ...typography.body, fontWeight: '600' },
  role: { ...typography.caption, textTransform: 'capitalize' },
  empty: { ...typography.caption, marginTop: spacing.sm },
});
