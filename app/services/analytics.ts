import { PersonalRecord, WorkoutSession } from '../types/database';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

type PRRecord = {
  recordId: string;
  weight: number;
  repetitions: number;
  timestamp: number;
};

type PRComparison = {
  exerciseName: string;
  exerciseId: string;
  previousRecord: PRRecord;
  currentRecord: PRRecord;
  weightDiff: number;
  weightDiffPercentage: number;
  repsDiff: number;
  repsDiffPercentage: number;
  isWin: boolean;
  timestamp: number;
};

export type SessionAnalytics = {
  wins: PRComparison[];
  losses: PRComparison[];
  biggestWin?: PRComparison;
  newExercises: Array<{
    exerciseId: string;
    exerciseName: string;
    weight: number;
    repetitions: number;
    timestamp: number;
  }>;
};

export class AnalyticsService {
  static calculateWinScore(comparison: PRComparison): number {
    // Weight changes are weighted more heavily than rep changes
    // Using absolute values to ensure proper comparison
    const weightScore = Math.abs(comparison.weightDiffPercentage) * 1.5;
    const repsScore = Math.abs(comparison.repsDiffPercentage);
    return weightScore + repsScore;
  }

  static async getSessionAnalytics(sessionId: string): Promise<SessionAnalytics> {
    try {
      const sessionRef = doc(db, 'workout_sessions', sessionId);
      const snapshot = await getDoc(sessionRef);
      
      if (!snapshot.exists()) {
        return {
          wins: [],
          losses: [],
          newExercises: []
        };
      }

      const session = snapshot.data() as WorkoutSession;
      return session.analytics || {
        wins: [],
        losses: [],
        newExercises: []
      };
    } catch (error) {
      console.error('Error getting session analytics:', error);
      return {
        wins: [],
        losses: [],
        newExercises: []
      };
    }
  }

  static async saveSessionAnalytics(sessionId: string, analytics: SessionAnalytics): Promise<void> {
    try {
      const sessionRef = doc(db, 'workout_sessions', sessionId);
      await updateDoc(sessionRef, {
        analytics,
        // Update session level summaries
        wins: analytics.wins.map(win => ({
          exerciseName: win.exerciseName,
          type: win.weightDiff > 0 ? 'weight_increase' : 'reps_increase',
          analytics: this.formatComparison(win)
        })),
        losses: analytics.losses.map(loss => ({
          exerciseName: loss.exerciseName,
          type: loss.weightDiff < 0 ? 'weight_decrease' : 'reps_decrease',
          analytics: this.formatComparison(loss)
        }))
      });
    } catch (error) {
      console.error('Error saving session analytics:', error);
      throw error; // Propagate error to handle it in the calling function
    }
  }

  static async processPersonalRecord(
    sessionId: string,
    personalRecord: PersonalRecord,
    newRecord: PRRecord
  ): Promise<SessionAnalytics> {
    try {
      const existingAnalytics = await this.getSessionAnalytics(sessionId);
      console.log('Processing PR:', { personalRecord, newRecord });

      // Find the previous record if it exists
      const previousRecord = personalRecord.records
        .filter(record => record.recordId !== newRecord.recordId)
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      if (!previousRecord) {
        // This is the first record for this exercise
        const newExerciseEntry = {
          exerciseId: personalRecord.exerciseId,
          exerciseName: personalRecord.exerciseName,
          weight: newRecord.weight,
          repetitions: newRecord.repetitions,
          timestamp: newRecord.timestamp
        };

        if (!existingAnalytics.newExercises.some(e => e.exerciseId === personalRecord.exerciseId)) {
          existingAnalytics.newExercises.push(newExerciseEntry);
        }

        console.log('New exercise recorded:', newExerciseEntry);
        await this.saveSessionAnalytics(sessionId, existingAnalytics);
        return existingAnalytics;
      }

      // Calculate differences
      const comparison: PRComparison = {
        exerciseName: personalRecord.exerciseName,
        exerciseId: personalRecord.exerciseId,
        previousRecord,
        currentRecord: newRecord,
        weightDiff: newRecord.weight - previousRecord.weight,
        weightDiffPercentage: ((newRecord.weight - previousRecord.weight) / previousRecord.weight) * 100,
        repsDiff: newRecord.repetitions - previousRecord.repetitions,
        repsDiffPercentage: ((newRecord.repetitions - previousRecord.repetitions) / previousRecord.repetitions) * 100,
        isWin: false,
        timestamp: newRecord.timestamp
      };

      // Determine if this is a win
      comparison.isWin = comparison.weightDiff > 0 || 
        (comparison.weightDiff === 0 && comparison.repsDiff > 0);

      if (comparison.isWin) {
        existingAnalytics.wins.push(comparison);
        
        // Update biggest win if this is a bigger achievement
        if (!existingAnalytics.biggestWin || 
            this.calculateWinScore(comparison) > this.calculateWinScore(existingAnalytics.biggestWin)) {
          existingAnalytics.biggestWin = comparison;
        }
      } else {
        existingAnalytics.losses.push(comparison);
      }

      console.log('Updated analytics:', existingAnalytics);
      await this.saveSessionAnalytics(sessionId, existingAnalytics);
      return existingAnalytics;
    } catch (error) {
      console.error('Error processing personal record:', error);
      throw error;
    }
  }

  static formatComparison(comparison: PRComparison): string {
    const { exerciseName, weightDiff, repsDiff, previousRecord, currentRecord } = comparison;
    
    if (weightDiff !== 0) {
      const direction = weightDiff > 0 ? 'increased' : 'decreased';
      return `${exerciseName} weight ${direction} by ${Math.abs(comparison.weightDiffPercentage).toFixed(1)}% (${previousRecord.weight}kg → ${currentRecord.weight}kg)`;
    }
    
    if (repsDiff !== 0) {
      const direction = repsDiff > 0 ? 'increased' : 'decreased';
      return `${exerciseName} reps ${direction} by ${Math.abs(comparison.repsDiffPercentage).toFixed(1)}% (${previousRecord.repetitions} → ${currentRecord.repetitions})`;
    }
    
    return `${exerciseName} maintained at ${currentRecord.weight}kg for ${currentRecord.repetitions} reps`;
  }

  static formatAnalytics(analytics: SessionAnalytics): string[] {
    const formattedAnalytics: string[] = [];

    // Add new exercises
    analytics.newExercises.forEach(exercise => {
      formattedAnalytics.push(
        `New exercise: ${exercise.exerciseName} (${exercise.weight}kg × ${exercise.repetitions})`
      );
    });

    // Add wins with detailed comparisons
    analytics.wins.forEach(win => {
      formattedAnalytics.push(this.formatComparison(win));
    });

    // Add losses with detailed comparisons
    analytics.losses.forEach(loss => {
      formattedAnalytics.push(this.formatComparison(loss));
    });

    return formattedAnalytics;
  }

  static formatBiggestWin(comparison: PRComparison): string {
    return this.formatComparison(comparison);
  }
} 