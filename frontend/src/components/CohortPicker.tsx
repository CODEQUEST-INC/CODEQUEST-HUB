import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from './Text';
import { Cohort, listCohorts } from '../api/cohorts';
import { useAuth } from '../auth/AuthContext';
import { Colors, radius, spacing, useTheme } from '../theme';

interface Props {
  selectedCohortId: string | null;
  onSelect: (cohortId: string | null) => void;
  // Overrides the picker's own fetch — pass this when the caller already has
  // a (possibly filtered) cohort list, e.g. Showcase only wants cohorts that
  // have published entries.
  cohorts?: Cohort[];
  // Adds an "All cohorts" chip that selects null, and disables the
  // auto-select-first-cohort behavior below (that default only makes sense
  // when there's no "all" option to fall back to).
  allowAll?: boolean;
}

export default function CohortPicker({ selectedCohortId, onSelect, cohorts: cohortsOverride, allowAll = false }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [fetchedCohorts, setFetchedCohorts] = useState<Cohort[]>([]);

  useEffect(() => {
    if (!token || cohortsOverride) return;
    listCohorts(token)
      .then((list) => {
        setFetchedCohorts(list);
        if (!allowAll && !selectedCohortId && list.length > 0) {
          onSelect(list[0].id);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, cohortsOverride]);

  const cohorts = cohortsOverride ?? fetchedCohorts;

  if (cohorts.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No cohorts yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {allowAll ? (
        <Pressable
          style={[styles.chip, !selectedCohortId && styles.chipSelected]}
          onPress={() => onSelect(null)}
          accessibilityRole="button"
          accessibilityState={{ selected: !selectedCohortId }}
        >
          <Text style={[styles.chipText, !selectedCohortId && styles.chipTextSelected]}>All cohorts</Text>
        </Pressable>
      ) : null}
      {cohorts.map((c) => (
        <Pressable
          key={c.id}
          style={[styles.chip, selectedCohortId === c.id && styles.chipSelected]}
          onPress={() => onSelect(c.id)}
        >
          <Text style={[styles.chipText, selectedCohortId === c.id && styles.chipTextSelected]}>
            {c.name} ({c.year})
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
    chip: {
      minHeight: 44,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.text },
    chipTextSelected: { color: colors.textOnPrimary },
    empty: { padding: spacing.lg },
    emptyText: { color: colors.textMuted },
  });
}
