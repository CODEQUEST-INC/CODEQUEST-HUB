import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import projectApi from '../../api/project';

export default function ProposalSubmissionScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');
  const [techStack, setTechStack] = useState('');
  const [document, setDocument] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setDocument(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleSubmit = async () => {
    if (!title || !problemStatement || !proposedSolution || !document) {
      Alert.alert('Error', 'Please fill in all required fields and upload a proposal document.');
      return;
    }

    setLoading(true);
    try {
      // In a real app, you would use FormData to upload the file along with the data.
      // For this MVP, we will simulate the submission payload.
      const formData = new FormData();
      formData.append('title', title);
      formData.append('problemStatement', problemStatement);
      formData.append('proposedSolution', proposedSolution);
      formData.append('techStack', techStack);
      
      // Append the file
      formData.append('file', {
        uri: document.uri,
        name: document.name,
        type: document.mimeType || 'application/octet-stream'
      } as any);

      // await projectApi.post('/proposals', formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' }
      // });
      
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert('Success', 'Proposal submitted successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('ProposalStatus') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit proposal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900 px-6 py-8">
      <Text className="text-3xl font-bold text-brand-purple dark:text-brand-lightPurple mb-2">Submit Proposal</Text>
      <Text className="text-slate-500 dark:text-slate-400 text-base mb-8">Fill out the details of your group's project proposal and attach the official document.</Text>

      <View className="space-y-4 mb-8">
        <View>
          <Text className="text-slate-700 dark:text-slate-300 font-medium mb-1 ml-1">Project Title *</Text>
          <TextInput
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white"
            placeholder="e.g. CodeQuestHub"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View>
          <Text className="text-slate-700 dark:text-slate-300 font-medium mb-1 ml-1 mt-4">Problem Statement *</Text>
          <TextInput
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white"
            placeholder="What problem are you solving?"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            value={problemStatement}
            onChangeText={setProblemStatement}
          />
        </View>

        <View>
          <Text className="text-slate-700 dark:text-slate-300 font-medium mb-1 ml-1 mt-4">Proposed Solution *</Text>
          <TextInput
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white"
            placeholder="How does your app solve it?"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={proposedSolution}
            onChangeText={setProposedSolution}
          />
        </View>

        <View>
          <Text className="text-slate-700 dark:text-slate-300 font-medium mb-1 ml-1 mt-4">Tech Stack</Text>
          <TextInput
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white"
            placeholder="e.g. React Native, Node.js"
            placeholderTextColor="#94a3b8"
            value={techStack}
            onChangeText={setTechStack}
          />
        </View>

        <View>
          <Text className="text-slate-700 dark:text-slate-300 font-medium mb-1 ml-1 mt-4">Proposal Document (PDF/Docx) *</Text>
          {document ? (
            <View className="flex-row items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <View className="flex-row items-center flex-1">
                <Ionicons name="document-text" size={24} color="#10b981" />
                <Text className="text-slate-700 dark:text-slate-300 font-medium ml-3 flex-1" numberOfLines={1}>{document.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setDocument(null)}>
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              className="w-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 items-center justify-center"
              onPress={handlePickDocument}
            >
              <Ionicons name="cloud-upload-outline" size={40} color="#94a3b8" />
              <Text className="text-slate-500 dark:text-slate-400 font-medium mt-2">Tap to upload document</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity 
        className="w-full bg-brand-purple rounded-xl p-4 items-center mb-12 shadow-sm"
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-lg">Submit Proposal</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
