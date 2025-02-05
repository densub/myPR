// import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { auth } from '../../config/firebase';
// import { useState, useEffect } from 'react';
// import { FirebaseService } from '../../services/firebase';
// import WorkoutInfoModal from '../../components/WorkoutInfoModal';
// import { router } from 'expo-router';
// import { useNotifications } from '../../contexts/NotificationContext';
// import { useFocusEffect } from '@react-navigation/native';
// import React from 'react';

// type WorkoutPost = {
//   id: string;
//   userId: string;
//   userName: string;
//   timestamp: number;
//   sessionId: string;
//   muscleGroups: string[];
//   biggestWin?: string;
//   elapsedTime: string;
//   exercises: string[];
//   analytics: string[];
// };

// export default function Home() {
//   const { unreadCount } = useNotifications();
//   const [posts, setPosts] = useState<WorkoutPost[]>([]);
//   const [selectedPost, setSelectedPost] = useState<WorkoutPost | null>(null);
//   const [showInfoModal, setShowInfoModal] = useState(false);

//   useEffect(() => {
//     loadPosts();
//   }, []);

//   useFocusEffect(
//     React.useCallback(() => {
//       loadPosts();
//     }, [])
//   );

//   const loadPosts = async () => {
//     try {
//       const workoutPosts = await FirebaseService.getWorkoutPosts();
//       setPosts(workoutPosts);
//     } catch (error) {
//       console.error('Error loading posts:', error);
//     }
//   };

//   return (
//     <ScrollView style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.logo}>My PR</Text>
//         <View style={styles.headerActions}>
//           <TouchableOpacity 
//             style={styles.iconButton}
//             onPress={() => router.push('/(authenticated)/(modals)/search-modal')}
//           >
//             <Ionicons name="search" size={24} color="#1E1E1E" />
//           </TouchableOpacity>

//           <TouchableOpacity 
//             style={styles.iconButton}
//             onPress={() => router.push('/(authenticated)/(modals)/notifications')}
//           >
//             <Ionicons name="notifications-outline" size={24} color="#1E1E1E" />
//             {unreadCount > 0 && (
//               <View style={styles.badge}>
//                 <Text style={styles.badgeText}>{unreadCount}</Text>
//               </View>
//             )}
//           </TouchableOpacity>
//         </View>
//       </View>

//       {posts.map(post => (
//         <View key={post.id} style={styles.post}>
//           <View style={styles.postHeader}>
//             <View style={styles.userInfo}>
//               <View style={styles.avatar}>
//                 {/* Add user avatar image here */}
//               </View>
//               <Text style={styles.userName}>{post.userName}</Text>
//             </View>
//             <TouchableOpacity
//               onPress={() => {
//                 setSelectedPost(post);
//                 setShowInfoModal(true);
//               }}
//             >
//               <Ionicons name="information-circle-outline" size={24} color="#666" />
//             </TouchableOpacity>
//           </View>
          
//           <Text style={styles.message}>
//             Just completed a {post.muscleGroups.join(' and ')} workout today
//           </Text>

//           <Text style={styles.winTitle}>Today's Biggest Win</Text>
//           <Text style={styles.winText}>{post.biggestWin}</Text>
//         </View>
//       ))}

//       <WorkoutInfoModal
//         isVisible={showInfoModal}
//         onClose={() => setShowInfoModal(false)}
//         exercises={selectedPost?.exercises || []}
//         elapsedTime={selectedPost?.elapsedTime || ''}
//         analytics={selectedPost?.analytics || []}
//       />
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F5F5F5',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 20,
//     paddingTop: 60,
//   },
//   logo: {
//     fontSize: 24,
//     fontStyle: 'italic',
//     fontWeight: 'bold',
//   },
//   headerActions: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 15,
//   },
//   iconButton: {
//     position: 'relative',
//     padding: 5,
//   },
//   badge: {
//     position: 'absolute',
//     top: 0,
//     right: 0,
//     backgroundColor: '#FF4444',
//     minWidth: 18,
//     height: 18,
//     borderRadius: 9,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 4,
//   },
//   badgeText: {
//     color: 'white',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   progressBar: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     padding: 20,
//     paddingTop: 0,
//   },
//   progressDot: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//   },
//   post: {
//     backgroundColor: 'white',
//     marginBottom: 20,
//     padding: 20,
//   },
//   postHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 15,
//   },
//   userInfo: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   avatar: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#E8E8E8',
//     marginRight: 10,
//   },
//   userName: {
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   message: {
//     fontSize: 16,
//     marginBottom: 15,
//   },
//   winTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginBottom: 5,
//   },
//   winText: {
//     fontSize: 14,
//   },
//   exerciseImage: {
//     width: '100%',
//     height: 200,
//     marginBottom: 15,
//   },
//   postActions: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     borderTopWidth: 1,
//     borderTopColor: '#E8E8E8',
//     paddingTop: 15,
//   },
//   actionButton: {
//     padding: 5,
//   },
// }); 