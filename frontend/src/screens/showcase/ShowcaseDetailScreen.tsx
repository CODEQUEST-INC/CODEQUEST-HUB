import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../../components/Text';
import Button from '../../components/Button';
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
  const [linkError, setLinkError] = useState<string | null>(null);
  const photoWidth = screenWidth - spacing.xxl * 2;
  const listRef = useRef<FlatList>(null);
  const hasMultiplePhotos = entry.photos.length > 1;

  const goToPhoto = (index: number) => {
    if (index < 0 || index >= entry.photos.length) return;
    listRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      {entry.photos.length > 0 ? (
        <>
          <View>
            <FlatList
              ref={listRef}
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
                  accessibilityLabel={`Photo ${entry.photos.indexOf(item) + 1} of ${entry.photos.length}`}
                />
              )}
            />
            {/* Visible tap controls alongside the swipe gesture — a
                first-time viewer shouldn't have to discover that this
                carousel is swipeable. */}
            {hasMultiplePhotos ? (
              <>
                {activeIndex > 0 ? (
                  <Pressable
                    style={[styles.navButton, styles.navButtonLeft]}
                    onPress={() => goToPhoto(activeIndex - 1)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Previous photo"
                  >
                    <Feather name="chevron-left" size={20} color="#fff" />
                  </Pressable>
                ) : null}
                {activeIndex < entry.photos.length - 1 ? (
                  <Pressable
                    style={[styles.navButton, styles.navButtonRight]}
                    onPress={() => goToPhoto(activeIndex + 1)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Next photo"
                  >
                    <Feather name="chevron-right" size={20} color="#fff" />
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
          {hasMultiplePhotos ? (
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

      <View style={styles.titleRow}>
        <Text style={styles.title}>{entry.title}</Text>
        {entry.rank !== null ? (
          <View style={styles.rankPill}>
            <Feather name="award" size={14} color={colors.accents.amber.fg} />
            <Text style={styles.rankPillText}>
              #{entry.rank}
              {entry.score !== null ? ` · ${entry.score}` : ''}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.meta}>{entry.groupName ?? `Group ${entry.groupNumber}`}</Text>

      <Text style={styles.body}>{entry.description}</Text>

      {linkError ? <Text style={styles.error}>{linkError}</Text> : null}

      <Button
        label="View on GitHub"
        icon="github"
        variant="secondary"
        style={styles.linkButton}
        onPress={() => {
          setLinkError(null);
          Linking.openURL(entry.githubUrl).catch(() => setLinkError('Could not open this GitHub link.'));
        }}
      />
    </ScrollView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.sm, backgroundColor: colors.bg },
    photo: { aspectRatio: 16 / 10, borderRadius: radius.xl },
    photoPlaceholder: { width: '100%', backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
    dotActive: { backgroundColor: colors.primary },
    navButton: {
      position: 'absolute',
      top: '50%',
      marginTop: -18,
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    navButtonLeft: { left: spacing.sm },
    navButtonRight: { right: spacing.sm },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.md },
    title: { ...typography.heading, fontSize: 22, flex: 1 },
    rankPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.accents.amber.tint,
    },
    rankPillText: { ...typography.caption, fontWeight: '700', color: colors.accents.amber.fg },
    meta: { ...typography.caption, color: colors.textMuted },
    body: { ...typography.body, color: colors.textMuted, marginTop: spacing.md },
    error: { color: colors.danger, marginTop: spacing.md },
    linkButton: { marginTop: spacing.xl, borderRadius: radius.xxxl },
  });
}
