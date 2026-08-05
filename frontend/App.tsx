import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { fixWebAutofillStyling } from './src/utils/webAutofillFix';

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

fixWebAutofillStyling();

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
        <ThemedStatusBar />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
