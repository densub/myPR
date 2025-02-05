import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import { FirebaseService } from '../../services/firebase';
import { auth } from '../../config/firebase';
import { Schedule } from '../../types/database';
import { useFocusEffect } from '@react-navigation/native';
import { useSchedules } from '../../contexts/ScheduleContext';
import { Ionicons } from '@expo/vector-icons';
import WeekDays from '../../components/WeekDays';

interface SkeletonProps {
  width: number | string;
  height: number | string;
  style?: any; // Or use ViewStyle from react-native if you want to be more specific
}

const Skeleton = ({ width, height, style }: SkeletonProps) => {
  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        { width, height, backgroundColor: '#D0D0D0', opacity },
        style,
      ]}
    />
  );
};

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function SchedulePage() {
  const { schedules, loading, refreshSchedules, sessionState, updateSessionState } = useSchedules();
  const today = new Date().getDay();
  const schedule = schedules[today];

  // Check if schedule is empty (no muscle groups and exercises)
  const isScheduleEmpty = !schedule?.muscleGroups?.length && !schedule?.exercises?.length;

  useFocusEffect(
    useCallback(() => {
      // Refresh in background without loading state
      refreshSchedules(false);
    }, [refreshSchedules])
  );

  const formatMuscleGroupTitle = (muscleGroups: { name: string }[]) => {
    if (!muscleGroups?.length) return 'NO MUSCLE GROUPS SET';
    
    const names = muscleGroups.map(mg => mg.name.toUpperCase());
    if (names.length === 1) return `IT'S ${names[0]} DAY`;
    if (names.length === 2) return `IT'S ${names[0]} AND ${names[1]} DAY`;
    const lastGroup = names[names.length - 1];
    const otherGroups = names.slice(0, -1).join(', ');
    return `IT'S ${otherGroups}, AND ${lastGroup} DAY`;
  };

  const [userName, setUserName] = useState('');

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Skeleton width={150} height={32} style={styles.skeletonMargin} />
          <Skeleton width={100} height={40} style={styles.skeletonMargin} />
        </View>

        <View style={styles.weekDays}>
          {[...Array(7)].map((_, index) => (
            <Skeleton
              key={index}
              width={36}
              height={36}
              style={styles.dayCircle}
            />
          ))}
        </View>

        <Skeleton width={200} height={24} style={styles.skeletonMargin} />

        <View style={styles.statsContainer}>
          {[...Array(3)].map((_, index) => (
            <Skeleton
              key={index}
              width="100%"
              height={16}
              style={styles.skeletonMargin}
            />
          ))}
        </View>

        {[...Array(3)].map((_, index) => (
          <Skeleton
            key={index}
            width="100%"
            height={50}
            style={[styles.button, styles.skeletonMargin]}
          />
        ))}
      </View>
    );
  }

  if (!schedule || isScheduleEmpty) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{userName || 'User'}</Text>
          </View>
        </View>

        <View style={styles.weekDays}>
          {DAYS.map((day, index) => {
            const dayNumber = (index + 1) % 7;
            const isToday = dayNumber === new Date().getDay();
            return (
              <View 
                key={index} 
                style={[
                  styles.dayCircle,
                  isToday && styles.activeDayCircle,
                  !isToday && styles.disabledDayCircle
                ]}
              >
                <Text style={[
                  styles.dayText,
                  isToday && styles.activeDayText,
                  !isToday && styles.disabledDayText
                ]}>
                  {day}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.emptyStateText}>
          {schedule ? 'No routines found for today...' : 'Unable to find your Day...'}
        </Text>
        
        <TouchableOpacity 
          style={styles.addRoutineButton}
          onPress={() => router.push({
            pathname: '/(authenticated)/(modals)/add-routine',
            params: { 
              dayIndex: today.toString(),
              scheduleId: schedule?.id // Pass existing schedule ID if available
            }
          })}
        >
          <Text style={styles.addRoutineButtonText}>Add Routine</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{userName || 'User'}</Text>
        </View>
      </View>

      <WeekDays isSelectable={false} />

      {schedule?.muscleGroups?.length > 0 ? (
        <>
          <Text style={styles.title}>
            {formatMuscleGroupTitle(schedule.muscleGroups)}
          </Text>

          {schedule.exercises?.length > 0 && (
            <View style={styles.exercisesContainer}>
              <Text style={styles.sectionTitle}>TODAY'S EXERCISES</Text>
              <View style={styles.exercisesList}>
                {schedule.exercises.map((exercise) => (
                  <View key={exercise.exerciseId} style={styles.exerciseChip}>
                    <Text style={styles.exerciseText}>{exercise.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      ) : (
        <Text style={styles.emptyStateText}>No muscle groups set for today</Text>
      )}

<TouchableOpacity 
        style={styles.button}
        onPress={() => router.push({
          pathname: '/(authenticated)/(modals)/add-routine',
          params: { 
            scheduleId: schedule.id,
            dayIndex: today.toString()
          }
        })}
      >
        <Text style={styles.buttonText}>
          {schedule?.muscleGroups?.length ? 'Edit Routine' : 'Add Routine'}
        </Text>
      </TouchableOpacity>

      {/* <TouchableOpacity 
        style={[styles.button, styles.startSessionButton]}
        onPress={async () => {
          // If session is already active for this schedule, just navigate
          if (sessionState.isActive && sessionState.currentScheduleId === schedule.id) {
            router.push({
              pathname: '/(authenticated)/(modals)/workout-session',
              params: { scheduleId: schedule.id }
            });
            return;
          }

          try {
            // Create new session only if no active session
            const sessionId = await FirebaseService.createWorkoutSession(
              schedule.id as string,
              auth.currentUser?.uid || '',
              schedule
            );

            // Update session state with the new session ID
            updateSessionState({
              isActive: true,
              isPaused: false,
              elapsedTime: 0,
              currentScheduleId: schedule.id,
              currentSessionId: sessionId
            });

            // Navigate to workout session
            router.push({
              pathname: '/(authenticated)/(modals)/workout-session',
              params: { scheduleId: schedule.id }
            });
          } catch (error) {
            console.error('Error starting session:', error);
            Alert.alert('Error', 'Failed to start workout session');
          }
        }}
      >
        <Text style={styles.startSessionButtonText}>
          {sessionState.isActive && sessionState.currentScheduleId === schedule.id
            ? (sessionState.isPaused 
                ? `Paused (${formatTime(sessionState.elapsedTime)})` 
                : formatTime(sessionState.elapsedTime))
            : 'Start Session'
          }
        </Text>
      </TouchableOpacity> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#F5F5F5',
  },
  header: {
    marginBottom: 30,
    backgroundColor: '#FFF',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  greeting: {
    fontSize: 32,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#1E1E1E',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeDayCircle: {
    backgroundColor: '#1E1E1E',
    borderColor: '#1E1E1E',
  },
  disabledDayCircle: {
    backgroundColor: '#FFF',
    opacity: 0.5,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E1E1E',
  },
  activeDayText: {
    color: '#FFF',
  },
  disabledDayText: {
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1E1E1E',
    paddingHorizontal: 10,
    fontStyle: 'italic',
  },
  statsContainer: {
    marginBottom: 30,
  },
  statsText: {
    fontSize: 16,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 10,
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
    color: '#1E1E1E',
    fontSize: 16,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  skeletonMargin: {
    marginBottom: 10,
    borderRadius: 16,
  },
  emptyStateText: {
    fontSize: 20,
    color: '#666',
    textAlign: 'center',
    marginVertical: 30,
    fontStyle: 'italic',
  },
  addRoutineButton: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addRoutineButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  addPrButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  exercisesContainer: {
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#666',
  },
  exercisesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    minHeight: 100,
  },
  exerciseChip: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseText: {
    fontSize: 14,
    color: '#1E1E1E',
    fontWeight: '500',
  },
  startSessionButton: {
    backgroundColor: '#4CAF50',
  },
  startSessionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
}); 