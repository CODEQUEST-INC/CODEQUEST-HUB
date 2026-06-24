import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import SplashScreen from '../screens/SplashScreen';

// Phase 2 Screens
import ProposalSubmissionScreen from '../screens/projects/ProposalSubmissionScreen';
import ProposalStatusDashboard from '../screens/projects/ProposalStatusDashboard';
import SupervisorReviewScreen from '../screens/projects/SupervisorReviewScreen';
import AdminDashboard from '../screens/projects/AdminDashboard';

// Phase 3 Screens
import KanbanBoardScreen from '../screens/tasks/KanbanBoardScreen';

// Phase 4 Screens
import CommunityScreen from '../screens/main/CommunityScreen';
import ResourcesScreen from '../screens/main/ResourcesScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  SubmitProposal: undefined;
  ProposalStatus: undefined;
  SupervisorReview: undefined;
  AdminDashboard: undefined;
  KanbanBoard: undefined;
  Community: undefined;
  Resources: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, isLoading } = useAuth();
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  if (isSplashVisible || isLoading) {
    return (
      <SplashScreen onFinish={() => setIsSplashVisible(false)} />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Authenticated Stack
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="SubmitProposal" component={ProposalSubmissionScreen} />
            <Stack.Screen name="ProposalStatus" component={ProposalStatusDashboard} />
            <Stack.Screen name="SupervisorReview" component={SupervisorReviewScreen} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
            <Stack.Screen name="KanbanBoard" component={KanbanBoardScreen} />
            <Stack.Screen name="Community" component={CommunityScreen} />
            <Stack.Screen name="Resources" component={ResourcesScreen} />
          </>
        ) : (
          // Unauthenticated Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
