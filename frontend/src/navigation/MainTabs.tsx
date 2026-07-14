import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useAuth } from '../auth/AuthContext';
import DashboardScreen from '../screens/DashboardScreen';
import GroupWorkspaceScreen from '../screens/GroupWorkspaceScreen';
import LeaderboardScreen from '../screens/admin/LeaderboardScreen';
import ScorecardScreen from '../screens/judge/ScorecardScreen';
import { colors } from '../theme';
import AdminStack from './AdminStack';
import ProposalStack from './ProposalStack';
import SupervisorStack from './SupervisorStack';
import TaskStack from './TaskStack';
import { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

function tabIcon(outline: keyof typeof Ionicons.glyphMap, filled: keyof typeof Ionicons.glyphMap) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? filled : outline} size={size} color={color} />
  );
}

export default function MainTabs() {
  const { user } = useAuth();

  return (
    <Tab.Navigator screenOptions={{ headerShown: true, tabBarInactiveTintColor: colors.tabBarInactive }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarActiveTintColor: colors.accents.amber.fg,
          tabBarIcon: tabIcon('sunny-outline', 'sunny'),
        }}
      />
      {user?.role === 'student' ? (
        <>
          <Tab.Screen
            name="Group"
            component={GroupWorkspaceScreen}
            options={{
              title: 'My Group',
              tabBarActiveTintColor: colors.accents.teal.fg,
              tabBarIcon: tabIcon('people-outline', 'people'),
            }}
          />
          <Tab.Screen
            name="Proposal"
            component={ProposalStack}
            options={{
              headerShown: false,
              title: 'Proposal',
              tabBarActiveTintColor: colors.accents.violet.fg,
              tabBarIcon: tabIcon('document-text-outline', 'document-text'),
            }}
          />
          <Tab.Screen
            name="Tasks"
            component={TaskStack}
            options={{
              headerShown: false,
              title: 'Tasks',
              tabBarActiveTintColor: colors.accents.teal.fg,
              tabBarIcon: tabIcon('checkbox-outline', 'checkbox'),
            }}
          />
          <Tab.Screen
            name="Leaderboard"
            component={LeaderboardScreen}
            options={{
              title: 'Leaderboard',
              tabBarActiveTintColor: colors.accents.amber.fg,
              tabBarIcon: tabIcon('trophy-outline', 'trophy'),
            }}
          />
        </>
      ) : null}
      {user?.role === 'supervisor' ? (
        <Tab.Screen
          name="ReviewQueue"
          component={SupervisorStack}
          options={{
            headerShown: false,
            title: 'Review Queue',
            tabBarActiveTintColor: colors.accents.coral.fg,
            tabBarIcon: tabIcon('clipboard-outline', 'clipboard'),
          }}
        />
      ) : null}
      {user?.role !== 'student' ? (
        <Tab.Screen
          name="Judge"
          component={ScorecardScreen}
          options={{
            title: 'Judge',
            tabBarActiveTintColor: colors.accents.amber.fg,
            tabBarIcon: tabIcon('trophy-outline', 'trophy'),
          }}
        />
      ) : null}
      {user?.role === 'admin' ? (
        <Tab.Screen
          name="Admin"
          component={AdminStack}
          options={{
            headerShown: false,
            title: 'Admin',
            tabBarActiveTintColor: colors.textMuted,
            tabBarIcon: tabIcon('settings-outline', 'settings'),
          }}
        />
      ) : null}
    </Tab.Navigator>
  );
}
