import React from 'react';
import { KeyboardAvoidingView, Platform, StyleProp, ViewStyle } from 'react-native';

// Wraps a screen's form content so the keyboard never covers the focused
// input. "padding" resizes the view on iOS (which doesn't do this itself);
// Android already resizes via the default adjustResize window mode, so
// "height" here only needs to nudge scrollable content, not the whole screen.
export default function KeyboardAvoidingScreen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
