import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Mock data for Admin Dashboard
const forwardedProposals = [
  {
    id: 'prop-123',
    title: 'CodeQuestHub Mobile App',
    groupName: 'Group 129',
    supervisor: 'Dr. Michael',
    status: 'forwarded_to_admin',
    submittedAt: 'Oct 12, 2026'
  },
  {
    id: 'prop-124',
    title: 'AI Smart Campus System',
    groupName: 'Group 42',
    supervisor: 'Prof. Smith',
    status: 'forwarded_to_admin',
    submittedAt: 'Oct 14, 2026'
  }
];

export default function AdminDashboard({ navigation }: any) {
  const [proposals, setProposals] = useState(forwardedProposals);

  const handleAdminDecision = (id: string, decision: 'approve' | 'reject') => {
    Alert.alert(
      decision === 'approve' ? 'Final Approval' : 'Final Rejection',
      `Are you sure you want to officially ${decision} this proposal? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            setProposals(proposals.filter(p => p.id !== id));
            Alert.alert('Success', `Proposal officially ${decision}d.`);
          }
        }
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900 px-6 py-6">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Admin Portal</Text>
        <Text className="text-slate-500 dark:text-slate-400">Review proposals forwarded by supervisors requiring final administrative decision.</Text>
      </View>

      {proposals.length === 0 ? (
        <View className="items-center justify-center py-12">
          <Ionicons name="checkmark-done-circle-outline" size={64} color="#10b981" />
          <Text className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-4">All Caught Up!</Text>
          <Text className="text-slate-500 text-center mt-2">There are no pending proposals waiting for administrative review.</Text>
        </View>
      ) : (
        <View className="space-y-4 mb-12">
          {proposals.map(proposal => (
            <View key={proposal.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 pr-2">
                  <Text className="text-lg font-bold text-slate-800 dark:text-white" numberOfLines={1}>{proposal.title}</Text>
                  <Text className="text-slate-500 dark:text-slate-400 font-medium">{proposal.groupName}</Text>
                </View>
                <View className="bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-md">
                  <Text className="text-orange-700 dark:text-orange-400 text-xs font-bold uppercase">Forwarded</Text>
                </View>
              </View>

              <View className="flex-row items-center mb-4">
                <Ionicons name="person-outline" size={14} color="#64748b" />
                <Text className="text-slate-500 dark:text-slate-400 text-xs ml-1">Supervisor: {proposal.supervisor}</Text>
                <Text className="text-slate-300 dark:text-slate-600 mx-2">•</Text>
                <Ionicons name="calendar-outline" size={14} color="#64748b" />
                <Text className="text-slate-500 dark:text-slate-400 text-xs ml-1">{proposal.submittedAt}</Text>
              </View>

              <TouchableOpacity 
                className="bg-brand-purple/10 dark:bg-brand-purple/20 p-3 rounded-xl flex-row justify-center items-center mb-4"
                onPress={() => Alert.alert('Opening Document', `Opening full details for ${proposal.title}`)}
              >
                <Ionicons name="document-text" size={18} color="#7c3aed" />
                <Text className="text-brand-purple font-bold ml-2">Review Full Proposal</Text>
              </TouchableOpacity>

              <View className="flex-row space-x-3">
                <TouchableOpacity 
                  className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 items-center"
                  onPress={() => handleAdminDecision(proposal.id, 'reject')}
                >
                  <Text className="text-slate-700 dark:text-slate-200 font-bold">Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 bg-green-500 rounded-xl p-3 items-center"
                  onPress={() => handleAdminDecision(proposal.id, 'approve')}
                >
                  <Text className="text-white font-bold">Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
