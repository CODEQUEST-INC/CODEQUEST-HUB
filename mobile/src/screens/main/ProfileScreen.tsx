import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerStyle={{ padding: 24 }}>
      <View className="items-center mt-8 mb-8">
        <View className="w-24 h-24 bg-brand-purple rounded-full items-center justify-center mb-4">
          <Text className="text-white text-3xl font-bold">{user?.email?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">
          {user?.id ? 'CodeQuest Member' : 'Guest User'}
        </Text>
        <Text className="text-slate-500 dark:text-slate-400 mt-1">{user?.email}</Text>
        <View className="bg-brand-orange/20 px-3 py-1 rounded-full mt-2">
          <Text className="text-brand-orange font-bold uppercase text-xs">{user?.role || 'Student'}</Text>
        </View>
      </View>

      <View className="space-y-4">
        {/* Settings Block */}
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
          <Text className="text-slate-900 dark:text-white font-bold text-lg mb-4">Preferences</Text>
          
          <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full items-center justify-center mr-3">
                <Ionicons name="moon" size={20} color="#94a3b8" />
              </View>
              <Text className="text-slate-700 dark:text-slate-300 font-medium">Dark Mode</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full items-center justify-center mr-3">
                <Ionicons name="notifications" size={20} color="#94a3b8" />
              </View>
              <Text className="text-slate-700 dark:text-slate-300 font-medium">Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center justify-between py-3"
            onPress={() => navigation.navigate('EditProfile' as never)}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full items-center justify-center mr-3">
                <Ionicons name="person" size={20} color="#94a3b8" />
              </View>
              <Text className="text-slate-700 dark:text-slate-300 font-medium">Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity 
          className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 flex-row items-center justify-center border border-red-100 dark:border-red-900/30 mt-4"
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={24} color="#ef4444" style={{ marginRight: 8 }} />
          <Text className="text-red-500 font-bold text-lg">Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
