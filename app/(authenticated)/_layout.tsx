import { Stack } from 'expo-router';
import { ScheduleProvider } from '../contexts/ScheduleContext';

export default function AuthenticatedLayout() {
  return (
    <ScheduleProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="(modals)" 
          options={{ 
            presentation: 'modal',
            animation: 'slide_from_bottom'
          }} 
        />
      </Stack>
    </ScheduleProvider>
  );
} 