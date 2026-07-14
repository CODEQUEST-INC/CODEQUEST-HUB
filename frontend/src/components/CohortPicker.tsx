import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Cohort, listCohorts } from '../api/cohorts';
import { useAuth } from '../auth/AuthContext';
import { colors, radius, spacing } from '../theme';

interface Props {
  selectedCohortId: string | null;
  onSelect: (cohortId: string) => void;
}

export default function CohortPicker({ selectedCohortId, onSelect }: Props) {
  const { token } = useAuth();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);

  useEffect(() => {
    if (!token) return;
    listCohorts(token)
      .then((list) => {
        setCohorts(list);
        if (!selectedCohortId && list.length > 0) {
          onSelect(list[0].id);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (cohorts.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No cohorts yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  chip: {
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
