import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';

export default function DashboardScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Welcome, {user?.fullName}</Text>
      <Text style={styles.role}>Role: {user?.role}</Text>

      {user?.role === 'mentor' ? (
        <View style={styles.card}>
          <Text style={styles.cardText}>
            There's no dedicated mentor dashboard yet — that's coming in a later milestone.
          </Text>
        </View>
      ) : null}

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  greeting: { fontSize: 22, fontWeight: '700' },
  role: { fontSize: 14, color: '#6b7280', textTransform: 'capitalize' },
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  cardText: { color: '#374151' },
  logoutButton: {
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#dc2626', fontWeight: '600' },
});
