import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Cohort, listCohorts } from '../api/cohorts';
import { useAuth } from '../auth/AuthContext';

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
  row: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#374151' },
  chipTextSelected: { color: '#fff' },
  empty: { padding: 16 },
  emptyText: { color: '#6b7280' },
});
