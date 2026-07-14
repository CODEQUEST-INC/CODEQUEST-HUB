import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import TaskBoardScreen from '../screens/tasks/TaskBoardScreen';
import TaskFormScreen from '../screens/tasks/TaskFormScreen';
import { TaskStackParamList } from './types';

const Stack = createNativeStackNavigator<TaskStackParamList>();

export default function TaskStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TaskBoard" component={TaskBoardScreen} options={{ title: 'Tasks' }} />
      <Stack.Screen name="TaskForm" component={TaskFormScreen} options={{ title: 'Task' }} />
    </Stack.Navigator>
  );
}
