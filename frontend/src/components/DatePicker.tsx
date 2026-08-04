import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from './Text';
import { Colors, radius, spacing, typography, useTheme } from '../theme';

interface Props {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (isoDate: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIso(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplay(value: string): string {
  const date = parseIso(value);
  if (!date) return '';
  return `${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

// Bespoke calendar picker — no third-party date library — so it renders
// identically on web and native, matching how the rest of the app's inputs
// (Button, CohortPicker, TextInput) are all hand-built rather than pulled in.
export default function DatePicker({ value, onChange, placeholder = 'Select a date', accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const selected = parseIso(value);
  const [visible, setVisible] = useState(false);
  const [viewDate, setViewDate] = useState(selected ?? new Date());

  const open = () => {
    setViewDate(selected ?? new Date());
    setVisible(true);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const pick = (day: number) => {
    onChange(toIso(new Date(year, month, day)));
    setVisible(false);
  };

  const changeMonth = (delta: number) => setViewDate(new Date(year, month + delta, 1));

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? (value ? `Due date, ${formatDisplay(value)}` : placeholder)}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>{value ? formatDisplay(value) : placeholder}</Text>
        <Feather name="calendar" size={17} color={colors.textMuted} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.calendar} onPress={(e) => e.stopPropagation()}>
            <View style={styles.calendarHeader}>
              <Pressable
                onPress={() => changeMonth(-1)}
                hitSlop={8}
                style={styles.monthNavButton}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
              >
                <Feather name="chevron-left" size={18} color={colors.text} />
              </Pressable>
              <Text style={styles.monthLabel}>
                {MONTH_NAMES[month]} {year}
              </Text>
              <Pressable
                onPress={() => changeMonth(1)}
                hitSlop={8}
                style={styles.monthNavButton}
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <Feather name="chevron-right" size={18} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={styles.weekdayText}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, i) => {
                if (day === null) return <View key={`blank-${i}`} style={styles.dayCell} />;
                const isSelected =
                  !!selected && selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day;
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                return (
                  <Pressable
                    key={day}
                    style={styles.dayCell}
                    onPress={() => pick(day)}
                    accessibilityRole="button"
                    accessibilityLabel={`${MONTH_NAMES[month]} ${day}, ${year}`}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isSelected && styles.dayCircleSelected,
                        !isSelected && isToday && styles.dayCircleToday,
                      ]}
                    >
                      <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {value ? (
              <Pressable
                onPress={() => {
                  onChange('');
                  setVisible(false);
                }}
                style={styles.clearButton}
                accessibilityRole="button"
                accessibilityLabel="Clear due date"
              >
                <Text style={styles.clearButtonText}>Clear date</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
    },
    fieldPressed: { opacity: 0.8 },
    valueText: { ...typography.body, color: colors.text },
    placeholderText: { ...typography.body, color: colors.textMuted },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    calendar: { width: '100%', maxWidth: 320, backgroundColor: colors.surface, borderRadius: radius.xxl, padding: spacing.lg, gap: spacing.sm },
    calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    monthNavButton: {
      width: 32,
      height: 32,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSunken,
    },
    monthLabel: { ...typography.subheading, fontSize: 15 },
    weekdayRow: { flexDirection: 'row' },
    weekdayText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    dayCircle: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
    dayCircleSelected: { backgroundColor: colors.primary },
    dayCircleToday: { borderWidth: 1, borderColor: colors.primary },
    dayText: { fontSize: 13, color: colors.text },
    dayTextSelected: { color: colors.textOnPrimary, fontWeight: '700' },
    clearButton: { alignSelf: 'center', marginTop: spacing.xs, minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md },
    clearButtonText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  });
}
