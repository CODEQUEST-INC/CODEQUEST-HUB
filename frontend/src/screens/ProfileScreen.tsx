import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../components/Text';
import { getMyGroup, GroupResponse } from '../api/groups';
import { useAuth } from '../auth/AuthContext';
import Avatar from '../components/Avatar';
import Card from '../components/Card';
import { RootStackParamList } from '../navigation/types';
import { radius, spacing, typography, useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const { user, token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [group, setGroup] = useState<GroupResponse | null>(null);

  useEffect(() => {
    if (!token || user?.role !== 'student') return;
    getMyGroup(token)
      .then(setGroup)
      .catch(() => setGroup(null));
  }, [token, user?.role]);

  if (!user) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Avatar name={user.fullName} size={72} />
        <Text style={styles.name}>{user.fullName}</Text>
        <Text style={styles.role}>{user.role}</Text>
      </View>

      <Card style={styles.card}>
        <InfoRow label="Email" value={user.email} />
        {user.role === 'student' ? (
          <>
            <InfoRow label="Reference number" value={user.studentId ?? '—'} />
            <InfoRow label="Index number" value={user.indexNumber ?? '—'} />
            <InfoRow label="Group" value={group ? group.name ?? `Group ${group.groupNumber}` : '—'} />
          </>
        ) : null}
      </Card>

      <Pressable style={styles.settingsLink} onPress={() => navigation.navigate('Settings')}>
        <Feather name="settings" size={16} color={colors.textMuted} />
        <Text style={styles.settingsLinkText}>Settings</Text>
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.lg, backgroundColor: colors.bg, flexGrow: 1 },
    header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    name: { ...typography.heading, fontSize: 20 },
    role: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' },
    card: { gap: 0 },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoLabel: { ...typography.body, color: colors.textMuted },
    infoValue: { ...typography.body, fontWeight: '600' },
    settingsLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.lg,
    },
    settingsLinkText: { ...typography.body, fontWeight: '600', flex: 1 },
  });
}
