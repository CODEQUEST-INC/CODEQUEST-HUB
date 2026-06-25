import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import authApi from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.post('/register', { 
        fullName: name, 
        email, 
        password,
        role: 'student' // default for now
      });
      const { token, user } = response.data.data;
      await login(token, user);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-50 dark:bg-slate-900"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <View className="mb-10 mt-10">
          <Text className="text-4xl font-bold text-brand-purple dark:text-brand-lightPurple mb-2">Create Account</Text>
          <Text className="text-slate-500 dark:text-slate-400 text-lg">Join CodeQuestHub today</Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-slate-700 dark:text-slate-300 font-medium mb-1 ml-1">Full Name</Text>
            <TextInput
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white"
              placeholder="Enter your full name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View>
            <Text className="text-slate-700 dark:text-slate-300 font-medium mb-1 ml-1 mt-4">Email Address</Text>
            <TextInput
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white"
              placeholder="Enter your KNUST email"
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
                placeholder="Create a password"
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
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            className="w-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-4 items-center mt-3 shadow-sm"
            onPress={() => {
              // Bypass auth for testing Phase 2 UI
              login('dummy-token', { id: 'test-user', email: 'tester@knust.edu.gh', role: 'student' });
            }}
          >
            <Text className="text-slate-700 dark:text-slate-300 font-bold text-base">Test UI (Skip Registration)</Text>
          </TouchableOpacity>
          
          <View className="flex-row justify-center mt-4">
            <Text className="text-slate-500 dark:text-slate-400">Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text className="text-brand-orange font-bold">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
