import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSchedules } from '../../contexts/ScheduleContext';
import { auth } from '../../config/firebase';
import { FirebaseService } from '../../services/firebase';
import { Schedule, MuscleGroup, PersonalRecord, ExerciseDoc } from '../../types/database';
import { ExercisePicker } from '../../components/ExercisePicker';
import WeightCalculator from '../../components/WeightCalculator';
import { AnalyticsService } from '../../services/analytics';
import { SessionAnalytics } from '../../services/analytics';

export default function WorkoutSession() {
  const params = useLocalSearchParams<{ scheduleId: string }>();
  const { schedules, sessionState, updateSessionState } = useSchedules();
  const [userName, setUserName] = useState('');
  const [isPaused, setIsPaused] = useState(sessionState.isPaused);
  const [elapsedTime, setElapsedTime] = useState(sessionState.elapsedTime);
  const schedule = params.scheduleId ? schedules[parseInt(params.scheduleId)] as Schedule : null;
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDoc | null>(null);
  const [maxWeight, setMaxWeight] = useState('');
  const [repetitions, setRepetitions] = useState('');
  const [isExercisePickerVisible, setIsExercisePickerVisible] = useState(false);
  const [isCalculatorVisible, setIsCalculatorVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Add ref to track elapsed time changes
  const elapsedTimeRef = useRef(elapsedTime);
  elapsedTimeRef.current = elapsedTime;

  // Add effect to update elapsed time when session state changes
  useEffect(() => {
    setElapsedTime(sessionState.elapsedTime);
  }, [sessionState.elapsedTime]);

  // Add effect to sync pause state with session state
  useEffect(() => {
    setIsPaused(sessionState.isPaused);
  }, [sessionState.isPaused]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (auth.currentUser) {
        const profile = await FirebaseService.getUserProfile(auth.currentUser.uid);
        setUserName(profile.firstName || '');
      }
    };
    fetchUserProfile();

    // Reset and initialize session if not active or different schedule
    if (!sessionState.isActive || sessionState.currentScheduleId !== params.scheduleId) {
      // First reset any existing session
      updateSessionState({
        isActive: false,
        isPaused: false,
        elapsedTime: 0,
        currentScheduleId: undefined
      });

      // Then start new session
      setTimeout(() => {
        updateSessionState({
          isActive: true,
          isPaused: false,
          elapsedTime: 0,
          currentScheduleId: params.scheduleId,
        });
      }, 0);
    }

    return () => {
      updateSessionState({
        elapsedTime: elapsedTimeRef.current
      });
    };
  }, []);

  // Add state for last PR
  const [lastPR, setLastPR] = useState<PersonalRecord | null>(null);

  // Add effect to fetch last PR when exercise is selected
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

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePausePlay = () => {
    setIsPaused(prev => {
      const newPaused = !prev;
      updateSessionState({ 
        isPaused: newPaused,
        isActive: true  // Ensure session stays active
      });
      return newPaused;
    });
  };

  const handleMaxWeightFocus = () => {
    // Scroll to max weight input after keyboard appears
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 300, animated: true });
    }, 100);
  };

  // Add handler function
  const handleRepetitionsFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Add state for validation
  const [hasError, setHasError] = useState(false);

  // Add state for success
  const [showSuccess, setShowSuccess] = useState(false);

  // Add loading state
  const [isSaving, setIsSaving] = useState(false);

  // Create animated value for loading
  const loadingAnimation = useRef(new Animated.Value(0)).current;

  // Add loading animation function
  const startLoadingAnimation = () => {
    loadingAnimation.setValue(0);
    Animated.timing(loadingAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  // Add session ID to props
  const sessionId = sessionState.currentSessionId;

  // Add analytics state
  const [sessionAnalytics, setSessionAnalytics] = useState<SessionAnalytics>({
    wins: [],
    losses: [],
    newExercises: []
  });

  // Update PR save handler
  const handleSavePR = async () => {
    if (!selectedExercise || !maxWeight || !repetitions || !auth.currentUser || !sessionId) {
      setHasError(true);
      return;
    }

    setIsSaving(true);
    startLoadingAnimation();
    console.log('Saving PR with arguments:', {
      userId: auth.currentUser.uid,
      exerciseId: selectedExercise.id,
      exerciseName: selectedExercise.name,
      weight: parseInt(maxWeight),
      repetitions: parseInt(repetitions),
      sessionId
    });
    try {
      const prId = await FirebaseService.savePersonalRecord({
        userId: auth.currentUser.uid,
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        weight: parseInt(maxWeight),
        repetitions: parseInt(repetitions),
        sessionId
      });

      // Update session with PR reference
      await FirebaseService.updateSessionPR(sessionId, prId);

      setHasError(false);
      setShowSuccess(true);
      setIsSaving(false);
      
      // Process analytics separately
      processAnalytics(selectedExercise.name, parseInt(maxWeight), parseInt(repetitions));
      
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedExercise(null);
        setMaxWeight('');
        setRepetitions('');
        setLastPR(null);
      }, 1000);

    } catch (error) {
      console.error('Error saving PR:', error);
      Alert.alert('Error', 'Failed to save personal record');
      setIsSaving(false);
    }
  };

  // Separate analytics processing
  const processAnalytics = async (exerciseName: string, weight: number, repetitions: number) => {
    try {
      const latestPR = await FirebaseService.getLatestPR(auth.currentUser!.uid, selectedExercise!.id);
      const analytics = await AnalyticsService.processPersonalRecord(
        sessionId!,
        { exerciseName, weight, repetitions },
        latestPR ? {
          exerciseName,
          weight: latestPR.weight,
          repetitions: latestPR.repetitions
        } : null
      );
      setSessionAnalytics(analytics);
    } catch (error) {
      console.error('Error processing analytics:', error);
      // Analytics errors won't affect PR saving
    }
  };

  // Update done handler
  const handleDone = async () => {
    if (sessionId) {
      try {
        await FirebaseService.completeSession(sessionId, elapsedTime);
        updateSessionState({
          isActive: false,
          isPaused: false,
          elapsedTime: 0,
          currentScheduleId: undefined,
          currentSessionId: undefined
        });

        // Get final analytics
        const finalAnalytics = await AnalyticsService.getSessionAnalytics(sessionId);

        // Navigate to session complete with analytics
        router.push({
          pathname: '/(authenticated)/(modals)/session-complete',
          params: {
            sessionId,
            elapsedTime: formatTime(elapsedTime),
            biggestWin: finalAnalytics.biggestWin ? 
              AnalyticsService.formatBiggestWin(finalAnalytics.biggestWin) : 
              undefined,
            analytics: AnalyticsService.formatAnalytics(finalAnalytics)
          }
        });
      } catch (error) {
        console.error('Error completing session:', error);
        Alert.alert('Error', 'Failed to complete session');
      }
    }
  };

  // Update cancel handler
  const handleCancel = async () => {
    Alert.alert(
      "Cancel Session",
      "Are you sure you want to cancel? This will reset your progress.",
      [
        {
          text: "No",
          style: "cancel"
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              if (sessionId) {
                await FirebaseService.deleteSession(sessionId);
                
                // Reset session state
                updateSessionState({
                  isActive: false,
                  isPaused: false,
                  elapsedTime: 0,
                  currentScheduleId: undefined,
                  currentSessionId: undefined
                });
                
                // Reset local state
                setElapsedTime(0);
                setIsPaused(false);
                setSelectedExercise(null);
                setMaxWeight('');
                setRepetitions('');
                
                router.back();
              } else {
                // If no sessionId, just go back
                router.back();
              }
            } catch (error) {
              console.error('Error canceling session:', error);
              Alert.alert('Error', 'Failed to cancel session');
            }
          }
        }
      ]
    );
  };

  // Update the exercise selection handling
  const handleExerciseSelect = (exercise: ExerciseDoc) => {
    setSelectedExercise(exercise);
    setIsExercisePickerVisible(false);
  };

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

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.keepGoing}>Keep Going</Text>
              <Text style={styles.name}>{userName}</Text>
            </View>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {schedule?.muscleGroups && schedule.muscleGroups.length > 0 && (
            <Text style={styles.title}>
              IT'S {schedule.muscleGroups.map((mg: MuscleGroup) => mg.name.toUpperCase()).join(' & ')} DAY
            </Text>
          )}

          <View style={styles.timerSection}>
            <TouchableOpacity 
              style={[
                styles.pauseButton,
                { backgroundColor: isPaused ? '#4CAF50' : '#FF4444' }
              ]}
              onPress={handlePausePlay}
            >
              <Ionicons 
                name={isPaused ? "play" : "pause"} 
                size={20} 
                color="white" 
              />
            </TouchableOpacity>

            <View style={styles.placeholder} />
            
            <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EXERCISE</Text>
              <View style={[
                styles.selectContainer,
                hasError && !selectedExercise && styles.errorInput
              ]}>
                <TouchableOpacity 
                  style={styles.select}
                  onPress={() => setIsExercisePickerVisible(true)}
                >
                  <Text style={styles.selectText}>
                    {selectedExercise?.name || 'Select exercise'}
                  </Text>
                  <Ionicons name="chevron-down" size={24} color="#1E1E1E" />
                </TouchableOpacity>
              </View>
            </View>

            {selectedExercise && (
              <View style={styles.prContainer}>
                {lastPR ? (
                  <>
                    <Text style={styles.prSubtitle}>
                      Your Last recorded PR for {selectedExercise.name} was
                    </Text>
                    <Text style={styles.prValue}>
                      {lastPR.weight} lbs for {lastPR.repetitions} repetition
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
                    hasError && !maxWeight && styles.errorInput
                  ]}
                  value={maxWeight}
                  onChangeText={text => setMaxWeight(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="Enter max weight"
                  onFocus={handleMaxWeightFocus}
                />
                <TouchableOpacity 
                  style={styles.calculatorButton}
                  onPress={() => setIsCalculatorVisible(true)}
                >
                  <Ionicons name="calculator-outline" size={24} color="#1E1E1E" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>REPETITION</Text>
              <TextInput
                style={[
                  styles.input,
                  hasError && !repetitions && styles.errorInput
                ]}
                value={repetitions}
                onChangeText={text => setRepetitions(text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                placeholder="Enter repetitions"
                onFocus={handleRepetitionsFocus}
              />
            </View>

            <TouchableOpacity 
              style={[
                styles.saveButton,
                showSuccess && styles.successButton
              ]}
              onPress={handleSavePR}
              disabled={isSaving}
            >
              <Animated.View
                style={[
                  styles.loadingOverlay,
                  {
                    width: loadingAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }),
                    backgroundColor: '#4CAF50',
                    opacity: isSaving ? 1 : 0
                  }
                ]}
              />
              <Text style={styles.saveButtonText}>
                {showSuccess ? 'New PR recorded' : 'Save PR'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.completeButton}
            onPress={handleDone}
          >
            <Text style={styles.completeButtonText}>Complete Session</Text>
          </TouchableOpacity>

          <ExercisePicker
            visible={isExercisePickerVisible}
            onClose={() => setIsExercisePickerVisible(false)}
            onSelect={handleExerciseSelect}
          />

          <WeightCalculator
            isVisible={isCalculatorVisible}
            onClose={() => setIsCalculatorVisible(false)}
            onCalculate={(total) => setMaxWeight(total.toString())}
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
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 20,
    padding: 5,
    width: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
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
  headerLeft: {
    flex: 1,
  },
  keepGoing: {
    fontSize: 24,
    fontStyle: 'italic',
    color: '#666',
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E1E1E',
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF4444',
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
  completeButton: {
    backgroundColor: '#2FAF2F',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
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
  completeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 9,
    textAlign: 'center',
  },
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 2,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timer: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E1E1E',
  },
  pauseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
  },
  placeholder: {
    flex: 1,
  },
  formSection: {
    marginTop: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  selectContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  selectText: {
    fontSize: 16,
    color: '#4CAF50',
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    color: '#4CAF50',
  },
  calculatorButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#808080',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  prContainer: {
    marginTop: -10,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  prSubtitle: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
  },
  prValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4CAF50',
  },
  noPrText: {
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    color: '#666',
  },
  errorInput: {
    borderColor: '#FF4444',
    borderWidth: 1,
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
}); 