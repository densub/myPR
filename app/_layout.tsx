import { Stack } from 'expo-router';
import { NotificationProvider } from './contexts/NotificationContext';

export default function RootLayout() {
  return (
    <NotificationProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(authenticated)" options={{ headerShown: false }} />
      </Stack>
    </NotificationProvider>
  );
} 