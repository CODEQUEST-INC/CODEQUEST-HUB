import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import Text from '../../components/Text';
import { Cohort, listCohorts } from '../../api/cohorts';
import { listShowcaseEntries, resolvePhotoUrl, ShowcaseEntryResponse } from '../../api/showcase';
import { useAuth } from '../../auth/AuthContext';
import CohortPicker from '../../components/CohortPicker';
import EmptyState from '../../components/EmptyState';
import { ShowcaseStackParamList } from '../../navigation/types';
import { Colors, elevation, radius, spacing, typography, useTheme } from '../../theme';

type Props = NativeStackScreenProps<ShowcaseStackParamList, 'ShowcaseGallery'>;

export default function ShowcaseGalleryScreen({ navigation }: Props) {
  const { user, token } = useAuth();
  const { mode, colors } = useTheme();
  const styles = createStyles(colors, mode);
  const accentList = Object.values(colors.accents);
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

  const cohortYearById = useMemo(() => {
    const map: Record<string, number> = {};
    cohorts.forEach((c) => {
      map[c.id] = c.year;
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
      <Text style={styles.summary}>
        {entries.length} project{entries.length === 1 ? '' : 's'} · {cohortsWithEntries.length} cohort
        {cohortsWithEntries.length === 1 ? '' : 's'}
      </Text>

      {user?.role === 'student' ? (
        <Pressable
          style={({ pressed }) => [styles.editLink, pressed && styles.editLinkPressed]}
          onPress={() => navigation.navigate('ShowcaseEdit')}
          accessibilityRole="button"
          accessibilityLabel="Manage my group's showcase"
        >
          <Feather name="edit-3" size={14} color={colors.accents.pink.fg} />
          <Text style={styles.editLinkText}>My group's showcase</Text>
          <Feather name="chevron-right" size={14} color={colors.accents.pink.fg} />
        </Pressable>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {cohortsWithEntries.length > 1 ? (
        <View style={styles.filterRow}>
          <CohortPicker
            selectedCohortId={selectedCohortId}
            onSelect={setSelectedCohortId}
            cohorts={cohortsWithEntries}
            allowAll
          />
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        numColumns={2}
        data={visibleEntries}
        keyExtractor={(e) => e.id}
        renderItem={({ item, index }) => {
          const photo = resolvePhotoUrl(item.photos[0]?.url ?? null);
          const cohortYear = cohortYearById[item.cohortId];
          const accent = accentList[index % accentList.length];
          return (
            <Pressable
              style={styles.cardWrap}
              onPress={() => navigation.navigate('ShowcaseDetail', { entry: item })}
              accessibilityRole="button"
              accessibilityLabel={`View ${item.title}, ${item.groupName ?? `Group ${item.groupNumber}`}`}
            >
              {({ pressed }) => (
                <View style={[styles.card, pressed && styles.cardPressed]}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <LinearGradient
                      colors={[accent.accent, accent.fg]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.thumb}
                    />
                  )}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {item.groupName ?? `Group ${item.groupNumber}`}
                      {cohortYear ? ` · ${cohortYear}` : ''}
                    </Text>
                  </View>
                </View>
              )}
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

function createStyles(colors: Colors, mode: 'light' | 'dark') {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
    summary: {
      ...typography.caption,
      color: colors.textMuted,
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    editLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-end',
      minHeight: 44,
      margin: spacing.lg,
      marginBottom: 0,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.accents.pink.tint,
    },
    editLinkPressed: { opacity: 0.8 },
    editLinkText: { color: colors.accents.pink.fg, fontWeight: '600', fontSize: 13 },
    // CohortPicker (same component used on Leaderboard/Groups/Criteria/Judges/
    // Payments) owns its own chip styling — this just aligns it with the
    // screen's horizontal padding.
    filterRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    list: { padding: spacing.lg, gap: spacing.md },
    row: { gap: spacing.md },
    cardWrap: { flex: 1 },
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...elevation(mode, 'sm'),
    },
    cardPressed: { opacity: 0.85 },
    thumb: { width: '100%', aspectRatio: 1.5 },
    cardBody: { padding: spacing.md, gap: 2 },
    cardTitle: { ...typography.body, fontWeight: '700' },
    cardMeta: { ...typography.caption, color: colors.textMuted },
    error: { color: colors.danger, textAlign: 'center', padding: spacing.md },
  });
}
