import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminHub'>;

export default function AdminHubScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={() => navigation.navigate('Criteria')}>
        <Text style={styles.buttonText}>Judging criteria</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => navigation.navigate('Judges')}>
        <Text style={styles.buttonText}>Assigned judges</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => navigation.navigate('Leaderboard')}>
        <Text style={styles.buttonText}>Leaderboard</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  button: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 18,
  },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#111827' },
});
