import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import React from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '../theme';

// Profile/Settings live on the root stack, but this button is used from
// both the top-level Tab.Navigator and nested stacks underneath individual
// tabs (Proposal, Tasks, Admin, Showcase, Supervisor) — those are nested at
// different depths, so walk all the way up rather than hardcoding a level
// count that would break depending on which stack renders it.
function rootNavigation(navigation: NavigationProp<ParamListBase>): NavigationProp<ParamListBase> {
  let nav = navigation;
  while (nav.getParent()) {
    nav = nav.getParent()!;
  }
  return nav;
}

export function headerProfileButton(navigation: NavigationProp<ParamListBase>) {
  return function ProfileHeaderButton() {
    const { colors } = useTheme();
    return (
      <Pressable
        onPress={() => rootNavigation(navigation).navigate('Profile' as never)}
        hitSlop={10}
        style={{ marginRight: 16 }}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
      >
        <Ionicons name="person-circle-outline" size={26} color={colors.text} />
      </Pressable>
    );
  };
}
