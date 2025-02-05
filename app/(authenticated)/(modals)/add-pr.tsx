import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../config/firebase';
import { FirebaseService } from '../../services/firebase';
import { Exercise, ExerciseDoc, PersonalRecord } from '../../types/database';
import { ExercisePicker } from '../../components/ExercisePicker';
import WeightCalculator from '../../components/WeightCalculator';
import { useSchedules } from '../../contexts/ScheduleContext';

const getTimeAgo = (timestamp: number) => {
  const now = new Date().getTime();
  const diff = now - timestamp;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  return `${days} day${days !== 1 ? 's' : ''} ago`;
};

export default function AddPR() {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDoc | null>(null);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [hasError, setHasError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const loadingAnimation = useRef(new Animated.Value(0)).current;

  // Animation for loading
  const startLoadingAnimation = () => {
    loadingAnimation.setValue(0);
    Animated.timing(loadingAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };
  const [lastPR, setLastPR] = useState<PersonalRecord | null>(null);
  const handleSave = async () => {
    if (!selectedExercise || !weight || !reps || !auth.currentUser) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsSaving(true);
    startLoadingAnimation();

    try {
      await FirebaseService.savePersonalRecord({
        userId: auth.currentUser.uid,
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        weight: parseInt(weight),
        repetitions: parseInt(reps),
        sessionId: null  // Explicitly set to null for standalone PRs
      });

      setHasError(false);
      setShowSuccess(true);
      setIsSaving(false);
      
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedExercise(null);
        setWeight('');
        setReps('');
        router.back();
      }, 500);
    } catch (error) {
      console.error('Error saving PR:', error);
      Alert.alert('Error', 'Failed to save Personal Record');
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const fetchLastPR = async () => {
      if (!selectedExercise || !auth.currentUser) return;
      
      try {
        const pr = await FirebaseService.getLatestPR(
          auth.currentUser.uid,
          selectedExercise.id
        );
        setLastPR(pr);
      } catch (error) {
        console.error('Error fetching PR:', error);
      }
    };

    fetchLastPR();
  }, [selectedExercise]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1E1E1E" />
          </TouchableOpacity>

          <Text style={styles.title}>Add PR</Text>

          <View style={styles.form}>
            <TouchableOpacity 
              style={styles.exerciseSelect}
              onPress={() => setShowExercisePicker(true)}
            >
              <Text style={styles.label}>EXERCISE</Text>
              <View style={styles.selectContent}>
                <Text style={styles.selectText}>
                  {selectedExercise?.name || 'Select Exercise'}
                </Text>
                <Ionicons name="chevron-forward" size={24} color="#1E1E1E" />
              </View>
            </TouchableOpacity>

            {selectedExercise && (
              <View style={styles.prContainer}>
                {lastPR ? (
                  <>
                    <Text style={styles.prSubtitle}>
                      Your Last recorded PR for {selectedExercise.name} was
                    </Text>
                    <Text style={styles.prValue}>
                      {lastPR.weight} lbs for {lastPR.repetitions} repetition{lastPR.repetitions !== 1 ? 's' : ''} ({getTimeAgo(lastPR.timestamp)})
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.prSubtitle, styles.noPrText]}>
                    No last recorded PR for {selectedExercise.name} found
                  </Text>
                )}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>WEIGHT</Text>
              <View style={styles.weightInputRow}>
                <TextInput
                  style={[
                    styles.input,
                    hasError && !weight && styles.errorInput
                  ]}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  placeholder="Enter weight"
                />
                <TouchableOpacity 
                  style={styles.calculatorButton}
                  onPress={() => setShowCalculator(true)}
                >
                  <Ionicons name="calculator-outline" size={24} color="#1E1E1E" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>REPETITIONS</Text>
              <TextInput
                style={[
                  styles.input,
                  hasError && !reps && styles.errorInput
                ]}
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                placeholder="Enter reps"
              />
            </View>

            <TouchableOpacity 
              style={[
                styles.saveButton,
                showSuccess && styles.successButton
              ]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving && (
                <Animated.View
                  style={[
                    styles.loadingOverlay,
                    {
                      width: loadingAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      }),
                      backgroundColor: '#4CAF50'
                    }
                  ]}
                />
              )}
              <Text style={styles.saveButtonText}>
                {showSuccess ? 'Saved!' : 'Save PR'}
              </Text>
            </TouchableOpacity>
          </View>

          <ExercisePicker
            visible={showExercisePicker}
            onClose={() => setShowExercisePicker(false)}
            onSelect={(exercise) => {
              setSelectedExercise(exercise);
              setShowExercisePicker(false);
            }}
          />

          <WeightCalculator
            isVisible={showCalculator}
            onClose={() => setShowCalculator(false)}
            onCalculate={(total) => {
              setWeight(total.toString());
              setShowCalculator(false);
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
  form: {
    gap: 20,
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  exerciseSelect: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  selectContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectText: {
    fontSize: 16,
    color: '#1E1E1E',
    fontWeight: '500',
  },
  inputGroup: {
    gap: 8,
  },
  weightInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    color: '#1E1E1E',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  calculatorButton: {
    backgroundColor: '#F5F5F5',
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  errorInput: {
    borderColor: '#666',
    borderWidth: 1,
  },
  successButton: {
    backgroundColor: '#1E1E1E',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#1E1E1E',
  },
  prContainer: {
    marginTop: -16,
    marginBottom: 4,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  prTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  prExercise: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
    color: '#1E1E1E',
  },
  prSubtitle: {
    fontSize: 14,
    color: '#1E1E1E',
    marginBottom: 4,
  },
  prValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E1E1E',
  },
  noPrText: {
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    color: '#666',
  },
}); 