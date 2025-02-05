import { Timestamp } from 'firebase/firestore';

// Core Types
export interface User {
  uid: string;
  firstName: string;
  lastName: string;
  username: string;
  phoneNumber: string;
  email: string;
  createdAt: Timestamp;
  connections?: string[];
  stats?: {
    totalSessions: number;
    totalWins: number;
    totalLosses: number;
  };
}

export interface MuscleGroup {
    id: string;
    name: string;
    scheduleId: string;
    exercises: string[]; // Array of exercise IDs
  }
  
  export interface Exercise {
    id: string;
    name: string;
    scheduleId: string;
    records: ExerciseRecord[];
  }
  
  export interface Schedule {
    id?: string;
    userId: string;
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 6 = Saturday
    muscleGroups: MuscleGroup[];
    exercises: Array<{
      entryId: string;
      exerciseId: string;
      name: string;
    }>;
  }
  
  export interface ExerciseList {
    scheduleId: string;
    muscleGroupId: string;
    exercises: Exercise[];
  }

export interface ExerciseRecord {
  date: Timestamp;
  maxWeight: number;
  repetitions: number;
}

export type WorkoutSession = {
  id: string;
  userId: string;
  startTime: number;
  endTime?: number;
  elapsedTime: number;
  muscleGroups: MuscleGroup[];
  exercises: Array<{
    exerciseId: string;
    name: string;
  }>;
  personalRecordIds: string[];
  scheduleId: string;
  status: 'active' | 'completed' | 'cancelled';
  wins: Array<{
    exerciseName: string;
    type: 'weight_increase' | 'reps_increase';
    analytics: string;
  }>;
  losses: Array<{
    exerciseName: string;
    type: 'weight_decrease' | 'reps_decrease';
    analytics: string;
  }>;
};

export interface SessionExercise {
  id: string;
  name: string;
  maxWeight: number;
  repetitions: number;
}

export type PersonalRecord = {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName: string;
  records: Array<{
    recordId: string;
    weight: number;
    repetitions: number;
    timestamp: number;
  }>;
};

export type WorkoutPost = {
  id: string;
  userId: string;
  userName: string;
  timestamp: number;
  sessionId: string;
  muscleGroups: string[];
  biggestWin?: string;
  elapsedTime: string;
  exercises: string[];
  analytics: string[];
};

export type NotificationType = 'connection_request' | 'connection_accepted' | 'workout_completed';

export type Notification = {
  id: string;
  userId: string;
  fromUserId: string;
  type: 'connection_request' | 'workout_completed';
  timestamp: number;
  read: boolean;
  data?: any;
};

export type NotificationWithUser = Notification & {
  fromUserName: string;
};

export type ExerciseDoc = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: number;
};

// Validation schemas
