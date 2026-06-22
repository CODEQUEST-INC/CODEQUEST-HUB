import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import authApi from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.post('/login', { email, password });
      const { token, user } = response.data.data;
      await login(token, user);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-50 dark:bg-slate-900 justify-center px-6"
    >
      <View className="mb-10">
        <Text className="text-4xl font-bold text-brand-purple dark:text-brand-lightPurple mb-2">Welcome Back</Text>
        <Text className="text-slate-500 dark:text-slate-400 text-lg">Sign in to continue to CodeQuestHub</Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-slate-700 dark:text-slate-300 font-medium mb-1 ml-1">Email Address</Text>
          <TextInput
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white"
            placeholder="Enter your email"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View>
          <Text className="text-slate-700 dark:text-slate-300 font-medium mb-1 ml-1 mt-4">Password</Text>
          <View className="relative justify-center">
            <TextInput
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 pr-12 text-slate-900 dark:text-white"
              placeholder="Enter your password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              className="absolute right-4" 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          className="w-full bg-brand-purple rounded-xl p-4 items-center mt-6 shadow-sm"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Sign In</Text>
          )}
        </TouchableOpacity>
        
        <View className="flex-row justify-center mt-4">
          <Text className="text-slate-500 dark:text-slate-400">Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text className="text-brand-orange font-bold">Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
