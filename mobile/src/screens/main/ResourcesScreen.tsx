import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import resourceApi from '../../api/resource';

interface Resource {
  id: string;
  title: string;
  description: string;
  resourceType: 'hall_of_fame' | 'material';
  linkUrl?: string;
}

export default function ResourcesScreen() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hall_of_fame' | 'material'>('hall_of_fame');

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        const response = await resourceApi.get(`/?type=${activeTab}`);
        setResources(response.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, [activeTab]);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View className="pt-14 pb-4 px-6 bg-brand-orange rounded-b-3xl">
        <Text className="text-3xl font-bold text-white">Resources</Text>
        <Text className="text-orange-100 mt-1">Hall of Fame & Learning Materials</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row mx-4 my-6 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
        <TouchableOpacity 
          className={`flex-1 py-3 rounded-lg items-center ${activeTab === 'hall_of_fame' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
          onPress={() => setActiveTab('hall_of_fame')}
        >
          <Text className={`font-bold ${activeTab === 'hall_of_fame' ? 'text-brand-orange dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>🏆 Hall of Fame</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-3 rounded-lg items-center ${activeTab === 'material' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
          onPress={() => setActiveTab('material')}
        >
          <Text className={`font-bold ${activeTab === 'material' ? 'text-brand-orange dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>📚 Materials</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#F97316" className="mt-10" />
      ) : (
        <FlatList
          data={resources}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View className="bg-white dark:bg-slate-800 p-5 rounded-2xl mb-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <Text className="text-xl font-bold text-slate-900 dark:text-white mb-2">{item.title}</Text>
              <Text className="text-slate-600 dark:text-slate-300 mb-4">{item.description}</Text>
              {item.linkUrl && (
                <TouchableOpacity 
                  className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl items-center"
                  onPress={() => Linking.openURL(item.linkUrl!)}
                >
                  <Text className="text-indigo-600 dark:text-indigo-400 font-bold">View External Link →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center mt-10">
              <Text className="text-slate-400 text-lg">No resources found for this category.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
