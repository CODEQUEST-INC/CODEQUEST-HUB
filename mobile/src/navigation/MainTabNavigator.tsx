import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

// Import Screens
import DashboardScreen from '../screens/main/DashboardScreen';
import ProposalStatusDashboard from '../screens/projects/ProposalStatusDashboard';
import KanbanBoardScreen from '../screens/tasks/KanbanBoardScreen';
import CommunityScreen from '../screens/main/CommunityScreen';

const Tab = createBottomTabNavigator();

// Profile Icon Button for Header
const ProfileHeaderButton = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  
  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate('Profile')}
      className="mr-4 w-9 h-9 bg-brand-purple rounded-full items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm"
    >
      <Ionicons name="person" size={18} color="white" />
    </TouchableOpacity>
  );
};

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true, // We want headers for the main tabs
        headerRight: () => <ProfileHeaderButton />,
        headerStyle: {
          backgroundColor: '#ffffff', // You can dynamically adjust this for dark mode in real apps
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          color: '#0f172a',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Projects') {
            iconName = focused ? 'folder' : 'folder-outline';
          } else if (route.name === 'Tasks') {
            iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          } else if (route.name === 'Community') {
            iconName = focused ? 'people' : 'people-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6E20B8', // brand-purple
        tabBarInactiveTintColor: '#94a3b8', // slate-400
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Projects" component={ProposalStatusDashboard} options={{ title: 'Projects' }} />
      <Tab.Screen name="Tasks" component={KanbanBoardScreen} options={{ title: 'Tasks' }} />
      <Tab.Screen name="Community" component={CommunityScreen} options={{ title: 'Community' }} />
    </Tab.Navigator>
  );
}
