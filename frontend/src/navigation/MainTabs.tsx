import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useAuth } from '../auth/AuthContext';
import DashboardScreen from '../screens/DashboardScreen';
import GroupWorkspaceScreen from '../screens/GroupWorkspaceScreen';
import { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export default function MainTabs() {
  const { user } = useAuth();

  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      {user?.role === 'student' ? (
        <Tab.Screen name="Group" component={GroupWorkspaceScreen} options={{ title: 'My Group' }} />
      ) : null}
    </Tab.Navigator>
  );
}
