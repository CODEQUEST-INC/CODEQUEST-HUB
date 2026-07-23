import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '../../components/Text';
import Card from '../../components/Card';
import { AdminStackParamList } from '../../navigation/types';
import { AccentSwatch, Colors, radius, spacing, typography, useTheme } from '../../theme';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminHub'>;

interface Item {
  label: string;
  route: keyof AdminStackParamList;
  icon: React.ComponentProps<typeof Feather>['name'];
  tint: AccentSwatch;
}

function getItems(colors: Colors): Item[] {
  return [
    { label: 'Cohorts', route: 'Cohorts', icon: 'calendar', tint: colors.accents.coral },
    { label: 'Groups', route: 'Groups', icon: 'grid', tint: colors.accents.green },
    { label: 'Judging criteria', route: 'Criteria', icon: 'sliders', tint: colors.accents.violet },
    { label: 'Assigned judges', route: 'Judges', icon: 'users', tint: colors.accents.teal },
    { label: 'Leaderboard', route: 'Leaderboard', icon: 'award', tint: colors.accents.amber },
    { label: 'Payments', route: 'Payments', icon: 'credit-card', tint: colors.accents.pink },
    { label: 'Users', route: 'Users', icon: 'user-x', tint: colors.accents.coral },
  ];
}

export default function AdminHubScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const ITEMS = getItems(colors);

  return (
    <View style={styles.container}>
      {ITEMS.map((item) => (
        <Pressable key={item.route} onPress={() => navigation.navigate(item.route as never)}>
          <Card style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: item.tint.tint }]}>
              <Feather name={item.icon} size={18} color={item.tint.fg} />
            </View>
            <Text style={styles.buttonText}>{item.label}</Text>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: { ...typography.subheading, fontSize: 16, flex: 1 },
  });
}
