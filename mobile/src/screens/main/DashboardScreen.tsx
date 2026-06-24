import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import groupApi from '../../api/group';

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View className="bg-brand-purple dark:bg-brand-darkBlue pt-16 pb-8 px-6 rounded-b-3xl shadow-sm">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-brand-lightPurple dark:text-slate-300 text-lg">Welcome back,</Text>
            <Text className="text-white text-3xl font-bold">{user?.email?.split('@')[0] || 'User'}</Text>
            <View className="flex-row items-center mt-1">
              <View className="bg-white/20 px-2 py-1 rounded-md mr-2">
                <Text className="text-white text-xs font-bold capitalize">{user?.role}</Text>
              </View>
            </View>
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
        {user?.role === 'student' && <StudentDashboard navigation={navigation} />}
        {user?.role === 'supervisor' && <SupervisorDashboard navigation={navigation} />}
        {(user?.role === 'alumni' || user?.role === 'senior') && <AlumniCreatorStudio navigation={navigation} />}
        {user?.role === 'admin' && <AdminDashboardView navigation={navigation} />}
      </View>
    </ScrollView>
  );
}

// ==========================================
// Student Dashboard
// ==========================================
function StudentDashboard({ navigation }: any) {
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const response = await groupApi.get('/me');
        setGroup(response.data.data.group);
      } catch (error) {
        console.log('No group found');
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, []);

  return (
    <View>
      <Text className="text-slate-800 dark:text-white text-xl font-bold mb-4">My Group Workspace</Text>
      
      {loading ? (
        <ActivityIndicator className="mt-10" size="large" color="#6E20B8" />
      ) : group ? (
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold text-slate-800 dark:text-white">{group.name}</Text>
            <View className="bg-brand-purple/10 dark:bg-brand-orange/20 px-3 py-1 rounded-full">
              <Text className="text-brand-purple dark:text-brand-orange font-medium">Cohort {group.cohort_id}</Text>
            </View>
          </View>
          <Text className="text-slate-500 dark:text-slate-400 mb-4 text-base">
            {group.description || 'No description provided.'}
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity 
              className="flex-1 bg-brand-purple rounded-xl py-3 items-center"
              onPress={() => navigation.navigate('KanbanBoard')}
            >
              <Text className="text-white font-bold">Tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-1 bg-blue-500 rounded-xl py-3 items-center"
              onPress={() => navigation.navigate('ProposalStatus')}
            >
              <Text className="text-white font-bold">Proposal</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-6 items-center border border-slate-200 dark:border-slate-700 border-dashed mb-6">
          <Text className="text-slate-700 dark:text-slate-300 font-bold text-lg text-center mb-2">Not in a group yet</Text>
          <Text className="text-slate-500 dark:text-slate-400 text-center">
            You haven't been assigned to a CodeQuest group yet. Check back later.
          </Text>
        </View>
      )}

      <Text className="text-slate-800 dark:text-white text-xl font-bold mb-4">CodeQuest Ecosystem</Text>
      <View className="flex-row space-x-3 mb-6">
        <TouchableOpacity 
          className="flex-1 bg-teal-500 rounded-xl p-4 items-center justify-center shadow-sm"
          onPress={() => navigation.navigate('Community')}
        >
          <Text className="text-white font-bold text-base text-center">💬 Community Hub</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className="flex-1 bg-brand-orange rounded-xl p-4 items-center justify-center shadow-sm"
          onPress={() => navigation.navigate('Resources')}
        >
          <Text className="text-white font-bold text-base text-center">📚 Resources & Hall of Fame</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==========================================
// Supervisor Dashboard
// ==========================================
function SupervisorDashboard({ navigation }: any) {
  return (
    <View>
      <Text className="text-slate-800 dark:text-white text-xl font-bold mb-4">Supervisor Insights</Text>
      <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <Text className="text-slate-500 dark:text-slate-400 text-center mb-4">View and review all proposals submitted by your assigned groups.</Text>
        <TouchableOpacity 
          className="w-full bg-blue-500 rounded-xl p-4 items-center flex-row justify-center shadow-sm"
          onPress={() => navigation.navigate('SupervisorReview')}
        >
          <Text className="text-white font-bold text-base">Review Proposals</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-slate-800 dark:text-white text-xl font-bold mb-4">Group Progress Alerts</Text>
      <View className="bg-brand-orange/10 border border-brand-orange rounded-2xl p-4 flex-row items-center">
        <Text className="text-2xl mr-3">⚠️</Text>
        <View className="flex-1">
          <Text className="text-slate-900 dark:text-white font-bold">Group 4 is falling behind</Text>
          <Text className="text-slate-600 dark:text-slate-400 text-sm">No tasks moved to 'Done' in 7 days.</Text>
        </View>
      </View>
    </View>
  );
}

// ==========================================
// Alumni Creator Studio
// ==========================================
function AlumniCreatorStudio({ navigation }: any) {
  return (
    <View>
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-slate-800 dark:text-white text-xl font-bold">Creator Studio</Text>
        <View className="bg-brand-purple/10 px-3 py-1 rounded-full">
          <Text className="text-brand-purple font-bold text-xs">MONETIZATION ACTIVE</Text>
        </View>
      </View>
      
      <View className="flex-row space-x-3 mb-6">
        <View className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">TOTAL EARNINGS</Text>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">GHS 1,250</Text>
        </View>
        <View className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">PREMIUM SALES</Text>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">34</Text>
        </View>
      </View>

      <Text className="text-slate-800 dark:text-white text-lg font-bold mb-4">Share Content</Text>
      <View className="space-y-3 mb-8">
        <TouchableOpacity 
          className="w-full bg-teal-500 rounded-xl p-4 items-center flex-row justify-center shadow-sm"
          onPress={() => navigation.navigate('Community')}
        >
          <Text className="text-white font-bold text-base">💬 Post to Community Hub</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="w-full bg-brand-orange rounded-xl p-4 items-center flex-row justify-center shadow-sm mt-3"
          onPress={() => navigation.navigate('Resources')}
        >
          <Text className="text-white font-bold text-base">📚 Upload Premium Material</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-slate-800 dark:text-white text-lg font-bold mb-4">Marketing</Text>
      <TouchableOpacity 
        className="w-full bg-slate-900 dark:bg-slate-800 border border-slate-700 rounded-xl p-4 flex-row items-center shadow-sm"
        onPress={() => Alert.alert('Promote Post', 'This will integrate with the Paystack Checkout to purchase a sponsored post slot.')}
      >
        <Text className="text-2xl mr-3">📢</Text>
        <View>
          <Text className="text-white font-bold text-base">Buy a Promoted Post</Text>
          <Text className="text-slate-400 text-sm">Boost your tutorial to the entire student body</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ==========================================
// Admin Dashboard
// ==========================================
function AdminDashboardView({ navigation }: any) {
  return (
    <View>
      <Text className="text-slate-800 dark:text-white text-xl font-bold mb-4">Admin Controls</Text>
      <TouchableOpacity 
        className="w-full bg-slate-800 dark:bg-slate-700 rounded-xl p-4 items-center flex-row justify-center shadow-sm mb-4"
        onPress={() => navigation.navigate('AdminDashboard')}
      >
        <Text className="text-white font-bold text-base">Final Proposal Approvals</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        className="w-full bg-teal-500 rounded-xl p-4 items-center flex-row justify-center shadow-sm"
        onPress={() => navigation.navigate('Community')}
      >
        <Text className="text-white font-bold text-base">Community Hub</Text>
      </TouchableOpacity>
    </View>
  );
}
