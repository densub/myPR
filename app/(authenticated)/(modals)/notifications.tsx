import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseService } from '../../services/firebase';
import { auth } from '../../config/firebase';
import { Notification } from '../../types/database';
import { useNotifications } from '../../contexts/NotificationContext';

export default function NotificationsModal() {
  const { notifications, refreshNotifications } = useNotifications();
  
  console.log('Rendering notifications:', notifications);

  useEffect(() => {
    console.log('Notifications updated:', notifications);
  }, [notifications]);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await FirebaseService.acceptConnectionRequest(requestId);
      await FirebaseService.markNotificationAsRead(requestId);
      refreshNotifications();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const renderNotification = ({ item: notification }: { item: Notification }) => {
    switch (notification.type) {
      case 'connection_request':
        const requestId = notification.data?.requestId;
        return (
          <View style={[styles.notification, !notification.read && styles.unread]}>
            <Text style={styles.notificationText}>
              @{notification.fromUserName} wants to connect with you
            </Text>
            {!notification.read && requestId && (
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={styles.acceptButton}
                  onPress={() => handleAcceptRequest(requestId)}
                >
                  <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineButton}>
                  <Text style={styles.buttonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'connection_accepted':
        return (
          <View style={[styles.notification, !notification.read && styles.unread]}>
            <Text style={styles.notificationText}>
              @{notification.fromUserName} accepted your connection request
            </Text>
          </View>
        );

      case 'workout_completed':
        return (
          <View style={[styles.notification, !notification.read && styles.unread]}>
            <Text style={styles.notificationText}>
              @{notification.fromUserName} completed a {notification.data?.workoutType} workout
            </Text>
            {notification.data?.biggestWin && (
              <Text style={styles.winText}>
                Biggest Win: {notification.data.biggestWin}
              </Text>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#1E1E1E" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    gap: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  list: {
    padding: 20,
  },
  notification: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  unread: {
    backgroundColor: '#E8F4FF',
  },
  notificationText: {
    fontSize: 16,
    marginBottom: 10,
  },
  winText: {
    fontSize: 14,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 4,
    flex: 1,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#FF4444',
    padding: 8,
    borderRadius: 4,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
}); 