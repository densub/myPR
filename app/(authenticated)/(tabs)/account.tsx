import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { auth } from '../../config/firebase';
import { FirebaseService } from '../../services/firebase';
import { useState, useEffect } from 'react';
import { User } from '../../types/database';
import { Ionicons } from '@expo/vector-icons';
import { useSchedules } from '../../contexts/ScheduleContext';

export default function Account() {
  const [user, setUser] = useState<User | null>(null);
  const { schedules } = useSchedules();
  const hasSchedules = Object.keys(schedules).length > 0;

  useEffect(() => {
    const loadUser = async () => {
      if (auth.currentUser) {
        const profile = await FirebaseService.getUserProfile(auth.currentUser.uid);
        setUser(profile);
      }
    };
    loadUser();
  }, []);

  const handleSignOut = async () => {
    await auth.signOut();
    router.replace('/');
  };

  const menuItems = [
    {
      icon: "calendar-outline",
      title: hasSchedules ? "Edit Schedule" : "Create Schedule",
      onPress: () => router.push('/(authenticated)/(modals)/create-schedule'),
      background: "#1E1E1E"
    },
    // {
    //   icon: "person-outline",
    //   title: "My Profile",
    //   onPress: () => router.push({
    //     pathname: '/(authenticated)/(modals)/profile',
    //     params: { userId: auth.currentUser?.uid }
    //   }),
    //   background: "#1E1E1E"
    // },
    {
      icon: "trophy-outline",
      title: "My PRs",
      onPress: () => router.push('/(authenticated)/(modals)/my-prs'),
      background: "#1E1E1E"
    },
    {
      icon: "barbell-outline",
      title: "My Exercises",
      onPress: () => router.push('/(authenticated)/(modals)/my-exercises'),
      background: "#1E1E1E"
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#999" />
          </View>
        </View>
        <Text style={styles.name}>{user ? `${user.firstName} ${user.lastName}` : 'Loading...'}</Text>
        <Text style={styles.handle}>@{user?.username || 'loading'}</Text>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.background }]}>
              <Ionicons name={item.icon as any} size={24} color="#FFF" />
            </View>
            <Text style={styles.menuItemText}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={24} color="#1E1E1E" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.signOutButton}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFF',
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
  avatarContainer: {
    padding: 3,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1E1E1E',
  },
  handle: {
    fontSize: 16,
    color: '#666',
  },
  menuContainer: {
    padding: 20,
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1E1E1E',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
    gap: 8,
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '500',
  },
}); 