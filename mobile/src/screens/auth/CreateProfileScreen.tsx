import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import authApi from '../../api/auth';

export default function CreateProfileScreen() {
  const { user, login, updateUser } = useAuth();
  const [role, setRole] = useState<'student' | 'supervisor' | 'alumni' | 'senior'>('student');
  const [bio, setBio] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [skills, setSkills] = useState('');
  const [mentorshipStatus, setMentorshipStatus] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const socialLinks = {
        ...(github ? { github } : {}),
        ...(linkedin ? { linkedin } : {})
      };
      const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);

      const response = await authApi.patch('/profile', {
        role,
        bio: bio || null,
        socialLinks,
        skills: skillsArray,
        mentorshipStatus
      });

      const { user: updatedUser, token } = response.data.data;
      await login(token, updatedUser);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
      <Text className="text-3xl font-bold text-slate-900 dark:text-white mt-12 mb-2">Build Your Profile</Text>
      <Text className="text-slate-600 dark:text-slate-400 mb-8">Welcome to CodeQuest Hub! Let's get your profile set up so we can customize your dashboard.</Text>

      {/* 1. Identity */}
      <Text className="text-xl font-bold text-slate-900 dark:text-white mb-4">1. I am a...</Text>
      <View className="flex-row flex-wrap gap-3 mb-8">
        {['student', 'supervisor', 'alumni', 'senior'].map(r => (
          <TouchableOpacity 
            key={r}
            onPress={() => setRole(r as any)}
            className={`px-5 py-3 rounded-full border-2 ${role === r ? 'bg-brand-purple border-brand-purple' : 'bg-transparent border-slate-300 dark:border-slate-700'}`}
          >
            <Text className={`font-bold capitalize ${role === r ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 2. Personal Touch */}
      <Text className="text-xl font-bold text-slate-900 dark:text-white mb-4">2. The Personal Touch (Optional)</Text>
      
      <Text className="text-slate-700 dark:text-slate-300 font-bold mb-2">Short Bio</Text>
      <TextInput
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4 text-slate-900 dark:text-white h-24"
        placeholder="Tell us about yourself..."
        placeholderTextColor="#94a3b8"
        multiline
        textAlignVertical="top"
        value={bio}
        onChangeText={setBio}
      />

      <Text className="text-slate-700 dark:text-slate-300 font-bold mb-2">Skills (comma separated)</Text>
      <TextInput
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4 text-slate-900 dark:text-white"
        placeholder="React, Python, Figma..."
        placeholderTextColor="#94a3b8"
        value={skills}
        onChangeText={setSkills}
      />

      <Text className="text-slate-700 dark:text-slate-300 font-bold mb-2">Social Links</Text>
      <TextInput
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-3 text-slate-900 dark:text-white"
        placeholder="GitHub Profile URL"
        placeholderTextColor="#94a3b8"
        value={github}
        onChangeText={setGithub}
        autoCapitalize="none"
      />
      <TextInput
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6 text-slate-900 dark:text-white"
        placeholder="LinkedIn Profile URL"
        placeholderTextColor="#94a3b8"
        value={linkedin}
        onChangeText={setLinkedin}
        autoCapitalize="none"
      />

      {/* 3. Community Status */}
      <Text className="text-xl font-bold text-slate-900 dark:text-white mb-4">3. Community Status</Text>
      <TouchableOpacity 
        className={`p-4 rounded-xl border-2 mb-8 ${mentorshipStatus ? 'bg-brand-orange/10 border-brand-orange' : 'bg-transparent border-slate-300 dark:border-slate-700'}`}
        onPress={() => setMentorshipStatus(!mentorshipStatus)}
      >
        <Text className={`font-bold ${mentorshipStatus ? 'text-brand-orange' : 'text-slate-600 dark:text-slate-400'}`}>
          {role === 'student' ? '🎓 I am looking for Mentorship' : '🤝 I am available to Mentor'}
        </Text>
      </TouchableOpacity>

      {/* Submit */}
      <TouchableOpacity 
        className="w-full bg-brand-purple rounded-xl p-5 items-center shadow-lg shadow-brand-purple/50 flex-row justify-center mb-4"
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-lg">Complete Profile</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        className="w-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-5 items-center shadow-sm"
        onPress={() => {
          if (user) {
            updateUser({ ...user, profileCompleted: true });
          }
        }}
        disabled={loading}
      >
        <Text className="text-slate-700 dark:text-slate-300 font-bold text-lg">Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
