import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import DashboardScreen from '../screens/DashboardScreen';
import GroupWorkspaceScreen from '../screens/GroupWorkspaceScreen';
import LeaderboardScreen from '../screens/admin/LeaderboardScreen';
import ScorecardScreen from '../screens/judge/ScorecardScreen';
import { useTheme } from '../theme';
import AdminStack from './AdminStack';
import { headerProfileButton } from './headerProfileButton';
import ProposalStack from './ProposalStack';
import ShowcaseStack from './ShowcaseStack';
import SupervisorStack from './SupervisorStack';
import TaskStack from './TaskStack';
import { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

// Feather (used everywhere else in the app) has no separate filled/outline
// glyph pairs the way Ionicons does, so the previous outline→filled swap on
// focus can't carry over directly. A small dot below the icon — always
// present, just transparent when inactive so there's no layout shift —
// stands in as the active-state indicator instead, on top of the existing
// tint-color change.
function tabIcon(name: React.ComponentProps<typeof Feather>['name']) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <Feather name={name} size={size} color={color} />
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: focused ? color : 'transparent' }} />
    </View>
  );
}

// The Dashboard tab's actual content depends on role — admins get the Admin
// Hub, supervisors get their Review Queue, everyone else gets the real
// dashboard. Keeps a single "home" tab slot instead of a separate one per role.
function dashboardTabFor(role: string | undefined, colors: ReturnType<typeof useTheme>['colors']) {
  if (role === 'admin') {
    return { component: AdminStack, title: 'Admin', icon: 'settings' as const, tint: colors.textMuted, isStack: true };
  }
  if (role === 'supervisor') {
    return {
      component: SupervisorStack,
      title: 'Review Queue',
      icon: 'clipboard' as const,
      tint: colors.accents.coral.fg,
      isStack: true,
    };
  }
  return { component: DashboardScreen, title: 'Dashboard', icon: 'sun' as const, tint: colors.accents.amber.fg, isStack: false };
}

export default function MainTabs() {
  const { user } = useAuth();
  const { mode, colors } = useTheme();
  const dashboardTab = dashboardTabFor(user?.role, colors);

  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: true,
        tabBarInactiveTintColor: colors.tabBarInactive,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        // Overriding tabBarStyle at all bypasses the navigator's own default
        // top shadow, so it has to be re-added explicitly to keep the bar
        // visually lifted above scrolling content. Unlike theme/elevation.ts
        // (shadow below, for cards floating on a page), a bottom bar needs
        // the shadow above it — a negative height offset — since it's the
        // content above that the bar is meant to separate from.
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(mode === 'light'
            ? { shadowColor: '#1D1B2E', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 }
            : { elevation: 8 }),
        },
        headerRight: headerProfileButton(navigation),
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={dashboardTab.component}
        options={{
          headerShown: !dashboardTab.isStack,
          title: dashboardTab.title,
          tabBarActiveTintColor: dashboardTab.tint,
          tabBarIcon: tabIcon(dashboardTab.icon),
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
              tabBarIcon: tabIcon('users'),
            }}
          />
          <Tab.Screen
            name="Proposal"
            component={ProposalStack}
            options={{
              headerShown: false,
              title: 'Proposal',
              tabBarActiveTintColor: colors.accents.violet.fg,
              tabBarIcon: tabIcon('file-text'),
            }}
          />
          <Tab.Screen
            name="Tasks"
            component={TaskStack}
            options={{
              headerShown: false,
              title: 'Tasks',
              tabBarActiveTintColor: colors.accents.teal.fg,
              tabBarIcon: tabIcon('check-square'),
            }}
          />
          <Tab.Screen
            name="Leaderboard"
            component={LeaderboardScreen}
            options={{
              title: 'Leaderboard',
              tabBarActiveTintColor: colors.accents.amber.fg,
              tabBarIcon: tabIcon('award'),
            }}
          />
        </>
      ) : null}
      {user?.role !== 'student' ? (
        <Tab.Screen
          name="Judge"
          component={ScorecardScreen}
          options={{
            title: 'Judge',
            tabBarActiveTintColor: colors.accents.amber.fg,
            tabBarIcon: tabIcon('award'),
          }}
        />
      ) : null}
      <Tab.Screen
        name="Showcase"
        component={ShowcaseStack}
        options={{
          headerShown: false,
          title: 'Showcase',
          tabBarActiveTintColor: colors.accents.pink.fg,
          tabBarIcon: tabIcon('image'),
        }}
      />
    </Tab.Navigator>
  );
}
