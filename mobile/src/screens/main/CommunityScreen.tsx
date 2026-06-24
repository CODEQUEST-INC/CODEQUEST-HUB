import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, Linking } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import communityApi from '../../api/community';

interface Post {
  id: string;
  authorName: string;
  title: string;
  content: string;
  category: 'discussion' | 'tutorial' | 'help' | 'announcement';
  linkUrl?: string;
  isPromoted?: boolean;
  createdAt: string;
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'discussion' | 'tutorial' | 'help' | 'announcement'>('discussion');
  const [linkUrl, setLinkUrl] = useState('');

  const fetchPosts = async () => {
    try {
      const url = activeFilter ? `/?category=${activeFilter}` : '/';
      const response = await communityApi.get(url);
      setPosts(response.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeFilter]);

  const handleCreatePost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in Title and Content');
      return;
    }
    try {
      await communityApi.post('/', { title, content, category, linkUrl: linkUrl || null });
      setModalVisible(false);
      setTitle('');
      setContent('');
      setCategory('discussion');
      setLinkUrl('');
      fetchPosts();
    } catch (error) {
      Alert.alert('Error', 'Failed to create post');
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'tutorial': return 'bg-brand-orange text-white';
      case 'help': return 'bg-red-500 text-white';
      case 'announcement': return 'bg-blue-500 text-white';
      default: return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300';
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View className="pt-14 pb-4 px-6 bg-brand-purple rounded-b-3xl">
        <Text className="text-3xl font-bold text-white">Community</Text>
        <Text className="text-brand-lightPurple mt-1">Connect, share, and learn together.</Text>
      </View>

      {/* Filters */}
      <View className="flex-row px-4 py-4 space-x-2">
        <TouchableOpacity 
          onPress={() => setActiveFilter(null)}
          className={`px-4 py-2 rounded-full ${activeFilter === null ? 'bg-slate-800 dark:bg-white' : 'bg-slate-200 dark:bg-slate-800'}`}
        >
          <Text className={`font-medium ${activeFilter === null ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'}`}>All</Text>
        </TouchableOpacity>
        {['discussion', 'tutorial', 'help'].map(cat => (
          <TouchableOpacity 
            key={cat}
            onPress={() => setActiveFilter(cat)}
            className={`px-4 py-2 rounded-full ${activeFilter === cat ? 'bg-slate-800 dark:bg-white' : 'bg-slate-200 dark:bg-slate-800'}`}
          >
            <Text className={`font-medium capitalize ${activeFilter === cat ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'}`}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6E20B8" className="mt-10" />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
              <View className={`bg-white dark:bg-slate-800 p-5 rounded-2xl mb-4 shadow-sm border ${item.isPromoted ? 'border-brand-orange bg-brand-orange/5 dark:bg-brand-orange/10' : 'border-slate-100 dark:border-slate-700'}`}>
                {item.isPromoted && (
                  <View className="flex-row items-center mb-2">
                    <Text className="text-brand-orange text-xs font-bold uppercase tracking-wider">🌟 Promoted</Text>
                  </View>
                )}
                <View className="flex-row justify-between items-start mb-2">
                  <View>
                    <Text className="text-lg font-bold text-slate-900 dark:text-white">{item.title}</Text>
                    <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">By {item.authorName}</Text>
                  </View>
                  <View className={`px-2 py-1 rounded-md ${getCategoryColor(item.category).split(' ')[0]}`}>
                    <Text className={`text-xs font-bold capitalize ${getCategoryColor(item.category).split(' ')[1]}`}>{item.category}</Text>
                  </View>
                </View>
              <Text className="text-slate-700 dark:text-slate-300 my-3 leading-6">{item.content}</Text>
              {item.linkUrl && (
                <TouchableOpacity onPress={() => Linking.openURL(item.linkUrl!)}>
                  <Text className="text-blue-500 font-bold mt-2">External Link →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={<Text className="text-center text-slate-500 mt-10">No posts in this category yet.</Text>}
        />
      )}

      {/* FAB */}
      <TouchableOpacity 
        className="absolute bottom-6 right-6 w-14 h-14 bg-brand-orange rounded-full items-center justify-center shadow-lg shadow-brand-orange/50"
        onPress={() => setModalVisible(true)}
      >
        <Text className="text-white text-3xl font-light mb-1">+</Text>
      </TouchableOpacity>

      {/* Create Post Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 h-[85%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-slate-900 dark:text-white">New Post</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text className="text-slate-400 font-bold text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row space-x-2 mb-6">
              {['discussion', 'tutorial', 'help'].map(cat => (
                <TouchableOpacity 
                  key={cat}
                  onPress={() => setCategory(cat as any)}
                  className={`px-3 py-1.5 rounded-full ${category === cat ? 'bg-brand-purple' : 'bg-slate-200 dark:bg-slate-800'}`}
                >
                  <Text className={`capitalize font-medium ${category === cat ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4 text-slate-900 dark:text-white font-bold"
              placeholder="Post Title"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4 text-slate-900 dark:text-white h-32"
              placeholder="What's on your mind?"
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
            />

            <TextInput
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6 text-slate-900 dark:text-white"
              placeholder="Link URL (optional)"
              placeholderTextColor="#94a3b8"
              value={linkUrl}
              onChangeText={setLinkUrl}
              autoCapitalize="none"
            />

            <TouchableOpacity 
              className="w-full bg-brand-purple rounded-xl p-4 items-center shadow-sm"
              onPress={handleCreatePost}
            >
              <Text className="text-white font-bold text-lg">Post to Community</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}
