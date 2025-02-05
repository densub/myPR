import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type WorkoutInfoModalProps = {
  isVisible: boolean;
  onClose: () => void;
  exercises: string[];
  elapsedTime: string;
  analytics: string[];
};

export default function WorkoutInfoModal({ 
  isVisible, 
  onClose, 
  exercises, 
  elapsedTime, 
  analytics 
}: WorkoutInfoModalProps) {
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#FF4444" />
          </TouchableOpacity>

          <Text style={styles.title}>Workout Details</Text>

          <Text style={styles.sectionTitle}>Time Elapsed</Text>
          <Text style={styles.text}>{elapsedTime}</Text>

          <Text style={styles.sectionTitle}>Exercises</Text>
          {exercises.map((exercise, index) => (
            <Text key={index} style={styles.text}>• {exercise}</Text>
          ))}

          <Text style={styles.sectionTitle}>Analytics</Text>
          {analytics.map((item, index) => (
            <Text key={index} style={styles.text}>• {item}</Text>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    marginBottom: 8,
  },
}); 