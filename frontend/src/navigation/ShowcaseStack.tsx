import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ShowcaseDetailScreen from '../screens/showcase/ShowcaseDetailScreen';
import ShowcaseEditScreen from '../screens/showcase/ShowcaseEditScreen';
import ShowcaseGalleryScreen from '../screens/showcase/ShowcaseGalleryScreen';
import { useTheme } from '../theme';
import { headerProfileButton } from './headerProfileButton';
import { ShowcaseStackParamList } from './types';

const Stack = createNativeStackNavigator<ShowcaseStackParamList>();

export default function ShowcaseStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerRight: headerProfileButton(navigation),
      })}
    >
      <Stack.Screen name="ShowcaseGallery" component={ShowcaseGalleryScreen} options={{ title: 'Showcase' }} />
      <Stack.Screen name="ShowcaseDetail" component={ShowcaseDetailScreen} options={{ title: 'Project' }} />
      <Stack.Screen name="ShowcaseEdit" component={ShowcaseEditScreen} options={{ title: 'Showcase Entry' }} />
    </Stack.Navigator>
  );
}
