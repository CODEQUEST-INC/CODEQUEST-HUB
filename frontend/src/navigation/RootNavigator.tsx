import { LinkingOptions, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import HelpScreen from '../screens/HelpScreen';
import PdfViewerScreen from '../screens/PdfViewerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import { useTheme } from '../theme';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Only "reset-password" is a real deep link target (from the forgot-password
// email) — everything else here is reachable in-app only. Login/Register/
// ForgotPassword live on AuthStack, a separate navigator only mounted while
// signed out; this config is shared across both possible trees since only
// one is ever mounted at a time; React Navigation just won't find a match if
// the wrong tree is active for a given path (e.g. following the link while
// already signed in — an edge case not worth handling here).
const linking: LinkingOptions<ReactNavigation.RootParamList> = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'reset-password',
    },
  },
};

export default function RootNavigator() {
  const { status } = useAuth();
  const { colors } = useTheme();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {status === 'signedIn' ? (
        <Stack.Navigator
          screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}
        >
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen name="Help" component={HelpScreen} options={{ title: 'Help & Rules' }} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ title: 'Verify Email' }} />
          <Stack.Screen
            name="PdfViewer"
            component={PdfViewerScreen}
            options={({ route }) => ({ title: route.params.title ?? 'Proposal PDF' })}
          />
        </Stack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
