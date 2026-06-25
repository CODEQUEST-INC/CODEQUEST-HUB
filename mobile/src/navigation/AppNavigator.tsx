import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import SplashScreen from '../screens/SplashScreen';
import CreateProfileScreen from '../screens/auth/CreateProfileScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import MainTabNavigator from './MainTabNavigator';

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
  CreateProfile: undefined;
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
          user.profileCompleted ? (
            // Authenticated Stack
            <>
              {/* Main Tabs */}
              <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
              
              {/* Profile sub-route */}
              <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Profile' }} />
              <Stack.Screen name="CreateProfile" component={CreateProfileScreen} options={{ headerShown: true, title: 'Edit Profile' }} />
              
              {/* Project sub-routes */}
              <Stack.Screen name="SubmitProposal" component={ProposalSubmissionScreen} options={{ headerShown: true, title: 'Submit Proposal' }} />
              <Stack.Screen name="SupervisorReview" component={SupervisorReviewScreen} options={{ headerShown: true, title: 'Supervisor Review' }} />
              <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ headerShown: true, title: 'Admin Dashboard' }} />
              
              {/* Other sub-routes */}
              <Stack.Screen name="Resources" component={ResourcesScreen} options={{ headerShown: true, title: 'Resources' }} />
            </>
          ) : (
            // Incomplete Profile Trap
            <>
              <Stack.Screen name="CreateProfile" component={CreateProfileScreen} />
            </>
          )
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
