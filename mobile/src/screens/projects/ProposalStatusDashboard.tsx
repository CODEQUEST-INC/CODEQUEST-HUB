import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import projectApi from '../../api/project';

// Mock data for Phase 2 MVP
const mockProposal = {
  id: 'prop-123',
  title: 'CodeQuestHub Mobile App',
  problemStatement: 'Students lack a centralized platform to manage project phases, leading to fragmented communication and lost documents.',
  proposedSolution: 'A mobile-first platform featuring real-time project tracking, document sharing, and supervisor feedback integration.',
  techStack: 'React Native, Node.js, PostgreSQL',
  status: 'pending', // 'pending', 'approved', 'rejected'
  documentName: 'CQH_Proposal_v1.pdf',
  documentUrl: 'https://example.com/docs/cqh_v1.pdf',
  supervisorFeedback: ''
};

export default function ProposalStatusDashboard({ navigation }: any) {
  const [proposal, setProposal] = useState<any>(mockProposal);
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Proposal',
      'Are you sure you want to delete this proposal? You will need to submit a new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            // await projectApi.delete(`/proposals/${proposal.id}`);
            setTimeout(() => {
              setProposal(null);
              setLoading(false);
              Alert.alert('Deleted', 'Your proposal has been removed.');
            }, 1000);
          }
        }
      ]
    );
  };

  const handleDownload = () => {
    Alert.alert('Downloading...', `Downloading ${proposal.documentName}`);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (!proposal) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900 justify-center items-center px-6">
        <Ionicons name="document-text-outline" size={80} color="#cbd5e1" />
        <Text className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-4 text-center">No Proposal Found</Text>
        <Text className="text-slate-500 dark:text-slate-400 text-center mt-2 mb-8">Your group hasn't submitted a project proposal yet.</Text>
        <TouchableOpacity 
          className="bg-brand-purple rounded-xl py-3 px-8 shadow-sm"
          onPress={() => navigation.navigate('SubmitProposal')}
        >
          <Text className="text-white font-bold text-lg">Submit Proposal</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900 px-6 py-6">
      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-1 pr-4">
          <Text className="text-3xl font-bold text-brand-purple dark:text-brand-lightPurple mb-1">{proposal.title}</Text>
          <Text className="text-slate-500 dark:text-slate-400">Submitted by Group 129</Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${
          proposal.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30' : 
          proposal.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30' : 
          'bg-yellow-100 dark:bg-yellow-900/30'
        }`}>
          <Text className={`font-bold capitalize ${
            proposal.status === 'approved' ? 'text-green-700 dark:text-green-400' : 
            proposal.status === 'rejected' ? 'text-red-700 dark:text-red-400' : 
            'text-yellow-700 dark:text-yellow-400'
          }`}>
            {proposal.status}
          </Text>
        </View>
      </View>

      {proposal.status === 'rejected' && proposal.supervisorFeedback && (
        <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
          <Text className="text-red-800 dark:text-red-300 font-bold mb-1">Supervisor Feedback</Text>
          <Text className="text-red-700 dark:text-red-400">{proposal.supervisorFeedback}</Text>
        </View>
      )}

      <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
        <Text className="text-lg font-bold text-slate-800 dark:text-white mb-2">Problem Statement</Text>
        <Text className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">{proposal.problemStatement}</Text>
        
        <Text className="text-lg font-bold text-slate-800 dark:text-white mb-2">Proposed Solution</Text>
        <Text className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">{proposal.proposedSolution}</Text>
        
        <Text className="text-lg font-bold text-slate-800 dark:text-white mb-2">Tech Stack</Text>
        <Text className="text-slate-600 dark:text-slate-300 leading-relaxed">{proposal.techStack}</Text>
      </View>

      <Text className="text-lg font-bold text-slate-800 dark:text-white mb-3">Attached Document</Text>
      <View className="flex-row items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-8 shadow-sm">
        <View className="flex-row items-center flex-1">
          <Ionicons name="document-text" size={24} color="#10b981" />
          <Text className="text-slate-700 dark:text-slate-300 font-medium ml-3 flex-1" numberOfLines={1}>{proposal.documentName}</Text>
        </View>
        <TouchableOpacity onPress={handleDownload} className="ml-2 bg-slate-100 dark:bg-slate-700 p-2 rounded-full">
          <Ionicons name="download-outline" size={20} color="#7c3aed" />
        </TouchableOpacity>
      </View>

      {proposal.status === 'pending' && (
        <TouchableOpacity 
          className="w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 items-center mb-12 flex-row justify-center"
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
          <Text className="text-red-600 dark:text-red-400 font-bold text-lg ml-2">Delete Proposal</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
