import { View } from 'react-native';
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function AddPR() {
  useEffect(() => {
    // Immediately redirect to the add-pr modal
    router.push('/(authenticated)/(modals)/add-pr');
  }, []);

  return <View />;
} 