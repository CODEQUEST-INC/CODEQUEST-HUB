import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ReviewDetailScreen from '../screens/supervisor/ReviewDetailScreen';
import ReviewQueueScreen from '../screens/supervisor/ReviewQueueScreen';
import { SupervisorStackParamList } from './types';

const Stack = createNativeStackNavigator<SupervisorStackParamList>();

export default function SupervisorStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ReviewQueue" component={ReviewQueueScreen} options={{ title: 'Review Queue' }} />
      <Stack.Screen name="ReviewDetail" component={ReviewDetailScreen} options={{ title: 'Review Proposal' }} />
    </Stack.Navigator>
  );
}
