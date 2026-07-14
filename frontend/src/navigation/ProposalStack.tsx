import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ProposalFormScreen from '../screens/proposal/ProposalFormScreen';
import ProposalHistoryScreen from '../screens/proposal/ProposalHistoryScreen';
import ProposalStatusScreen from '../screens/proposal/ProposalStatusScreen';
import { ProposalStackParamList } from './types';

const Stack = createNativeStackNavigator<ProposalStackParamList>();

export default function ProposalStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ProposalStatus" component={ProposalStatusScreen} options={{ title: 'My Proposal' }} />
      <Stack.Screen name="ProposalForm" component={ProposalFormScreen} options={{ title: 'Proposal' }} />
      <Stack.Screen name="ProposalHistory" component={ProposalHistoryScreen} options={{ title: 'History' }} />
    </Stack.Navigator>
  );
}
