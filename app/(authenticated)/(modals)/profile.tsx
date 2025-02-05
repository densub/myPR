import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseService } from '../../services/firebase';
import { auth } from '../../config/firebase';
import { User, WorkoutPost } from '../../types/database';

type ProfileParams = {
  userId: string;
};

export default function Profile() {
  const params = useLocalSearchParams<ProfileParams>();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<WorkoutPost[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [stats, setStats] = useState({ sessions: 0, wins: 0 });
  const [incomingRequestId, setIncomingRequestId] = useState<string>();

  useEffect(() => {
    loadProfile();
  }, [params.userId]);

  const loadProfile = async () => {
    if (!params.userId) return;

    try {
      const userData = await FirebaseService.getUserProfile(params.userId);
      setUser(userData);
      
      // Set stats directly from user data
      setStats({
        sessions: userData.stats?.totalSessions || 0,
        wins: userData.stats?.totalWins || 0
      });

      // Load connection status
      if (auth.currentUser) {
        const connectionStatus = await FirebaseService.getConnectionStatus(
          auth.currentUser.uid,
          params.userId
        );
        setIsConnected(connectionStatus.isConnected);
        setIsPending(connectionStatus.isPending);
        setIncomingRequestId(connectionStatus.incomingRequest);

        // Only load posts if connected or viewing own profile
        if (connectionStatus.isConnected || auth.currentUser.uid === params.userId) {
          const userPosts = await FirebaseService.getUserPosts(params.userId);
          setPosts(userPosts);
        } else {
          setPosts([]);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleConnect = async () => {
    if (!auth.currentUser || !params.userId) {
      console.error('Missing user information');
      return;
    }

    try {
      await FirebaseService.sendConnectionRequest(auth.currentUser.uid, params.userId);
      setIsPending(true);
    } catch (error) {
      console.error('Error sending connection request:', error);
      Alert.alert('Error', 'Failed to send connection request. Please try again.');
    }
  };

  const handleAcceptRequest = async () => {
    if (!incomingRequestId) return;

    try {
      await FirebaseService.acceptConnectionRequest(incomingRequestId);
      setIsConnected(true);
      setIsPending(false);
      setIncomingRequestId(undefined);
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request. Please try again.');
    }
  };

  const handleRemoveConnection = async () => {
    if (!auth.currentUser || !params.userId) return;

    try {
      await FirebaseService.removeConnection(auth.currentUser.uid, params.userId);
      setIsConnected(false);
      setPosts([]); // Clear posts immediately
      Alert.alert('Success', 'Connection removed successfully');
    } catch (error) {
      console.error('Error removing connection:', error);
      Alert.alert('Error', 'Failed to remove connection. Please try again.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      Alert.alert(
        'Delete Post',
        'Are you sure you want to delete this post?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await FirebaseService.deleteWorkoutPost(postId);
              // Refresh posts
              loadProfile();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E1E1E" />
        </TouchableOpacity>
      </View>

      <View style={styles.profile}>
        <View style={styles.avatar}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={40} color="#666" />
          )}
        </View>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.username}>@{user?.username}</Text>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.sessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
        </View>

        {auth.currentUser?.uid !== params.userId && (
          <>
            {isConnected ? (
              <TouchableOpacity 
                style={[styles.connectButton, styles.removeButton]}
                onPress={handleRemoveConnection}
              >
                <Text style={styles.connectButtonText}>Remove -</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.connectButton, 
                  isPending && (incomingRequestId ? styles.acceptButton : styles.pendingButton)
                ]}
                onPress={incomingRequestId ? handleAcceptRequest : handleConnect}
                disabled={isPending && !incomingRequestId}
              >
                <Text style={styles.connectButtonText}>
                  {incomingRequestId ? 'Accept' : isPending ? 'Request Sent' : 'Add +'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {posts.map(post => (
        <View key={post.id} style={styles.post}>
          <Text style={styles.postMessage}>
            Just completed a {post.muscleGroups.join(' and ')} workout today
          </Text>
          <Text style={styles.winTitle}>Today's Biggest Win</Text>
          <Text style={styles.winText}>{post.biggestWin}</Text>
          
          {auth.currentUser?.uid === params.userId && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => handleDeletePost(post.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF4444" />
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
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
  },
  profile: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  connectButton: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  pendingButton: {
    backgroundColor: '#666',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  post: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 8,
  },
  postMessage: {
    fontSize: 16,
    marginBottom: 15,
  },
  winTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  winText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  removeButton: {
    backgroundColor: '#FF4444',
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
}); 