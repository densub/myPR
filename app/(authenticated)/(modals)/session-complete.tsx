import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AnalyticsService } from '../../services/analytics';
import { FirebaseService } from '../../services/firebase';
import { auth } from '../../config/firebase';
import { ExerciseDoc } from '../../types/database';

type RouteParams = {
  sessionId: string;
  elapsedTime: string;
  biggestWin?: string;
  analytics?: string[];
};

export default function SessionComplete() {
  const params = useLocalSearchParams<RouteParams>();
  const [analytics, setAnalytics] = useState<string[]>([]);
  const [biggestWin, setBiggestWin] = useState<string>('');

  useEffect(() => {
    const loadAnalytics = async () => {
      if (params.sessionId) {
        const sessionAnalytics = await AnalyticsService.getSessionAnalytics(params.sessionId);
        if (sessionAnalytics.biggestWin) {
          setBiggestWin(AnalyticsService.formatBiggestWin(sessionAnalytics.biggestWin));
        }
        setAnalytics(AnalyticsService.formatAnalytics(sessionAnalytics));
      }
    };

    loadAnalytics();
  }, [params.sessionId]);

  // const handleShare = async () => {
  //   if (!params.sessionId || !auth.currentUser) {
  //     Alert.alert('Error', 'Unable to share workout');
  //     return;
  //   }

  //   try {
  //     // Get session details
  //     const session = await FirebaseService.getWorkoutSession(params.sessionId);
  //     if (!session.scheduleId) {
  //       throw new Error('No schedule found for session');
  //     }

  //     const schedule = await FirebaseService.getScheduleWithDetails(session.scheduleId);
  //     const userProfile = await FirebaseService.getUserProfile(auth.currentUser.uid);
      
  //     if (!schedule || !userProfile) {
  //       throw new Error('Missing required data');
  //     }

      // Create the workout post
      // await FirebaseService.createWorkoutPost({
      //   sessionId: params.sessionId,
      //   muscleGroups: schedule.muscleGroups.map(mg => mg.name),
      //   biggestWin,
      //   elapsedTime: params.elapsedTime,
      //   exercises: schedule.exercises.map(e => e.name),
      //   analytics: analytics || [],
      //   userName: auth.currentUser.displayName || 'Unknown User'
      // });

      // Notify connections
      // await FirebaseService.notifyConnections(
      //   auth.currentUser.uid,
      //   schedule.muscleGroups.map(mg => mg.name).join(' and '),
      //   biggestWin
      // );

      // Navigate back to home
      // router.push({
      //   pathname: '/(authenticated)/(tabs)/schedule'
      // });
    // } catch (error) {
    //   console.error('Error sharing workout:', error);
    //   Alert.alert('Error', 'Failed to share workout. Please try again.');
    // }
  // };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => router.push({
            pathname: '/(authenticated)/(tabs)/schedule'
          })}
        >
          <Ionicons name="close" size={24} color="#FF4444" />
        </TouchableOpacity>

        <Text style={styles.title}>Session{'\n'}Completed</Text>
        <Text style={styles.timeElapsed}>Time Elapsed: {params.elapsedTime}</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Today's Biggest Win</Text>
        <Text style={styles.biggestWin}>{biggestWin}</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Analytics</Text>
        <ScrollView style={styles.analyticsList}>
          {analytics.map((item, index) => (
            <View key={index} style={styles.analyticsItem}>
              <View style={styles.bullet} />
              <Text style={styles.analyticsText}>{item}</Text>
            </View>
          ))}
        </ScrollView>
{/* 
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={24} color="#1E1E1E" />
        </TouchableOpacity> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#E8E8E8',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  timeElapsed: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#D0D0D0',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  biggestWin: {
    fontSize: 16,
    lineHeight: 24,
  },
  analyticsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginRight: 12,
  },
  analyticsText: {
    fontSize: 14,
    flex: 1,
    fontStyle: 'italic',
  },
  shareButton: {
    position: 'absolute',
    bottom: -50,
    right: 20,
    backgroundColor: '#E8E8E8',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsList: {
    maxHeight: 200,
    marginBottom: 20,
  }
}); 