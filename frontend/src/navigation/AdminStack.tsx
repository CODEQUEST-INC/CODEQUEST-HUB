import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import AdminHubScreen from '../screens/admin/AdminHubScreen';
import CriteriaScreen from '../screens/admin/CriteriaScreen';
import JudgesScreen from '../screens/admin/JudgesScreen';
import LeaderboardScreen from '../screens/admin/LeaderboardScreen';
import { AdminStackParamList } from './types';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminHub" component={AdminHubScreen} options={{ title: 'Admin' }} />
      <Stack.Screen name="Criteria" component={CriteriaScreen} options={{ title: 'Judging Criteria' }} />
      <Stack.Screen name="Judges" component={JudgesScreen} options={{ title: 'Judges' }} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboard' }} />
    </Stack.Navigator>
  );
}
