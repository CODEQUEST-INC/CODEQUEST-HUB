import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Dimensions, FlatList, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../../components/Text';
import { resolvePhotoUrl } from '../../api/showcase';
import { ShowcaseStackParamList } from '../../navigation/types';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';

type Props = NativeStackScreenProps<ShowcaseStackParamList, 'ShowcaseDetail'>;

const screenWidth = Dimensions.get('window').width;

export default function ShowcaseDetailScreen({ route }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { entry } = route.params;
  const [activeIndex, setActiveIndex] = useState(0);
  const photoWidth = screenWidth - spacing.xxl * 2;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      {entry.photos.length > 0 ? (
        <>
          <FlatList
            data={entry.photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(p) => p.id}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / photoWidth);
              setActiveIndex(index);
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: resolvePhotoUrl(item.url) ?? undefined }}
                style={[styles.photo, { width: photoWidth }]}
                resizeMode="cover"
              />
            )}
          />
          {entry.photos.length > 1 ? (
            <View style={styles.dots}>
              {entry.photos.map((p, i) => (
                <View key={p.id} style={[styles.dot, i === activeIndex && styles.dotActive]} />
              ))}
            </View>
          ) : null}
        </>
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
    photo: { aspectRatio: 16 / 10, borderRadius: radius.lg },
    photoPlaceholder: { width: '100%', backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
    dotActive: { backgroundColor: colors.primary },
    title: { ...typography.heading, fontSize: 22, marginTop: spacing.md },
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
