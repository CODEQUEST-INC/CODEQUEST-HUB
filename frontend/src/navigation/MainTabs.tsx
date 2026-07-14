import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useAuth } from '../auth/AuthContext';
import DashboardScreen from '../screens/DashboardScreen';
import GroupWorkspaceScreen from '../screens/GroupWorkspaceScreen';
import ScorecardScreen from '../screens/judge/ScorecardScreen';
import AdminStack from './AdminStack';
import ProposalStack from './ProposalStack';
import SupervisorStack from './SupervisorStack';
import TaskStack from './TaskStack';
import { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export default function MainTabs() {
  const { user } = useAuth();

  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      {user?.role === 'student' ? (
        <>
          <Tab.Screen name="Group" component={GroupWorkspaceScreen} options={{ title: 'My Group' }} />
          <Tab.Screen
            name="Proposal"
            component={ProposalStack}
            options={{ headerShown: false, title: 'Proposal' }}
          />
          <Tab.Screen name="Tasks" component={TaskStack} options={{ headerShown: false, title: 'Tasks' }} />
        </>
      ) : null}
      {user?.role === 'supervisor' ? (
        <Tab.Screen
          name="ReviewQueue"
          component={SupervisorStack}
          options={{ headerShown: false, title: 'Review Queue' }}
        />
      ) : null}
      <Tab.Screen name="Judge" component={ScorecardScreen} options={{ title: 'Judge' }} />
      {user?.role === 'admin' ? (
        <Tab.Screen name="Admin" component={AdminStack} options={{ headerShown: false, title: 'Admin' }} />
      ) : null}
    </Tab.Navigator>
  );
}
