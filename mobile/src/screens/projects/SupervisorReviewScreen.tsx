import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Mock data for Phase 2 MVP
const mockProposal = {
  id: 'prop-123',
  title: 'CodeQuestHub Mobile App',
  problemStatement: 'Students lack a centralized platform to manage project phases, leading to fragmented communication and lost documents.',
  proposedSolution: 'A mobile-first platform featuring real-time project tracking, document sharing, and supervisor feedback integration.',
  techStack: 'React Native, Node.js, PostgreSQL',
  status: 'pending', 
  documentName: 'CQH_Proposal_v1.pdf',
  documentUrl: 'https://example.com/docs/cqh_v1.pdf',
  groupName: 'Group 129'
};

export default function SupervisorReviewScreen({ navigation }: any) {
  const [proposal, setProposal] = useState<any>(mockProposal);
  const [loading, setLoading] = useState(false);

  const handleAction = (action: string) => {
    let title = '';
    let message = '';
    let newStatus = '';

    if (action === 'approve') {
      title = 'Approve Proposal';
      message = 'Are you sure you want to approve this proposal?';
      newStatus = 'approved';
    } else if (action === 'reject') {
      title = 'Reject Proposal';
      message = 'Are you sure you want to reject this proposal?';
      newStatus = 'rejected';
    } else if (action === 'forward') {
      title = 'Forward to Admin';
      message = 'Are you sure you want to forward this proposal to the Admin for final review?';
      newStatus = 'forwarded_to_admin';
    }

    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            setLoading(true);
            setTimeout(() => {
              setProposal({ ...proposal, status: newStatus });
              setLoading(false);
              Alert.alert('Success', `Proposal has been ${newStatus.replace('_', ' ')}.`);
            }, 1000);
          }
        }
      ]
    );
  };

  const handleDownload = () => {
    Alert.alert('Opening Document...', `Viewing ${proposal.documentName}`);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900 px-6 py-6">
      <View className="mb-6">
        <View className="flex-row items-center mb-2">
          <Ionicons name="people" size={20} color="#64748b" />
          <Text className="text-slate-500 dark:text-slate-400 font-medium ml-2">{proposal.groupName}</Text>
        </View>
        <Text className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{proposal.title}</Text>
        <View className="self-start px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
          <Text className="text-blue-700 dark:text-blue-400 font-bold uppercase text-xs">Awaiting Review</Text>
        </View>
      </View>

      <Text className="text-lg font-bold text-slate-800 dark:text-white mb-3">Attached Document</Text>
      <TouchableOpacity 
        onPress={handleDownload}
        className="flex-row items-center justify-between bg-white dark:bg-slate-800 border border-brand-purple/30 dark:border-brand-purple/50 rounded-xl p-4 mb-8 shadow-sm"
      >
        <View className="flex-row items-center flex-1">
          <View className="bg-brand-purple/10 p-2 rounded-lg">
            <Ionicons name="document-text" size={24} color="#7c3aed" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-slate-800 dark:text-white font-bold" numberOfLines={1}>{proposal.documentName}</Text>
            <Text className="text-brand-purple text-sm font-medium mt-1">Tap to read document</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 mb-8">
        <Text className="text-lg font-bold text-slate-800 dark:text-white mb-2">Problem Statement</Text>
        <Text className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">{proposal.problemStatement}</Text>
        
        <Text className="text-lg font-bold text-slate-800 dark:text-white mb-2">Proposed Solution</Text>
        <Text className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">{proposal.proposedSolution}</Text>
        
        <Text className="text-lg font-bold text-slate-800 dark:text-white mb-2">Tech Stack</Text>
        <Text className="text-slate-600 dark:text-slate-300 leading-relaxed">{proposal.techStack}</Text>
      </View>

      <Text className="text-lg font-bold text-slate-800 dark:text-white mb-4">Supervisor Actions</Text>
      
      <View className="flex-row space-x-4 mb-4">
        <TouchableOpacity 
          className="flex-1 bg-green-500 rounded-xl p-4 flex-row justify-center items-center shadow-sm"
          onPress={() => handleAction('approve')}
        >
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text className="text-white font-bold ml-2">Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="flex-1 bg-red-500 rounded-xl p-4 flex-row justify-center items-center shadow-sm"
          onPress={() => handleAction('reject')}
        >
          <Ionicons name="close-circle" size={20} color="white" />
          <Text className="text-white font-bold ml-2">Reject</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        className="w-full bg-slate-800 dark:bg-slate-700 rounded-xl p-4 flex-row justify-center items-center shadow-sm mb-12"
        onPress={() => handleAction('forward')}
      >
        <Ionicons name="arrow-forward-circle" size={20} color="white" />
        <Text className="text-white font-bold ml-2">Forward to Admin</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}
