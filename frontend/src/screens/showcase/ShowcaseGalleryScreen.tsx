import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../../components/Text';
import { Cohort, listCohorts } from '../../api/cohorts';
import { listShowcaseEntries, resolvePhotoUrl, ShowcaseEntryResponse } from '../../api/showcase';
import { useAuth } from '../../auth/AuthContext';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import { ShowcaseStackParamList } from '../../navigation/types';
import { Colors, radius, spacing, typography, useTheme } from '../../theme';

type Props = NativeStackScreenProps<ShowcaseStackParamList, 'ShowcaseGallery'>;

export default function ShowcaseGalleryScreen({ navigation }: Props) {
  const { user, token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [entries, setEntries] = useState<ShowcaseEntryResponse[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [entryList, cohortList] = await Promise.all([
        listShowcaseEntries(),
        token ? listCohorts(token) : Promise.resolve([]),
      ]);
      setEntries(entryList);
      setCohorts(cohortList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load showcase');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const cohortNameById = useMemo(() => {
    const map: Record<string, string> = {};
    cohorts.forEach((c) => {
      map[c.id] = `${c.name} (${c.year})`;
    });
    return map;
  }, [cohorts]);

  // Only cohorts with at least one published entry — avoids cluttering the
  // filter row with cohorts that have nothing to show.
  const cohortsWithEntries = useMemo(() => {
    const idsWithEntries = new Set(entries.map((e) => e.cohortId));
    return cohorts.filter((c) => idsWithEntries.has(c.id));
  }, [cohorts, entries]);

  const visibleEntries = selectedCohortId
    ? entries.filter((e) => e.cohortId === selectedCohortId)
    : entries;

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
          <Feather name="edit-3" size={14} color={colors.accents.pink.fg} />
          <Text style={styles.editLinkText}>My group's showcase</Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {cohortsWithEntries.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, !selectedCohortId && styles.filterChipSelected]}
            onPress={() => setSelectedCohortId(null)}
          >
            <Text style={[styles.filterChipText, !selectedCohortId && styles.filterChipTextSelected]}>
              All cohorts
            </Text>
          </Pressable>
          {cohortsWithEntries.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.filterChip, selectedCohortId === c.id && styles.filterChipSelected]}
              onPress={() => setSelectedCohortId(c.id)}
            >
              <Text style={[styles.filterChipText, selectedCohortId === c.id && styles.filterChipTextSelected]}>
                {c.name} ({c.year})
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={visibleEntries}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => {
          const photo = resolvePhotoUrl(item.photos[0]?.url ?? null);
          const cohortName = cohortNameById[item.cohortId];
          return (
            <Pressable onPress={() => navigation.navigate('ShowcaseDetail', { entry: item })}>
              <Card style={styles.card} tint={colors.accents.pink}>
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
                  <Text style={styles.cardMeta}>
                    {item.groupName ?? `Group ${item.groupNumber}`}
                    {cohortName ? ` · ${cohortName}` : ''}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="image"
            heading={selectedCohortId ? 'Nothing from this cohort yet' : 'Nothing published yet'}
            subtext={
              selectedCohortId
                ? 'No showcase entries for this cohort yet — try "All cohorts".'
                : "Approved groups can publish their project here once they're ready to show it off."
            }
          />
        }
      />
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
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
    editLinkText: { color: colors.accents.pink.fg, fontWeight: '600', fontSize: 13 },
    filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    filterChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    filterChipSelected: { backgroundColor: colors.accents.pink.accent, borderColor: colors.accents.pink.accent },
    filterChipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    filterChipTextSelected: { color: colors.textOnPrimary },
    list: { padding: spacing.lg, gap: spacing.md },
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    thumb: { width: 56, height: 56, borderRadius: radius.sm },
    thumbPlaceholder: { backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1 },
    cardTitle: { ...typography.body, fontWeight: '600' },
    cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    error: { color: colors.danger, textAlign: 'center', padding: spacing.md },
  });
}
