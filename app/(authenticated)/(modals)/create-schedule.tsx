import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseService } from '../../services/firebase';
import { auth } from '../../config/firebase';
import { useSchedules } from '../../contexts/ScheduleContext';
import { Schedule } from '../../types/database';
import WeekDays from '../../components/WeekDays';

export default function CreateSchedule() {
  const params = useLocalSearchParams<{ dayIndex?: string }>();
  const [selectedDay, setSelectedDay] = useState<number>(
    params.dayIndex ? parseInt(params.dayIndex) : new Date().getDay()
  );
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { refreshSchedules } = useSchedules();
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadExistingSchedule = async () => {
    if (!auth.currentUser) return;
    
    try {
      setIsLoading(true);
      const schedule = await FirebaseService.getScheduleByDay(
        auth.currentUser.uid,
        selectedDay
      );
      setCurrentSchedule(schedule);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  };

  // Initial load and day change effect
  useEffect(() => {
    loadExistingSchedule();
  }, [selectedDay]);

  // Focus effect for returning from add/edit routine
  useFocusEffect(
    useCallback(() => {
      if (hasLoaded) {
        loadExistingSchedule();
      }
    }, [hasLoaded, selectedDay])
  );

  const handleSave = async () => {
    if (!auth.currentUser) return;

    try {
      let scheduleId: string;
      
      if (currentSchedule?.id) {
        scheduleId = currentSchedule.id;
        console.log('Using existing schedule:', scheduleId);
      } else {
        // Create new schedule
        scheduleId = await FirebaseService.createSchedule(
          auth.currentUser.uid,
          selectedDay as 0 | 1 | 2 | 3 | 4 | 5 | 6
        );
        console.log('Created new schedule:', scheduleId);
      }

      // Refresh schedules in context
      await refreshSchedules();
      
      // Navigate to add routine page
      router.push({
        pathname: '/(authenticated)/(modals)/add-routine',
        params: { 
          scheduleId,
          dayIndex: selectedDay.toString()
        }
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#1E1E1E" />
      </TouchableOpacity>

      <Text style={styles.title}>{currentSchedule ? 'Edit Schedule' : 'Create Schedule'}</Text>

      <WeekDays
        selectedDay={selectedDay}
        onDayPress={setSelectedDay}
      />

      {currentSchedule && (
        <ScrollView style={styles.detailsContainer}>
          {/* Muscle Groups Section */}
          {currentSchedule.muscleGroups?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Muscle Groups</Text>
              <View style={styles.chipContainer}>
                {currentSchedule.muscleGroups.map((group) => (
                  <View key={group.id} style={styles.chip}>
                    <Text style={styles.chipText}>{group.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Exercises Section */}
          {currentSchedule.exercises?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exercises</Text>
              <View style={styles.exerciseList}>
                {currentSchedule.exercises.map((exercise) => (
                  <View key={exercise.entryId} style={styles.exerciseItem}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.disabledButton]}
        onPress={handleSave}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Loading...' : currentSchedule ? 'Edit Schedule' : 'Create Schedule'}
        </Text>
      </TouchableOpacity>
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
    padding: 5,
    width: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#1E1E1E',
  },
  header: {
    backgroundColor: '#FFF',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  detailsContainer: {
    flex: 1,
    marginVertical: 20,
  },
  section: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#666',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chipText: {
    fontSize: 14,
    color: '#1E1E1E',
    fontWeight: '500',
  },
  exerciseList: {
    gap: 8,
  },
  exerciseItem: {
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseName: {
    fontSize: 14,
    color: '#1E1E1E',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  }
}); 