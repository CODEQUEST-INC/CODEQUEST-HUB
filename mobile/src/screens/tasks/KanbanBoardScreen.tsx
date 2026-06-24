import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import taskApi from '../../api/task';
import { useAuth } from '../../context/AuthContext';

type KanbanBoardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'KanbanBoard'>;

type Props = {
  navigation: KanbanBoardScreenNavigationProp;
};

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId?: string;
  createdBy: string;
}

interface MemberContribution {
  userId: string;
  fullName: string;
  tasksCompleted: number;
}

interface TaskAnalytics {
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  memberContributions: MemberContribution[];
}

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width * 0.75;

export default function KanbanBoardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analytics, setAnalytics] = useState<TaskAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Status Action Sheet Modal
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasksAndAnalytics = async () => {
    try {
      const [tasksRes, analyticsRes] = await Promise.all([
        taskApi.get('/'),
        taskApi.get('/analytics')
      ]);
      setTasks(tasksRes.data.data);
      setAnalytics(analyticsRes.data.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        Alert.alert('No Group', 'You must be in a group to manage tasks.');
        navigation.goBack();
      } else {
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndAnalytics();
  }, []);

  const handleSaveTask = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      if (editingTask) {
        await taskApi.patch(`/${editingTask.id}`, { title, description });
      } else {
        await taskApi.post('/', { title, description, assigneeId: user?.id });
      }
      setModalVisible(false);
      setTitle('');
      setDescription('');
      setEditingTask(null);
      fetchTasksAndAnalytics();
    } catch (error) {
      Alert.alert('Error', 'Failed to save task');
    }
  };

  const handleChangeStatus = async (newStatus: TaskStatus) => {
    if (!selectedTask) return;
    try {
      await taskApi.patch(`/${selectedTask.id}`, { status: newStatus });
      setStatusModalVisible(false);
      fetchTasksAndAnalytics();
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const openTaskStatusMenu = (task: Task) => {
    setSelectedTask(task);
    setStatusModalVisible(true);
  };

  const columns: { key: TaskStatus; label: string }[] = [
    { key: 'todo', label: 'To Do' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'in_review', label: 'In Review' },
    { key: 'done', label: 'Done' }
  ];

  if (loading) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      
      {/* Analytics Header */}
      {analytics && (
        <View className="bg-white dark:bg-slate-800 p-4 m-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-bold text-slate-800 dark:text-white">Project Progress</Text>
            <View className="bg-brand-purple/10 px-3 py-1 rounded-full">
              <Text className="text-brand-purple font-bold">{analytics.progressPercentage}%</Text>
            </View>
          </View>
          
          {/* Simple Progress Bar */}
          <View className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
            <View 
              className="h-full bg-brand-purple" 
              style={{ width: `${analytics.progressPercentage}%` }} 
            />
          </View>

          <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Member Contributions:</Text>
          {analytics.memberContributions.length > 0 ? (
            analytics.memberContributions.map(member => (
              <View key={member.userId} className="flex-row justify-between items-center mb-1">
                <Text className="text-sm text-slate-500 dark:text-slate-400">• {member.fullName}</Text>
                <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{member.tasksCompleted} tasks</Text>
              </View>
            ))
          ) : (
            <Text className="text-sm text-slate-400 italic">No tasks completed yet.</Text>
          )}
        </View>
      )}

      {/* Add Task Button */}
      <View className="px-4 mb-4">
        <TouchableOpacity 
          className="bg-brand-purple p-3 rounded-xl items-center flex-row justify-center shadow-sm"
          onPress={() => {
            setTitle('');
            setDescription('');
            setEditingTask(null);
            setModalVisible(true);
          }}
        >
          <Text className="text-white font-bold text-base">+ Create New Task</Text>
        </TouchableOpacity>
      </View>

      {/* Kanban Board Horizontal Scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1 px-2">
        {columns.map(col => (
          <View key={col.key} style={{ width: COLUMN_WIDTH }} className="bg-slate-100 dark:bg-slate-800/50 m-2 rounded-2xl p-3 border border-slate-200 dark:border-slate-700">
            
            <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
              <Text className="font-bold text-slate-700 dark:text-slate-200 text-base">{col.label}</Text>
              <View className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full">
                <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {tasks.filter(t => t.status === col.key).length}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {tasks.filter(t => t.status === col.key).map(task => (
                <TouchableOpacity 
                  key={task.id}
                  className="bg-white dark:bg-slate-800 p-4 mb-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700"
                  onPress={() => openTaskStatusMenu(task)}
                >
                  <Text className="font-bold text-slate-800 dark:text-white mb-1">{task.title}</Text>
                  <Text className="text-sm text-slate-500 dark:text-slate-400 mb-3" numberOfLines={2}>{task.description}</Text>
                  {task.assigneeId && (
                    <View className="self-start bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">
                      <Text className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Assigned</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

          </View>
        ))}
      </ScrollView>

      {/* Create/Edit Task Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 h-3/4">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-slate-900 dark:text-white">
                {editingTask ? 'Edit Task' : 'New Task'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text className="text-slate-400 font-bold text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Task Title</Text>
            <TextInput
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4 text-slate-900 dark:text-white"
              placeholder="e.g. Design Database Schema"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />

            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Description</Text>
            <TextInput
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6 text-slate-900 dark:text-white h-32"
              placeholder="Provide details about the task..."
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity 
              className="w-full bg-brand-purple rounded-xl p-4 items-center shadow-sm"
              onPress={handleSaveTask}
            >
              <Text className="text-white font-bold text-lg">Save Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Move Status Action Sheet Modal */}
      <Modal visible={statusModalVisible} animationType="fade" transparent>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-xl">
            <Text className="text-xl font-bold text-slate-900 dark:text-white mb-2">Move Task</Text>
            <Text className="text-slate-500 dark:text-slate-400 mb-6 font-medium">"{selectedTask?.title}"</Text>

            {columns.map(col => (
              <TouchableOpacity 
                key={col.key}
                className={`p-4 rounded-xl mb-2 flex-row justify-between items-center ${selectedTask?.status === col.key ? 'bg-brand-purple/10 border border-brand-purple/20' : 'bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600'}`}
                onPress={() => handleChangeStatus(col.key)}
              >
                <Text className={`font-bold ${selectedTask?.status === col.key ? 'text-brand-purple' : 'text-slate-700 dark:text-slate-200'}`}>
                  {col.label}
                </Text>
                {selectedTask?.status === col.key && (
                  <Text className="text-brand-purple font-bold">✓</Text>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity 
              className="mt-4 p-4 items-center"
              onPress={() => setStatusModalVisible(false)}
            >
              <Text className="text-slate-500 dark:text-slate-400 font-bold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}
