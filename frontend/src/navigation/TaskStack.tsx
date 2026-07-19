import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import TaskBoardScreen from '../screens/tasks/TaskBoardScreen';
import TaskFormScreen from '../screens/tasks/TaskFormScreen';
import { useTheme } from '../theme';
import { headerProfileButton } from './headerProfileButton';
import { TaskStackParamList } from './types';

const Stack = createNativeStackNavigator<TaskStackParamList>();

export default function TaskStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerRight: headerProfileButton(navigation),
      })}
    >
      <Stack.Screen name="TaskBoard" component={TaskBoardScreen} options={{ title: 'Tasks' }} />
      <Stack.Screen name="TaskForm" component={TaskFormScreen} options={{ title: 'Task' }} />
    </Stack.Navigator>
  );
}
