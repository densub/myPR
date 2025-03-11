import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseService } from '../services/firebase';
import { ExerciseDoc } from '../types/database';

type ExercisePickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseDoc) => void;
  currentExercises?: Array<{ exerciseId: string; name: string }>;
};

export function ExercisePicker({ 
  visible, 
  onClose, 
  onSelect,
  currentExercises = [] 
}: ExercisePickerProps) {
  const [searchText, setSearchText] = useState('');
  const [exercises, setExercises] = useState<ExerciseDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTextRef = useRef(searchText);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize `currentExercises` to avoid unnecessary re-renders
  const memoizedCurrentExercises = useMemo(() => currentExercises.map(e => e.exerciseId), [currentExercises]);

  const fetchExercises = useCallback(async () => {
    const currentSearchText = searchTextRef.current;
    if (!currentSearchText.trim() || currentSearchText.trim().length < 2) {
      setExercises([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const results = await FirebaseService.searchExercises(currentSearchText.trim());
      const filteredResults = results.filter(
        exercise => !memoizedCurrentExercises.includes(exercise.id)
      );
      setExercises(filteredResults);
    } catch (error) {
      console.error('Error searching exercises:', error);
    } finally {
      setLoading(false);
    }
  }, [memoizedCurrentExercises]);

  // Update searchTextRef when searchText changes
  useEffect(() => {
    searchTextRef.current = searchText;
  }, [searchText]);

  // Handle search text changes with debouncing
  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchExercises();
    }, 500);
  }, [fetchExercises]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSearchText('');
      setExercises([]);
      setLoading(false);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    }
  }, [visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleAddNewExercise = useCallback(async () => {
    try {
      const newExercise = await FirebaseService.createExercise(searchText.trim());
      onSelect(newExercise);
      onClose();
    } catch (error) {
      console.error('Error adding exercise:', error);
      Alert.alert('Error', 'Failed to add exercise');
    }
  }, [searchText, onSelect, onClose]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Select Exercise</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#1E1E1E" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={handleSearchTextChange}
              placeholder="Type exercise name..."
              autoFocus
            />

            <ScrollView 
              style={styles.scrollView}
              keyboardShouldPersistTaps="handled"
            >
              {loading ? (
                <View style={styles.loading}>
                  <Text style={styles.loadingText}>Searching exercises...</Text>
                </View>
              ) : exercises.length > 0 ? (
                exercises.map(exercise => (
                  <TouchableOpacity
                    key={`${exercise.id}-${exercise.name}`}
                    style={styles.exerciseItem}
                    onPress={() => onSelect(exercise)}
                  >
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                  </TouchableOpacity>
                ))
              ) : searchText.trim().length >= 2 && !loading ? (
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddNewExercise}
                >
                  <View style={styles.buttonContainer}>
                    <Text style={styles.buttonText}>Add "{searchText}" as new exercise</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
  },
  exerciseItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  exerciseName: {
    fontSize: 16,
  },
  noResults: {
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  addButtonText: {
    color: '#4CAF50',
    fontSize: 16,
  },
  scrollView: {
    maxHeight: '70%',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 