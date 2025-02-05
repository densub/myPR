import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseService } from '../../services/firebase';
import { auth } from '../../config/firebase';
import { ExerciseDoc } from '../../types/database';
import { useSchedules } from '../../contexts/ScheduleContext';
import CustomAlert from '../../utils/CustomAlert';

export default function MyExercises() {
  const [exercises, setExercises] = useState<ExerciseDoc[]>([]);
  const [newExercise, setNewExercise] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<ExerciseDoc | null>(null);
  const { schedules, refreshSchedules } = useSchedules();

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      setLoading(true);
      const allExercises = await FirebaseService.getAllExercises();
      setExercises(allExercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExercise = async () => {
    if (!newExercise.trim()) return;

    try {
      await FirebaseService.createExercise(newExercise);
      setNewExercise('');
      loadExercises(); // Refresh list
    } catch (error) {
      console.error('Error saving exercise:', error);
      Alert.alert('Error', 'Failed to save exercise');
    }
  };

  const isExerciseInUse = (exerciseId: string) => {
    return Object.values(schedules).some(schedule => 
      schedule.exercises.some(exercise => exercise.exerciseId === exerciseId)
    );
  };

  const handleDeleteExercise = async (exercise: ExerciseDoc) => {
    const isInUse = isExerciseInUse(exercise.id);

    if (isInUse) {
      setExerciseToDelete(exercise);
      setShowDeleteAlert(true);
    } else {
      deleteExercise(exercise.id);
    }
  };

  const deleteExercise = async (exerciseId: string) => {
    try {
      // First remove from all schedules if needed
      for (const schedule of Object.values(schedules)) {
        const exerciseInSchedule = schedule.exercises.find(
          ex => ex.exerciseId === exerciseId
        );
        if (exerciseInSchedule) {
          await FirebaseService.deleteExerciseFromSchedule(
            schedule.id!,
            exerciseId,
            exerciseInSchedule.entryId
          );
        }
      }

      // Then delete the exercise
      await FirebaseService.deleteExercise(exerciseId);
      
      // Refresh exercises list and schedules
      loadExercises();
      refreshSchedules();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      Alert.alert('Error', 'Failed to delete exercise');
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

      <Text style={styles.title}>My Exercises</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newExercise}
          onChangeText={setNewExercise}
          placeholder="Enter exercise name"
          placeholderTextColor="#999"
        />
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSaveExercise}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.exercisesList}>
        {exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseRow}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => handleDeleteExercise(exercise)}
            >
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <CustomAlert
        isVisible={showDeleteAlert}
        title="Warning"
        message="This exercise is currently in use in your schedules. Deleting it will remove it from all schedules."
        onNo={() => setShowDeleteAlert(false)}
        onYes={() => {
          if (exerciseToDelete) {
            deleteExercise(exerciseToDelete.id);
          }
          setShowDeleteAlert(false);
          setExerciseToDelete(null);
        }}
      />
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
  inputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#1E1E1E',
    padding: 15,
    borderRadius: 8,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  exercisesList: {
    flex: 1,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  exerciseName: {
    flex: 1,
    fontSize: 16,
  },
  deleteButton: {
    padding: 5,
  },
}); 