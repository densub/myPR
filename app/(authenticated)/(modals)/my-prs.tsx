import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseService } from '../../services/firebase';
import { auth } from '../../config/firebase';
import { PersonalRecord } from '../../types/database';
import PRHistoryModal from '../../components/PRHistoryModal';

export default function MyPRs() {
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPR, setSelectedPR] = useState<PersonalRecord | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    loadPRs();
  }, []);

  const loadPRs = async () => {
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      const userPRs = await FirebaseService.getUserPRs(auth.currentUser.uid);
      setPrs(userPRs as PersonalRecord[]);
    } catch (error) {
      console.error('Error loading PRs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePR = async (pr: PersonalRecord) => {
    if (!pr.id) return;

    Alert.alert(
      'Delete PR',
      `Are you sure you want to delete your PR for ${pr.exerciseName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FirebaseService.deletePersonalRecord(pr.id!);
              // Refresh the list after deletion
              loadPRs();
            } catch (error) {
              console.error('Error deleting PR:', error);
              Alert.alert('Error', 'Failed to delete PR');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading PRs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#1E1E1E" />
      </TouchableOpacity>

      <Text style={styles.title}>My PRs</Text>

      <ScrollView style={styles.scrollView}>
      {prs.length === 0 ? (
        <View style={styles.noPRsContainer}>
          <Text style={styles.noPRsText}>No PRs found</Text>
        </View>
        ) : (
        prs.map((pr) => (
          <View key={pr.id} style={styles.prCard}>
            <TouchableOpacity
              style={styles.prContent}
              onPress={() => {
                setSelectedPR(pr);
                setShowHistoryModal(true);
              }}
            >
              <View style={styles.prHeader}>
                <Text style={styles.exerciseName}>{pr.exerciseName}</Text>
                <Ionicons name="chevron-forward" size={24} color="#1E1E1E" />
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Weight</Text>
                  <Text style={styles.statValue}>{pr.records[0].weight} lbs</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Reps</Text>
                  <Text style={styles.statValue}>{pr.records[0].repetitions}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Date</Text>
                  <Text style={styles.statValue}>
                    {new Date(pr.records[0].timestamp as number).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeletePR(pr)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF4444" />
            </TouchableOpacity>
          </View>
        ))
      )}
      </ScrollView>

      {selectedPR && (
        <PRHistoryModal
          isVisible={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedPR(null);
          }}
          userId={auth.currentUser!.uid}
          exerciseId={selectedPR.exerciseId}
          exerciseName={selectedPR.exerciseName}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  prCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prContent: {
    flex: 1,
  },
  prHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 10,
    marginLeft: 10,
  },
  noPRsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 300, 
  },
  noPRsText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#666',
  },
});
