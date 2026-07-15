import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { listShowcaseEntries, resolvePhotoUrl, ShowcaseEntryResponse } from '../../api/showcase';
import { useAuth } from '../../auth/AuthContext';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import { ShowcaseStackParamList } from '../../navigation/types';
import { accents, colors, radius, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ShowcaseStackParamList, 'ShowcaseGallery'>;

export default function ShowcaseGalleryScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ShowcaseEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await listShowcaseEntries());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load showcase');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {user?.role === 'student' ? (
        <Pressable style={styles.editLink} onPress={() => navigation.navigate('ShowcaseEdit')}>
          <Feather name="edit-3" size={14} color={accents.pink.fg} />
          <Text style={styles.editLinkText}>My group's showcase</Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={entries}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => {
          const photo = resolvePhotoUrl(item.photoUrl);
          return (
            <Pressable onPress={() => navigation.navigate('ShowcaseDetail', { entry: item })}>
              <Card style={styles.card} tint={accents.pink}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Feather name="image" size={22} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardMeta}>{item.groupName ?? `Group ${item.groupNumber}`}</Text>
                </View>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="image"
            heading="Nothing published yet"
            subtext="Approved groups can publish their project here once they're ready to show it off."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-end',
    margin: spacing.lg,
    marginBottom: 0,
  },
  editLinkText: { color: accents.pink.fg, fontWeight: '600', fontSize: 13 },
  list: { padding: spacing.lg, gap: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  thumbPlaceholder: { backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { ...typography.body, fontWeight: '600' },
  cardMeta: { ...typography.caption, marginTop: 2 },
  error: { color: colors.danger, textAlign: 'center', padding: spacing.md },
});
