import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import Text from '../components/Text';
import { useAuth } from '../auth/AuthContext';
import Card from '../components/Card';
import { radius, spacing, typography, useTheme } from '../theme';

export default function SettingsScreen() {
  const { logout } = useAuth();
  const { mode, colors, toggleTheme } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Card style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Dark mode</Text>
          <Text style={styles.rowSubtitle}>Switch between light and dark appearance</Text>
        </View>
        <Switch
          value={mode === 'dark'}
          onValueChange={toggleTheme}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.surface}
        />
      </Card>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Feather name="log-out" size={16} color={colors.danger} />
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, padding: spacing.xxl, gap: spacing.lg, backgroundColor: colors.bg },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rowText: { flex: 1 },
    rowTitle: { ...typography.body, fontWeight: '600' },
    rowSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: radius.md,
      padding: spacing.lg,
    },
    logoutText: { color: colors.danger, fontWeight: '600' },
  });
}
