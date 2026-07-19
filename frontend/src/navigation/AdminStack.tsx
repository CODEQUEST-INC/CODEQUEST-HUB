import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import AdminHubScreen from '../screens/admin/AdminHubScreen';
import CohortsScreen from '../screens/admin/CohortsScreen';
import CriteriaScreen from '../screens/admin/CriteriaScreen';
import GroupsScreen from '../screens/admin/GroupsScreen';
import JudgesScreen from '../screens/admin/JudgesScreen';
import LeaderboardScreen from '../screens/admin/LeaderboardScreen';
import { useTheme } from '../theme';
import { headerProfileButton } from './headerProfileButton';
import { AdminStackParamList } from './types';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerRight: headerProfileButton(navigation),
      })}
    >
      <Stack.Screen name="AdminHub" component={AdminHubScreen} options={{ title: 'Admin' }} />
      <Stack.Screen name="Cohorts" component={CohortsScreen} options={{ title: 'Cohorts' }} />
      <Stack.Screen name="Groups" component={GroupsScreen} options={{ title: 'Groups' }} />
      <Stack.Screen name="Criteria" component={CriteriaScreen} options={{ title: 'Judging Criteria' }} />
      <Stack.Screen name="Judges" component={JudgesScreen} options={{ title: 'Judges' }} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboard' }} />
    </Stack.Navigator>
  );
}
