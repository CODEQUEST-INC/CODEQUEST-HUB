import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../../components/Text';
import { resolvePhotoUrl } from '../../api/showcase';
import { ShowcaseStackParamList } from '../../navigation/types';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';

type Props = NativeStackScreenProps<ShowcaseStackParamList, 'ShowcaseDetail'>;

export default function ShowcaseDetailScreen({ route }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { entry } = route.params;
  const photo = resolvePhotoUrl(entry.photoUrl);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Feather name="image" size={32} color={colors.textMuted} />
        </View>
      )}

      <Text style={styles.title}>{entry.title}</Text>
      <Text style={styles.meta}>{entry.groupName ?? `Group ${entry.groupNumber}`}</Text>

      <Text style={styles.body}>{entry.description}</Text>

      <Pressable style={styles.linkButton} onPress={() => Linking.openURL(entry.githubUrl)}>
        <Feather name="github" size={16} color={colors.primary} />
        <Text style={styles.linkButtonText}>View on GitHub</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.sm, backgroundColor: colors.bg },
    photo: { width: '100%', aspectRatio: 16 / 10, borderRadius: radius.lg, marginBottom: spacing.md },
    photoPlaceholder: { backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    title: { ...typography.heading, fontSize: 22 },
    meta: { ...typography.caption, color: colors.textMuted },
    body: { ...typography.body, color: colors.textMuted, marginTop: spacing.md },
    linkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginTop: spacing.xl,
    },
    linkButtonText: { color: colors.primary, fontWeight: '600' },
  });
}
