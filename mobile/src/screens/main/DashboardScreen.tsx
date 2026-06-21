import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import groupApi from '../../api/group';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const response = await groupApi.get('/me');
        setGroup(response.data.data.group);
      } catch (error: any) {
        // Group might not exist for this user yet
        console.log('No group found or error:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, []);

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View className="bg-brand-purple dark:bg-brand-darkBlue pt-16 pb-8 px-6 rounded-b-3xl shadow-sm">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-brand-lightPurple dark:text-slate-300 text-lg">Welcome back,</Text>
            <Text className="text-white text-3xl font-bold">{user?.email?.split('@')[0] || 'User'}</Text>
          </View>
          <TouchableOpacity 
            onPress={logout}
            className="bg-white/20 dark:bg-black/20 p-2 rounded-full px-4"
          >
            <Text className="text-white font-medium">Log out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="p-6">
        <Text className="text-slate-800 dark:text-white text-xl font-bold mb-4">My Group</Text>
        
        {loading ? (
          <ActivityIndicator className="mt-10" size="large" color="#6E20B8" />
        ) : group ? (
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-slate-800 dark:text-white">{group.name}</Text>
              <View className="bg-brand-purple/10 dark:bg-brand-orange/20 px-3 py-1 rounded-full">
                <Text className="text-brand-purple dark:text-brand-orange font-medium">Cohort {group.cohort_id}</Text>
              </View>
            </View>
            
            <Text className="text-slate-500 dark:text-slate-400 mb-4 text-base">
              {group.description || 'No description provided.'}
            </Text>

            <View className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700">
              <Text className="text-slate-700 dark:text-slate-300 font-bold mb-2">Members ({group.members?.length || 0})</Text>
              {group.members && group.members.length > 0 ? (
                group.members.map((member: any, index: number) => (
                  <View key={index} className="flex-row items-center py-2">
                    <View className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full items-center justify-center mr-3">
                      <Text className="text-slate-600 dark:text-slate-300 font-medium">
                        {member.user?.name ? member.user.name.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-slate-800 dark:text-slate-200 font-medium">{member.user?.name || member.user?.email || 'Unknown'}</Text>
                      <Text className="text-slate-500 dark:text-slate-400 text-xs capitalize">{member.role}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-slate-500 dark:text-slate-400">No members assigned yet.</Text>
              )}
            </View>
          </View>
        ) : (
          <View className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-6 items-center border border-slate-200 dark:border-slate-700 border-dashed">
            <View className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full items-center justify-center mb-4">
              <Text className="text-2xl">👥</Text>
            </View>
            <Text className="text-slate-700 dark:text-slate-300 font-bold text-lg text-center mb-2">Not in a group yet</Text>
            <Text className="text-slate-500 dark:text-slate-400 text-center">
              You haven't been assigned to a CodeQuest group yet. Check back later or contact your supervisor.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
