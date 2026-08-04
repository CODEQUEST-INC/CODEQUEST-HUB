import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ReviewDetailScreen from '../screens/supervisor/ReviewDetailScreen';
import ReviewQueueScreen from '../screens/supervisor/ReviewQueueScreen';
import { useTheme } from '../theme';
import { headerProfileButton } from './headerProfileButton';
import { SupervisorStackParamList } from './types';

const Stack = createNativeStackNavigator<SupervisorStackParamList>();

export default function SupervisorStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerRight: headerProfileButton(navigation),
      })}
    >
      <Stack.Screen name="ReviewQueue" component={ReviewQueueScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="ReviewDetail" component={ReviewDetailScreen} options={{ title: 'Review Proposal' }} />
    </Stack.Navigator>
  );
}
