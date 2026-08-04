import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ProposalFormScreen from '../screens/proposal/ProposalFormScreen';
import ProposalStatusScreen from '../screens/proposal/ProposalStatusScreen';
import { useTheme } from '../theme';
import { headerProfileButton } from './headerProfileButton';
import { ProposalStackParamList } from './types';

const Stack = createNativeStackNavigator<ProposalStackParamList>();

export default function ProposalStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerRight: headerProfileButton(navigation),
      })}
    >
      <Stack.Screen name="ProposalStatus" component={ProposalStatusScreen} options={{ title: 'My Proposal' }} />
      <Stack.Screen name="ProposalForm" component={ProposalFormScreen} options={{ title: 'Proposal' }} />
    </Stack.Navigator>
  );
}
