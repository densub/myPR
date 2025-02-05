import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseService } from '../../services/firebase';
import debounce from 'lodash/debounce';
import { User } from '../../types/database';

type UserSuggestion = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  photoURL?: string;
};

export default function SearchModal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);

  const searchUsers = debounce(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const results = await FirebaseService.searchUsers(searchQuery);
      setSuggestions(results.map(user => ({
        id: user.uid,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoURL: user.photoURL
      })));
    } catch (error) {
      console.error('Error searching users:', error);
    }
  }, 300);

  const handleUserSelect = (userId: string) => {
    router.push({
      pathname: '/(authenticated)/(modals)/profile' as const,
      params: { userId }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E1E1E" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Search users by username"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchUsers(text);
            }}
            autoFocus
          />
        </View>
      </View>

      <FlatList
        data={suggestions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.suggestionItem}
            onPress={() => handleUserSelect(item.id)}
          >
            <View style={styles.avatar}>
              {item.photoURL ? (
                <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={24} color="#666" />
              )}
            </View>
            <View>
              <Text style={styles.username}>@{item.username}</Text>
              <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
            </View>
          </TouchableOpacity>
        )}
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
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 40,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  name: {
    fontSize: 14,
    color: '#666',
  },
}); 