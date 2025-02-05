import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Schedule } from '../types/database';
import { FirebaseService } from '../services/firebase';
import { auth } from '../config/firebase';

interface ScheduleContextType {
  schedules: Record<number, Schedule>;
  loading: boolean;
  refreshSchedules: (showLoading?: boolean) => Promise<void>;
  updateSchedule: (dayIndex: number, schedule: Schedule) => void;
}

type SessionState = {
  isActive: boolean;
  isPaused: boolean;
  elapsedTime: number;
  currentScheduleId?: string;
  currentSessionId?: string;
};

const ScheduleContext = createContext<{
  schedules: Record<number, Schedule>;
  loading: boolean;
  refreshSchedules: (showLoading?: boolean) => Promise<void>;
  updateSchedule: (dayIndex: number, schedule: Schedule) => void;
  sessionState: SessionState;
  updateSessionState: (state: Partial<SessionState>) => void;
}>({
  schedules: {},
  loading: true,
  refreshSchedules: async () => {},
  updateSchedule: () => {},
  sessionState: {
    isActive: false,
    isPaused: false,
    elapsedTime: 0,
    currentScheduleId: undefined,
    currentSessionId: undefined
  },
  updateSessionState: () => {},
});

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [schedules, setSchedules] = useState<Record<number, Schedule>>({});
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>({
    isActive: false,
    isPaused: false,
    elapsedTime: 0,
    currentScheduleId: undefined,
    currentSessionId: undefined
  });
  const timerRef = useRef<NodeJS.Timeout>();

  // Initial load when app starts
  useEffect(() => {
    if (!initialized && auth.currentUser) {
      refreshSchedules(true).then(() => {
        setInitialized(true);
      });
    }
  }, [initialized, auth.currentUser]);

  const refreshSchedules = useCallback(async (showLoading = false) => {
    if (!auth.currentUser) return;
    
    if (showLoading) {
      setLoading(true);
    }

    try {
      const newSchedules = await FirebaseService.getAllSchedules(auth.currentUser.uid);
      setSchedules(newSchedules);
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  const updateSchedule = useCallback((dayIndex: number, schedule: Schedule) => {
    setSchedules(prev => ({
      ...prev,
      [dayIndex]: schedule
    }));
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) return; // Prevent multiple timers
    
    timerRef.current = setInterval(() => {
      setSessionState(prev => ({
        ...prev,
        elapsedTime: prev.elapsedTime + 1
      }));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const resetSession = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    setSessionState({
      isActive: false,
      isPaused: false,
      elapsedTime: 0,
      currentScheduleId: undefined,
      currentSessionId: undefined
    });
  }, []);

  const updateSessionState = useCallback((newState: Partial<SessionState>) => {
    setSessionState(prev => {
      const updated = { ...prev, ...newState };
      
      // Handle complete reset
      if (!updated.isActive && newState.hasOwnProperty('isActive')) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = undefined;
        }
      }
      
      // Start timer when session starts or explicitly unpausing
      if (updated.isActive && !updated.isPaused && !timerRef.current && 
          (newState.hasOwnProperty('isActive') || newState.hasOwnProperty('isPaused'))) {
        startTimer();
      } else if (!updated.isActive || updated.isPaused) {
        stopTimer();
      }
      
      return updated;
    });
  }, [startTimer, stopTimer]);

  const startSession = async (scheduleId: string) => {
    if (!auth.currentUser) return;
    
    const schedule = schedules[parseInt(scheduleId)];
    const sessionId = await FirebaseService.createWorkoutSession(
      scheduleId,
      auth.currentUser.uid,
      schedule
    );

    updateSessionState({
      isActive: true,
      isPaused: false,
      elapsedTime: 0,
      currentScheduleId: scheduleId,
      currentSessionId: sessionId
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <ScheduleContext.Provider value={{ 
      schedules, 
      loading, 
      refreshSchedules, 
      updateSchedule,
      sessionState,
      updateSessionState
    }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedules() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedules must be used within a ScheduleProvider');
  }
  return context;
} 