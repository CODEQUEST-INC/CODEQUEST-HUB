import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { getMyProposal, ProposalResponse } from '../../api/proposals';
import { useAuth } from '../../auth/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { ProposalStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProposalStackParamList, 'ProposalStatus'>;

export default function ProposalStatusScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [proposal, setProposal] = useState<ProposalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const p = await getMyProposal(token);
      setProposal(p);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setProposal(null);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load proposal');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!proposal) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Your group hasn't submitted a proposal yet.</Text>
        <Pressable style={styles.button} onPress={() => navigation.navigate('ProposalForm', { mode: 'submit' })}>
          <Text style={styles.buttonText}>Submit proposal</Text>
        </Pressable>
      </View>
    );
  }

  const canResubmit = proposal.status === 'rejected' || proposal.status === 'changes_requested';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBadge status={proposal.status} />
      <Text style={styles.title}>{proposal.title}</Text>
      <Text style={styles.meta}>Version {proposal.currentVersion}</Text>

      <Text style={styles.sectionHeading}>Problem statement</Text>
      <Text style={styles.body}>{proposal.problemStatement}</Text>

      <Text style={styles.sectionHeading}>Objectives</Text>
      <Text style={styles.body}>{proposal.objectives}</Text>

      <Text style={styles.sectionHeading}>Tech stack</Text>
      <Text style={styles.body}>{proposal.techStack}</Text>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('ProposalHistory', { proposalId: proposal.id })}
      >
        <Text style={styles.secondaryButtonText}>View history</Text>
      </Pressable>

      {canResubmit ? (
        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate('ProposalForm', { mode: 'resubmit', proposal })}
        >
          <Text style={styles.buttonText}>Resubmit</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  meta: { fontSize: 13, color: '#6b7280' },
  sectionHeading: { fontSize: 15, fontWeight: '600', marginTop: 16 },
  body: { fontSize: 14, color: '#374151' },
  emptyText: { color: '#6b7280', textAlign: 'center' },
  error: { color: '#dc2626', textAlign: 'center' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButtonText: { color: '#2563eb', fontWeight: '600' },
});
