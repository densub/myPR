import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Modal, Alert } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseService } from '../../services/firebase';
import { auth } from '../../config/firebase';
import { useSchedules } from '../../contexts/ScheduleContext';
import { ExerciseDoc } from '../../types/database';
import { ExercisePicker } from '../../components/ExercisePicker';

type MuscleGroupEntry = {
  id: string;
  name: string;
  isSaved: boolean;
};

type Exercise = {
  entryId: string;
  exerciseId: string;
  name: string;
};

export default function AddRoutine() {
  const params = useLocalSearchParams<{ 
    dayIndex: string;
    scheduleId: string;
  }>();
  const { schedules, updateSchedule } = useSchedules();
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupEntry[]>([
    { id: Date.now().toString(), name: '', isSaved: false }
  ]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExercise, setNewExercise] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [userName, setUserName] = useState('');
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing data when in edit mode
  useEffect(() => {
    const loadData = async () => {
      if (params.scheduleId) {
        setIsLoading(true);
        // Get schedule directly using getScheduleWithDetails instead of from schedules object
        const schedule = await FirebaseService.getScheduleWithDetails(params.scheduleId);
        
        if (schedule?.muscleGroups?.length > 0) {
          setMuscleGroups(
            schedule.muscleGroups.map(mg => ({
              id: mg.id,
              name: mg.name,
              isSaved: true
            }))
          );
        }

        // Load exercises
        if (schedule?.exercises?.length > 0) {
          setExercises(schedule.exercises);
        }

        setIsLoading(false);
      }
    };
    
    loadData();
  }, [params.scheduleId]);

  // Add useEffect to fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (auth.currentUser) {
          const userProfile = await FirebaseService.getUserProfile(auth.currentUser.uid);
          if (userProfile) {
            setUserName(userProfile.firstName || '');
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  const handleSave = async (id: string) => {
    const muscleGroup = muscleGroups.find(mg => mg.id === id);
    if (!muscleGroup || !muscleGroup.name.trim()) return;
    
    try {
      let actualScheduleId = params.scheduleId;
      console.log('Saving with scheduleId:', actualScheduleId);
      
      // If schedule exists, update it. Otherwise create new one.
      if (actualScheduleId) {
        // Update existing schedule
        await FirebaseService.updateScheduleMuscleGroup(
          actualScheduleId,
          {
            id: muscleGroup.id,
            name: muscleGroup.name.trim()
          }
        );
      } else {
        // Create new schedule
        actualScheduleId = await FirebaseService.createSchedule(
          auth.currentUser!.uid,
          parseInt(params.dayIndex) as 0 | 1 | 2 | 3 | 4 | 5 | 6
        );
        
        // Add muscle group to new schedule
        await FirebaseService.addMuscleGroup(actualScheduleId, {
          id: muscleGroup.id,
          name: muscleGroup.name.trim()
        });
        
        params.scheduleId = actualScheduleId;
      }

      // Get and update the schedule in cache
      const updatedSchedule = await FirebaseService.getScheduleWithDetails(actualScheduleId);
      console.log('Updated schedule:', updatedSchedule);
      
      if (updatedSchedule) {
        updateSchedule(parseInt(params.dayIndex), updatedSchedule);
        
        // Mark as saved in local state
        setMuscleGroups(current =>
          current.map(mg =>
            mg.id === id ? { ...mg, isSaved: true } : mg
          )
        );

        // Add a new empty muscle group if this was the last one
        const unsavedGroups = muscleGroups.filter(mg => !mg.isSaved);
        if (unsavedGroups.length === 0) {
          addNewMuscleGroup();
        }

        // Refresh the schedule data
        await loadSchedule();
      }
    } catch (error) {
      console.error('Error saving muscle group:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const muscleGroup = muscleGroups.find(mg => mg.id === id);
    if (!muscleGroup) return;

    try {
      if (muscleGroup.isSaved && params.scheduleId) {
        await FirebaseService.deleteMuscleGroup(params.scheduleId, muscleGroup.id);
        
        // Update cache after deletion
        const updatedSchedule = await FirebaseService.getScheduleWithDetails(params.scheduleId);
        if (updatedSchedule) {
          updateSchedule(parseInt(params.dayIndex), updatedSchedule);
        }
      }
      
      // Remove from local state
      setMuscleGroups(current => current.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting muscle group:', error);
    }
  };

  const addNewMuscleGroup = () => {
    setMuscleGroups(current => [
      ...current,
      { id: Date.now().toString(), name: '', isSaved: false }
    ]);
  };

  const handleAddExercise = async (exercise: ExerciseDoc) => {
    // Check if exercise already exists in the list
    const isDuplicate = exercises.some(ex => ex.exerciseId === exercise.id);
    if (isDuplicate) {
      Alert.alert('Exercise exists', 'This exercise is already in your routine');
      setShowExercisePicker(false);
      return;
    }

    if (!params.scheduleId) {
      const newScheduleId = await FirebaseService.createSchedule(
        auth.currentUser!.uid,
        parseInt(params.dayIndex) as 0 | 1 | 2 | 3 | 4 | 5 | 6
      );
      params.scheduleId = newScheduleId;
    }
    
    try {
      await FirebaseService.addExerciseToSchedule(params.scheduleId, exercise.name);
      
      // Update local state with the new exercise including entryId
      setExercises(current => [...current, {
        entryId: Date.now().toString(),
        exerciseId: exercise.id,
        name: exercise.name
      }]);
      
      setNewExercise('');
      setShowExercisePicker(false);

      // Refresh the schedule data
      await loadSchedule();
    } catch (error) {
      console.error('Error adding exercise:', error);
      Alert.alert('Error', 'Failed to add exercise');
    }
  };

  const handleRemoveExercise = async (entryId: string) => {
    if (!params.scheduleId) return;

    const exerciseToRemove = exercises.find(ex => ex.entryId === entryId);
    if (!exerciseToRemove) return;

    try {
      await FirebaseService.deleteExerciseFromSchedule(
        params.scheduleId, 
        exerciseToRemove.exerciseId,
        entryId
      );
      
      // Update local state
      setExercises(current => current.filter(ex => ex.entryId !== entryId));

      // Update schedule in cache
      const updatedSchedule = await FirebaseService.getScheduleWithDetails(params.scheduleId);
      if (updatedSchedule) {
        updateSchedule(parseInt(params.dayIndex), updatedSchedule);
      }
    } catch (error) {
      console.error('Error removing exercise:', error);
      Alert.alert('Error', 'Failed to remove exercise');
    }
  };

  const handleExerciseInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Add isEdit check
  const isEdit = Boolean(params.scheduleId);

  const loadSchedule = async () => {
    if (params.scheduleId) {
      const schedule = await FirebaseService.getScheduleWithDetails(params.scheduleId);
      if (schedule) {
        updateSchedule(parseInt(params.dayIndex), schedule);
        setExercises(schedule.exercises);
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.innerContainer}>
        <View>
        </View>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E1E1E" />
        </TouchableOpacity>

        <Text style={styles.title}>
          {isEdit ? 'Edit Routine' : 'Add Routine'}
        </Text>
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>MUSCLE GROUP</Text>
          
          {muscleGroups.map((mg, index) => (
            <View key={mg.id} style={styles.muscleGroupContainer}>
              <View style={styles.inputRow}>
                {mg.isSaved ? (
                  <View style={styles.savedGroup}>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    <Text style={styles.savedText}>{mg.name}</Text>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDelete(mg.id)}
                    >
                      <Ionicons name="remove-circle-outline" size={30} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      value={mg.name}
                      onChangeText={(text) => 
                        setMuscleGroups(current =>
                          current.map(item =>
                            item.id === mg.id ? { ...item, name: text } : item
                          )
                        )
                      }
                      placeholder="Enter muscle group"
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity 
                      style={styles.saveButton}
                      onPress={() => handleSave(mg.id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={30} color="#4CAF50" />
                    </TouchableOpacity>
                    {(muscleGroups.length > 1) && (
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={() => handleDelete(mg.id)}
                      >
                        <Ionicons name="remove-circle-outline" size={30} color="#FF3B30" />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
          ))}

          <TouchableOpacity 
            style={styles.addButton}
            onPress={addNewMuscleGroup}
          >
            <Ionicons name="add-circle-outline" size={48} color="#1E1E1E" />
          </TouchableOpacity>

          <View style={styles.exercisesSection}>
            <Text style={styles.sectionTitle}>EXERCISES</Text>
            
            <TouchableOpacity 
              style={styles.exercisePickerButton}
              onPress={() => setShowExercisePicker(true)}
            >
              <View style={styles.exercisePickerContent}>
                <Text style={styles.exercisePickerText}>
                  Add Exercise
                </Text>
                <Ionicons name="add-circle-outline" size={24} color="#1E1E1E" />
              </View>
            </TouchableOpacity>

            <View style={styles.exercisesContainer}>
              <ScrollView 
                style={styles.exercisesScroll}
                contentContainerStyle={styles.exercisesContent}
              >
                {exercises.map((exercise) => (
                  <View 
                    key={exercise.entryId} 
                    style={styles.exerciseChip}
                  >
                    <Text style={styles.exerciseText}>{exercise.name}</Text>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleRemoveExercise(exercise.entryId)}
                    >
                      <Ionicons name="remove-circle-outline" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </ScrollView>
      </View>

      <ExercisePicker
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelect={handleAddExercise}
        currentExercises={exercises}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  innerContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
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
  scrollView: {
    flex: 1,
  },
  backButton: {
    marginBottom: 20,
    padding: 5,
    width: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1E1E1E',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    marginTop: 24,
  },
  muscleGroupContainer: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButton: {
    padding: 5,
  },
  savedGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  savedText: {
    fontSize: 16,
    color: '#1E1E1E',
    flex: 1,
  },
  deleteButton: {
    padding: 5,
  },
  addButton: {
    alignItems: 'center',
    padding: 10,
    marginVertical: 16,
  },
  exercisesSection: {
    marginTop: 20,
  },
  exercisePickerButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exercisePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exercisePickerText: {
    fontSize: 16,
    color: '#1E1E1E',
    fontWeight: '500',
  },
  exercisesContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    minHeight: 200,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exercisesScroll: {
    flex: 1,
  },
  exercisesContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  exerciseChip: {
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseText: {
    fontSize: 14,
    color: '#1E1E1E',
    fontWeight: '500',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E1E1E',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
}); 