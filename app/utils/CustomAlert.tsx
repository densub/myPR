import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

type CustomAlertProps = {
  isVisible: boolean;
  title: string;
  message: string;
  onNo: () => void;
  onYes: () => void;
};

export default function CustomAlert({ isVisible, title, message, onNo, onYes }: CustomAlertProps) {
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.noButton]} 
              onPress={onNo}
            >
              <Text style={styles.buttonText}>No</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.yesButton]}
              onPress={onYes}
            >
              <Text style={styles.buttonText}>Yes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: '#E8E8E8',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
  },
  noButton: {
    backgroundColor: '#FF4444',
  },
  yesButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 