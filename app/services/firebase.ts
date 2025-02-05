import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  getDocs,
  addDoc,
  updateDoc,
  Timestamp,
  arrayUnion,
  deleteDoc,
  arrayRemove,
  orderBy,
  limit,
  increment
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { User, Schedule, WorkoutSession, SessionExercise, Exercise, ExerciseList, MuscleGroup, WorkoutPost } from '../types/database';
import { AnalyticsService } from '../services/analytics';

// Add new type for PR
type PersonalRecord = {
  id?: string;
  userId: string;
  exerciseId: string;
  exerciseName: string;
  records: Array<{
    recordId: string;
    weight: number;
    repetitions: number;
    timestamp: number;
    sessionId?: string;
  }>;
};

// Add to existing types at top
type ExerciseDoc = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: number;
};

// Add the helper function at the top of the file
const capitalizeWords = (str: string) => {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const FirebaseService = {
  // User Operations
  async createUserProfile(uid: string, data: Partial<User>) {
    await setDoc(doc(db, 'users', uid), {
      ...data,
      createdAt: Timestamp.now(),
    });
  },

  async getUserProfile(uid: string) {
    const docRef = await getDoc(doc(db, 'users', uid));
    return docRef.data() as User;
  },

  // Schedule Operations
  async createSchedule(userId: string, dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6): Promise<string> {
    try {
      // Check if schedule already exists for this day
      const existingSchedule = await this.getScheduleByDay(userId, dayOfWeek);
      if (existingSchedule) {
        return existingSchedule.id;
      }

      // Create new schedule if none exists
      const scheduleRef = doc(collection(db, 'schedules'));
      await setDoc(scheduleRef, {
        id: scheduleRef.id,
        userId,
        dayOfWeek,
        muscleGroups: [],
        exercises: []
      });

      return scheduleRef.id;
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  },

  async getScheduleForDay(userId: string, dayOfWeek: number) {
    const schedulesRef = collection(db, 'schedules');
    const q = query(
      schedulesRef, 
      where('userId', '==', userId),
      where('dayOfWeek', '==', dayOfWeek)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (Schedule & { id: string })[];
  },

  // Workout Session Operations
  async startWorkoutSession(userId: string, scheduleId: string, muscleGroup: string) {
    const sessionRef = collection(db, 'sessions');
    return await addDoc(sessionRef, {
      userId,
      scheduleId,
      muscleGroup,
      startTime: Timestamp.now(),
      endTime: null,
      exercises: [],
    });
  },

  async endWorkoutSession(sessionId: string, exercises: SessionExercise[]): Promise<void> {
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    const session = sessionSnap.data();

    if (!session) return;

    const wins: WorkoutSession['wins'] = [];
    const losses: WorkoutSession['losses'] = [];

    // Analyze each exercise
    for (const exercise of exercises) {
      const previousPR = await this.getLatestPR(session.userId, exercise.name);
      const analysis = await AnalyticsService.analyzePersonalRecord(
        exercise.name,
        { weight: exercise.maxWeight, repetitions: exercise.repetitions },
        previousPR ? { weight: previousPR.weight, repetitions: previousPR.repetitions } : undefined
      );

      if (analysis.isWin && analysis.type) {
        wins.push({
          exerciseName: exercise.name,
          type: analysis.type,
          analytics: analysis.analytics
        });
      }

      if (analysis.isLoss && analysis.type) {
        losses.push({
          exerciseName: exercise.name,
          type: analysis.type,
          analytics: analysis.analytics
        });
      }
    }

    await updateDoc(sessionRef, {
      endTime: Timestamp.now(),
      exercises,
      wins,
      losses,
      status: 'completed'
    });

    // Update user stats with the counts from this session
    await this.updateUserStats(session.userId, wins.length, losses.length);
  },

  // Exercise Records Operations
  async addExerciseRecord(
    scheduleId: string, 
    exerciseName: string, 
    weight: number, 
    reps: number
  ) {
    const recordRef = collection(db, 'schedules', scheduleId, 'exercises');
    await addDoc(recordRef, {
      name: exerciseName,
      date: Timestamp.now(),
      maxWeight: weight,
      repetitions: reps,
    });
  },

  async getExerciseHistory(scheduleId: string, exerciseName: string) {
    const recordsRef = collection(db, 'schedules', scheduleId, 'exercises');
    const q = query(recordsRef, where('name', '==', exerciseName));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  },

  async addExerciseToMuscleGroup(
    scheduleId: string,
    muscleGroupId: string,
    exercise: Exercise
  ) {
    try {
      const exerciseListRef = collection(db, 'exerciseLists');
      const q = query(
        exerciseListRef,
        where('scheduleId', '==', scheduleId),
        where('muscleGroupId', '==', muscleGroupId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const listDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'exerciseLists', listDoc.id), {
          exercises: arrayUnion(exercise)
        });
      } else {
        await addDoc(exerciseListRef, {
          scheduleId,
          muscleGroupId,
          exercises: [exercise]
        });
      }
    } catch (error) {
      console.error('Error adding exercise:', error);
      throw error;
    }
  },

  async getExercisesForMuscleGroup(
    scheduleId: string,
    muscleGroupId: string
  ) {
    const exerciseListRef = collection(db, 'exerciseLists');
    const q = query(
      exerciseListRef,
      where('scheduleId', '==', scheduleId),
      where('muscleGroupId', '==', muscleGroupId)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as ExerciseList;
    }
    return null;
  },

  // Muscle Group Operations
  async addMuscleGroup(scheduleId: string, muscleGroup: { id: string; name: string }): Promise<void> {
    try {
      const scheduleRef = doc(db, 'schedules', scheduleId);
      const scheduleSnap = await getDoc(scheduleRef);
      
      if (!scheduleSnap.exists()) {
        throw new Error('Schedule not found');
      }

      const schedule = scheduleSnap.data() as Schedule;
      const muscleGroups = schedule.muscleGroups || [];

      await updateDoc(scheduleRef, {
        muscleGroups: [...muscleGroups, muscleGroup]
      });

      console.log('Added muscle group:', muscleGroup);
    } catch (error) {
      console.error('Error adding muscle group:', error);
      throw error;
    }
  },

  // Exercise Operations
  async addExercises(scheduleId: string, exercises: string[]) {
    try {
      const scheduleRef = doc(db, 'schedules', scheduleId);
      const scheduleDoc = await getDoc(scheduleRef);
      const schedule = scheduleDoc.data();

      // Create new exercises with IDs and timestamps
      const newExercises = exercises.map(name => ({
        id: self.crypto?.randomUUID() || Math.random().toString(36).substring(2),
        name,
        createdAt: Timestamp.now()
      }));

      // Update schedule with new exercises
      await updateDoc(scheduleRef, {
        exercises: [...(schedule?.exercises || []), ...newExercises]
      });

      return newExercises;
    } catch (error) {
      console.error('Error adding exercises:', error);
      throw error;
    }
  },

  // Fetch Operations
  async getScheduleWithDetails(scheduleId: string): Promise<Schedule | null> {
    try {
      const scheduleDoc = await getDoc(doc(db, 'schedules', scheduleId));
      if (!scheduleDoc.exists()) return null;

      const schedule = {
        id: scheduleDoc.id,
        ...scheduleDoc.data()
      } as Schedule;

      // Get muscle groups - make sure this data is being retrieved
      if (!schedule.muscleGroups) {
        schedule.muscleGroups = [];
      }

      // Get exercises
      if (!schedule.exercises) {
        schedule.exercises = [];
      }

      return schedule;
    } catch (error) {
      console.error('Error getting schedule details:', error);
      return null;
    }
  },

  async deleteMuscleGroup(scheduleId: string, muscleGroupId: string) {
    try {
      const scheduleRef = doc(db, 'schedules', scheduleId);
      const scheduleDoc = await getDoc(scheduleRef);
      const schedule = scheduleDoc.data();

      if (schedule) {
        const updatedMuscleGroups = schedule.muscleGroups.filter(
          (mg: MuscleGroup) => mg.id !== muscleGroupId
        );

        await updateDoc(scheduleRef, {
          muscleGroups: updatedMuscleGroups
        });

        // Delete schedule only if both arrays are empty
        if (updatedMuscleGroups.length === 0 && schedule.exercises.length === 0) {
          await deleteDoc(scheduleRef);
        }
      }
    } catch (error) {
      console.error('Error deleting muscle group:', error);
      throw error;
    }
  },

  async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error('Error checking username:', error);
      throw error;
    }
  },

  async removeExercise(scheduleId: string, exerciseId: string) {
    try {
      const scheduleRef = doc(db, 'schedules', scheduleId);
      const scheduleDoc = await getDoc(scheduleRef);
      const schedule = scheduleDoc.data();

      if (schedule) {
        // Remove specific exercise using arrayRemove
        await updateDoc(scheduleRef, {
          exercises: arrayRemove(...schedule.exercises.filter(ex => ex.exerciseId === exerciseId))
        });

        // Check if schedule is empty after removal
        const updatedDoc = await getDoc(scheduleRef);
        const updatedSchedule = updatedDoc.data();
        if (updatedSchedule && 
            updatedSchedule.exercises.length === 0 && 
            updatedSchedule.muscleGroups.length === 0) {
          await deleteDoc(scheduleRef);
        }
      }
    } catch (error) {
      console.error('Error removing exercise:', error);
      throw error;
    }
  },

  async updateScheduleExercises(scheduleId: string, exercises: Exercise[]): Promise<void> {
    const scheduleRef = doc(db, 'schedules', scheduleId);
    
    // Get current schedule
    const scheduleSnap = await getDoc(scheduleRef);
    if (!scheduleSnap.exists()) return;
    
    // Update exercises array
    await updateDoc(scheduleRef, {
      exercises: exercises
    });
  },

  async addExerciseToSchedule(scheduleId: string, exerciseName: string): Promise<void> {
    if (!auth.currentUser) throw new Error('No authenticated user');

    try {
      // First, create or get the exercise from exercises collection
      const exercise = await this.createExercise(exerciseName);

      // Get current schedule
      const scheduleRef = doc(db, 'schedules', scheduleId);
      const scheduleSnap = await getDoc(scheduleRef);
      
      if (!scheduleSnap.exists()) {
        throw new Error('Schedule not found');
      }

      // Add exercise reference to schedule with entryId
      await updateDoc(scheduleRef, {
        exercises: arrayUnion({
          entryId: Date.now().toString(),  // Add unique entryId
          exerciseId: exercise.id,
          name: exercise.name
        })
      });

    } catch (error) {
      console.error('Error adding exercise to schedule:', error);
      throw error;
    }
  },

  async savePersonalRecord(data: { 
    userId: string;
    exerciseId: string;
    exerciseName: string;
    weight: number;
    repetitions: number;
    sessionId?: string | null;  // Make sessionId optional
  }): Promise<string> {
    try {
      const { weight, repetitions, sessionId, ...prData } = data;
      const prsRef = collection(db, 'personal_records');
      
      // Check if PR already exists for this exercise
      const q = query(
        prsRef,
        where('userId', '==', prData.userId),
        where('exerciseId', '==', prData.exerciseId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Create new PR document
        const newPrRef = doc(prsRef);
        const newRecord = {
          recordId: Date.now().toString(),
          weight,
          repetitions,
          timestamp: Date.now(),
          sessionId: sessionId || null  // Use null if sessionId is not provided
        };
        
        await setDoc(newPrRef, {
          id: newPrRef.id,
          ...prData,
          records: [newRecord]
        });
        
        return newPrRef.id;
      } else {
        // Add new record to existing PR
        const prDoc = snapshot.docs[0];
        const newRecord = {
          recordId: Date.now().toString(),
          weight,
          repetitions,
          timestamp: Date.now(),
          sessionId: sessionId || null  // Use null if sessionId is not provided
        };
        
        await updateDoc(prDoc.ref, {
          records: arrayUnion(newRecord)
        });
        
        
        return prDoc.id;
      }
    } catch (error) {
      console.error('Error saving PR:', error);
      throw error;
    }
  },

  async deletePersonalRecord(prId: string): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const prRef = doc(db, 'personal_records', prId);
      const prSnap = await getDoc(prRef);
      
      if (!prSnap.exists()) {
        throw new Error('PR not found');
      }

      const prData = prSnap.data();
      if (prData.userId !== auth.currentUser.uid) {
        throw new Error('Unauthorized to delete this PR');
      }

      await deleteDoc(prRef);
    } catch (error) {
      console.error('Error deleting PR:', error);
      throw error;
    }
  },

  async getLatestPR(userId: string, exerciseId: string): Promise<{ weight: number; repetitions: number; timestamp: number } | null> {
    try {
      const prsRef = collection(db, 'personal_records');
      const q = query(
        prsRef,
        where('userId', '==', userId),
        where('exerciseId', '==', exerciseId)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      const pr = snapshot.docs[0].data() as PersonalRecord;
      if (!pr.records.length) return null;
      
      // Get record with highest weight
      const maxWeightRecord = pr.records.reduce((max, record) => 
        record.weight > max.weight ? record : max
      , pr.records[0]);
      
      return {
        weight: maxWeightRecord.weight,
        repetitions: maxWeightRecord.repetitions,
        timestamp: maxWeightRecord.timestamp
      };
    } catch (error) {
      console.error('Error getting latest PR:', error);
      return null;
    }
  },

  // Add method to get PR history
  async getPRHistory(userId: string, exerciseId: string, timeRange: 'week' | 'month' | '6months' | 'year' | 'all'): Promise<PersonalRecord['records']> {
    try {
      const prsRef = collection(db, 'personal_records');
      const q = query(
        prsRef,
        where('userId', '==', userId),
        where('exerciseId', '==', exerciseId)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return [];
      
      const pr = snapshot.docs[0].data() as PersonalRecord;
      const now = Date.now();
      
      // Filter records based on timeRange
      return pr.records.filter(record => {
        const recordDate = record.timestamp;
        const diffDays = (now - recordDate) / (1000 * 60 * 60 * 24);
        
        switch (timeRange) {
          case 'week': return diffDays <= 7;
          case 'month': return diffDays <= 30;
          case '6months': return diffDays <= 180;
          case 'year': return diffDays <= 365;
          default: return true;
        }
      }).sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Error getting PR history:', error);
      return [];
    }
  },

  // Add session methods
  async createWorkoutSession(scheduleId: string, userId: string, schedule: Schedule): Promise<string> {
    const sessionRef = doc(collection(db, 'workout_sessions'));
    const session: WorkoutSession = {
      id: sessionRef.id,
      userId,
      startTime: Date.now(),
      elapsedTime: 0,
      muscleGroups: schedule.muscleGroups,
      exercises: schedule.exercises,
      personalRecordIds: [],
      scheduleId,
      status: 'active'
    };
    
    await setDoc(sessionRef, session);
    return sessionRef.id;
  },

  async updateSessionPR(sessionId: string, prId: string): Promise<void> {
    try {
      const sessionRef = doc(db, 'workout_sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      
      if (!sessionSnap.exists()) {
        throw new Error('Session not found');
      }

      // Get current session data
      const sessionData = sessionSnap.data();
      
      // Initialize personalRecordIds array if it doesn't exist
      const personalRecordIds = sessionData.personalRecordIds || [];
      
      // Add new PR ID if it's not already in the array
      if (!personalRecordIds.includes(prId)) {
        personalRecordIds.push(prId);
      }

      // Update the session with the new array
      await updateDoc(sessionRef, {
        personalRecordIds: personalRecordIds
      });
    } catch (error) {
      console.error('Error updating session PR:', error);
      throw error;
    }
  },

  async completeSession(sessionId: string, elapsedTime: number): Promise<void> {
    const sessionRef = doc(db, 'workout_sessions', sessionId);
    await updateDoc(sessionRef, {
      endTime: Date.now(),
      elapsedTime,
      status: 'completed'
    });
  },

  async deleteSession(sessionId: string): Promise<void> {
    const sessionRef = doc(db, 'workout_sessions', sessionId);
    await deleteDoc(sessionRef);
  },

  async updateScheduleMuscleGroup(scheduleId: string, muscleGroup: { id: string; name: string }): Promise<void> {
    const scheduleRef = doc(db, 'schedules', scheduleId);
    
    // Get current schedule
    const scheduleSnap = await getDoc(scheduleRef);
    if (!scheduleSnap.exists()) return;
    
    const schedule = scheduleSnap.data();
    const existingGroups = schedule.muscleGroups || [];
    
    // Update or add muscle group
    const groupIndex = existingGroups.findIndex((mg: any) => mg.id === muscleGroup.id);
    if (groupIndex >= 0) {
      existingGroups[groupIndex] = muscleGroup;
    } else {
      existingGroups.push(muscleGroup);
    }
    
    // Update schedule
    await updateDoc(scheduleRef, {
      muscleGroups: existingGroups
    });
  },

  async createWorkoutPost(post: Partial<WorkoutPost>): Promise<string> {
    if (!auth.currentUser) throw new Error('No authenticated user');

    const postRef = doc(collection(db, 'workout_posts'));
    const userProfile = await this.getUserProfile(auth.currentUser.uid);
    // Ensure required fields
    const newPost: WorkoutPost = {
      id: postRef.id,
      userId: auth.currentUser.uid,
      userName: userProfile.username || '',
      timestamp: Date.now(),
      sessionId: post.sessionId || '',
      muscleGroups: post.muscleGroups || [],
      biggestWin: post.biggestWin || '',
      elapsedTime: post.elapsedTime || '00:00:00',
      exercises: post.exercises || [],
      analytics: post.analytics || []
    };

    await setDoc(postRef, newPost);

    // Don't update stats here since they're updated when session ends
    return postRef.id;
  },

  async getWorkoutPosts(): Promise<WorkoutPost[]> {
    if (!auth.currentUser) return [];

    try {
      // Get current user's connections
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      const connections = userData?.connections || [];

      // Include both user's and connections' posts
      const userIds = [auth.currentUser.uid, ...connections];

      console.log('Fetching posts for users:', userIds);

      const postsRef = collection(db, 'workout_posts');
      const postsQuery = query(
        postsRef,
        where('userId', 'in', userIds),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(postsQuery);
      const posts = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as WorkoutPost[];

      console.log('Found posts:', posts.length);
      return posts;

    } catch (error) {
      console.error('Error fetching workout posts:', error);
      if (error.code === 'failed-precondition') {
        console.error('Missing index for compound query');
      }
      return [];
    }
  },

  // Add new method to get workout session
  async getWorkoutSession(sessionId: string): Promise<WorkoutSession> {
    const sessionRef = doc(db, 'workout_sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists()) {
      throw new Error('Session not found');
    }
    
    return sessionSnap.data() as WorkoutSession;
  },

  async searchUsers(searchQuery: string): Promise<User[]> {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('username', '>=', searchQuery.toLowerCase()),
      where('username', '<=', searchQuery.toLowerCase() + '\uf8ff'),
      limit(10)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
      uid: doc.id, 
      ...doc.data() 
    } as User));
  },

  async sendConnectionRequest(fromUserId: string, toUserId: string): Promise<void> {
    if (!fromUserId || !toUserId) {
      throw new Error('Invalid user IDs');
    }

    try {
      // Get sender's profile for the notification
      const fromUser = await this.getUserProfile(fromUserId);
      
      // Create connection request
      const requestRef = doc(collection(db, 'connection_requests'));
      const requestData = {
        id: requestRef.id,
        fromUserId,
        toUserId,
        status: 'pending',
        timestamp: Date.now()
      };

      await setDoc(requestRef, requestData);

      // Create notification ONLY for the recipient (toUserId)
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        id: notificationRef.id,
        userId: toUserId, // Only send to recipient
        fromUserId,
        fromUserName: fromUser.username || 'Unknown',
        type: 'connection_request',
        timestamp: Date.now(),
        read: false,
        data: {
          requestId: requestRef.id
        }
      });
    } catch (error) {
      console.error('Error sending connection request:', error);
      throw error;
    }
  },

  async acceptConnectionRequest(requestId: string): Promise<void> {
    const requestRef = doc(db, 'connection_requests', requestId);
    const request = await getDoc(requestRef);
    
    if (!request.exists()) return;
    
    const data = request.data();
    
    // Update connections for both users
    await updateDoc(doc(db, 'users', data.fromUserId), {
      connections: arrayUnion(data.toUserId)
    });
    
    await updateDoc(doc(db, 'users', data.toUserId), {
      connections: arrayUnion(data.fromUserId)
    });
    
    // Update request status
    await updateDoc(requestRef, { status: 'accepted' });

    // Add notification to sender that request was accepted
    const toUser = await this.getUserProfile(data.toUserId);
    await this.addNotification(data.fromUserId, {
      type: 'connection_accepted',
      fromUserId: data.toUserId,
      fromUserName: toUser.username || 'Unknown',
      timestamp: Date.now(),
      read: false
    });

    // No wins/losses to update here
    await this.updateUserStats(data.fromUserId, 0, 0);
  },

  async addNotification(userId: string, notification: Omit<Notification, 'id'>): Promise<void> {
    try {
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        id: notificationRef.id,
        ...notification,
        userId, // Make sure userId is set
        read: false,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error adding notification:', error);
      throw error;
    }
  },

  async getUserStats(userId: string): Promise<{ sessions: number; wins: number }> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { sessions: 0, wins: 0 };
    }

    const userData = userSnap.data();
    return {
      sessions: userData.stats?.totalSessions || 0,
      wins: userData.stats?.totalWins || 0
    };
  },

  async getConnectionStatus(
    currentUserId: string,
    targetUserId: string
  ): Promise<{ isConnected: boolean; isPending: boolean; incomingRequest?: string }> {
    // Check if users are connected
    const userRef = doc(db, 'users', currentUserId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { isConnected: false, isPending: false };
    }

    const user = userSnap.data();
    const connections = user.connections || [];
    
    if (connections.includes(targetUserId)) {
      return { isConnected: true, isPending: false };
    }

    // Check for outgoing request
    const outgoingQuery = query(
      collection(db, 'connection_requests'),
      where('fromUserId', '==', currentUserId),
      where('toUserId', '==', targetUserId),
      where('status', '==', 'pending')
    );
    
    // Check for incoming request
    const incomingQuery = query(
      collection(db, 'connection_requests'),
      where('fromUserId', '==', targetUserId),
      where('toUserId', '==', currentUserId),
      where('status', '==', 'pending')
    );
    
    const [outgoingSnap, incomingSnap] = await Promise.all([
      getDocs(outgoingQuery),
      getDocs(incomingQuery)
    ]);

    if (!outgoingSnap.empty) {
      return { isConnected: false, isPending: true };
    }

    if (!incomingSnap.empty) {
      return { 
        isConnected: false, 
        isPending: true, 
        incomingRequest: incomingSnap.docs[0].id 
      };
    }

    return { isConnected: false, isPending: false };
  },

  async getUserPosts(userId: string): Promise<WorkoutPost[]> {
    const postsRef = collection(db, 'workout_posts');
    const q = query(
      postsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as WorkoutPost);
  },

  // Add new notification methods
  async getNotifications(userId: string): Promise<Notification[]> {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id // Make sure to include the document ID
    })) as Notification[];

    // Fetch user names for notifications
    const userIds = new Set(notifications.map(n => n.fromUserId));
    const userPromises = Array.from(userIds).map(id => this.getUserProfile(id));
    const users = await Promise.all(userPromises);
    const userMap = new Map(users.map(user => [user.id, user]));

    return notifications.map(notification => ({
      ...notification,
      fromUserName: userMap.get(notification.fromUserId)?.username || 'Unknown'
    }));
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
  },

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  async notifyConnections(
    userId: string,
    workoutType: string,
    biggestWin?: string
  ): Promise<void> {
    // Get user's connections
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return;
    
    const user = userSnap.data();
    const connections = user.connections || [];

    // Create notifications for all connections
    const notificationPromises = connections.map(connectionId => 
      this.addNotification(connectionId, {
        type: 'workout_completed',
        fromUserId: userId,
        timestamp: Date.now(),
        read: false,
        data: {
          workoutType,
          biggestWin
        }
      })
    );

    await Promise.all(notificationPromises);
  },

  async removeConnection(currentUserId: string, targetUserId: string): Promise<void> {
    try {
      // Remove connection from both users
      await updateDoc(doc(db, 'users', currentUserId), {
        connections: arrayRemove(targetUserId)
      });
      
      await updateDoc(doc(db, 'users', targetUserId), {
        connections: arrayRemove(currentUserId)
      });

      // Clear posts from removed connection
      const postsRef = collection(db, 'workout_posts');
      const q = query(
        postsRef,
        where('userId', '==', targetUserId)
      );
      const snapshot = await getDocs(q);
      
      // Remove posts from local state by triggering a refresh
      return;
    } catch (error) {
      console.error('Error removing connection:', error);
      throw error;
    }

    // No wins/losses to update here
    await this.updateUserStats(currentUserId, 0, 0);
  },

  async updateUserStats(userId: string, sessionWins: number = 0, sessionLosses: number = 0): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        throw new Error('User not found');
      }

      const userData = userSnap.data();
      const currentStats = userData.stats || { totalSessions: 0, totalWins: 0, totalLosses: 0 };

      // Update stats by incrementing
      await updateDoc(userRef, {
        'stats.totalSessions': increment(1),
        'stats.totalWins': increment(sessionWins),
        'stats.totalLosses': increment(sessionLosses)
      });

      console.log('Updated user stats - Added:', { 
        wins: sessionWins, 
        losses: sessionLosses 
      });
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  },

  async deleteWorkoutPost(postId: string): Promise<void> {
    if (!auth.currentUser) throw new Error('No authenticated user');

    try {
      const postRef = doc(db, 'workout_posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        throw new Error('Post not found');
      }

      const postData = postSnap.data();
      if (postData.userId !== auth.currentUser.uid) {
        throw new Error('Unauthorized to delete this post');
      }

      await deleteDoc(postRef);
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  },

  async getUserPRs(userId: string): Promise<PersonalRecord[]> {
    try {
      const prsRef = collection(db, 'personal_records');
      const q = query(
        prsRef,
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return [];

      // Map the documents to PersonalRecord type
      const prs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PersonalRecord[];

      // Ensure records array exists for each PR
      return prs.map(pr => ({
        ...pr,
        records: pr.records || [] // Provide default empty array if records is undefined
      }));
    } catch (error) {
      console.error('Error getting user PRs:', error);
      return [];
    }
  },

  // Add these new methods to FirebaseService
  async createExercise(name: string): Promise<ExerciseDoc> {
    if (!auth.currentUser) throw new Error('No authenticated user');

    const exerciseRef = doc(collection(db, 'exercises'));
    const normalizedName = capitalizeWords(name);

    // Check if exercise already exists for this user
    const q = query(
      collection(db, 'exercises'),
      where('name', '==', normalizedName),
      where('createdBy', '==', auth.currentUser.uid)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ExerciseDoc;
    }

    const exercise: ExerciseDoc = {
      id: exerciseRef.id,
      name: normalizedName,
      createdBy: auth.currentUser.uid,
      createdAt: Date.now(),
    };

    await setDoc(exerciseRef, exercise);
    return exercise;
  },

  async getAllExercises(): Promise<ExerciseDoc[]> {
    if (!auth.currentUser) return [];
    
    const exercisesRef = collection(db, 'exercises');
    const q = query(
      exercisesRef,
      where('createdBy', '==', auth.currentUser.uid),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExerciseDoc[];
  },

  async searchExercises(searchText: string): Promise<ExerciseDoc[]> {
    if (!auth.currentUser) return [];

    const exercisesRef = collection(db, 'exercises');
    const normalizedSearch = capitalizeWords(searchText);
    
    const q = query(
      exercisesRef,
      where('createdBy', '==', auth.currentUser.uid),
      where('name', '>=', normalizedSearch),
      where('name', '<=', normalizedSearch + '\uf8ff'),
      limit(10)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExerciseDoc;
  },

  async deleteExerciseFromSchedule(scheduleId: string, exerciseId: string, entryId: string): Promise<void> {
    try {
      const scheduleRef = doc(db, 'schedules', scheduleId);
      const scheduleSnap = await getDoc(scheduleRef);
      
      if (!scheduleSnap.exists()) {
        throw new Error('Schedule not found');
      }

      const schedule = scheduleSnap.data() as Schedule;
      
      // Find the specific exercise entry to remove
      const exerciseToRemove = schedule.exercises.find(
        exercise => exercise.entryId === entryId
      );

      if (!exerciseToRemove) {
        console.error('Exercise entry not found in schedule');
        return;
      }

      // Remove specific exercise using arrayRemove
      await updateDoc(scheduleRef, {
        exercises: arrayRemove(exerciseToRemove)
      });

      // Check if schedule is empty after removal
      const updatedDoc = await getDoc(scheduleRef);
      const updatedSchedule = updatedDoc.data() as Schedule;
      if (updatedSchedule.exercises.length === 0 && updatedSchedule.muscleGroups.length === 0) {
        await deleteDoc(scheduleRef);
      }
    } catch (error) {
      console.error('Error deleting exercise from schedule:', error);
      throw error;
    }
  },

  async deleteExercise(exerciseId: string): Promise<void> {
    try {
      const exerciseRef = doc(db, 'exercises', exerciseId);
      await deleteDoc(exerciseRef);
    } catch (error) {
      console.error('Error deleting exercise:', error);
      throw error;
    }
  },

  // Add method to get schedule by day
  async getScheduleByDay(userId: string, dayOfWeek: number): Promise<Schedule | null> {
    try {
      const schedulesRef = collection(db, 'schedules');
      const q = query(
        schedulesRef,
        where('userId', '==', userId),
        where('dayOfWeek', '==', dayOfWeek)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const scheduleDoc = snapshot.docs[0];
      return await this.getScheduleWithDetails(scheduleDoc.id);
    } catch (error) {
      console.error('Error getting schedule by day:', error);
      return null;
    }
  },

  async getAllSchedules(userId: string): Promise<Record<number, Schedule>> {
    try {
      const schedulesRef = collection(db, 'schedules');
      const q = query(
        schedulesRef,
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      const schedules: Record<number, Schedule> = {};
      
      snapshot.docs.forEach(doc => {
        const schedule = {
          id: doc.id,
          ...doc.data()
        } as Schedule;
        schedules[schedule.dayOfWeek] = schedule;
      });
      
      return schedules;
    } catch (error) {
      console.error('Error getting all schedules:', error);
      return {};
    }
  }
}; 