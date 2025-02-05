import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Animated, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';

type WeightCalculatorProps = {
  isVisible: boolean;
  onClose: () => void;
  onCalculate: (total: number) => void;
};

export default function WeightCalculator({ isVisible, onClose, onCalculate }: WeightCalculatorProps) {
  const [barWeight, setBarWeight] = useState('45');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const slideAnim = useRef(new Animated.Value(0)).current;

  const weights = ['2.5', '5', '10', '25', '35', '45', '55'];

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [isVisible]);

  const calculateTotal = () => {
    const total = Object.entries(quantities).reduce((sum, [weight, qty]) => {
      return sum + (parseFloat(weight) * (parseInt(qty) || 0));
    }, parseFloat(barWeight) || 0);
    onCalculate(total);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <Animated.View 
              style={[
                styles.modalContent,
                {
                  transform: [{
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0]
                    })
                  }]
                }
              ]}
            >
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="arrow-back" size={24} color="#1E1E1E" />
                </TouchableOpacity>
                <Text style={styles.title}>BAR WEIGHT</Text>
                <TextInput
                  style={styles.barWeightInput}
                  value={barWeight}
                  onChangeText={setBarWeight}
                  keyboardType="numeric"
                />
              </View>

              <ScrollView 
                style={styles.weightsContainer}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.headerRow}>
                  <Text style={styles.columnHeader}>Weight</Text>
                  <Text style={styles.columnHeader}>QTY</Text>
                </View>

                {weights.map(weight => (
                  <View key={weight} style={styles.weightRow}>
                    <Text style={styles.weightText}>{weight}</Text>
                    <TextInput
                      style={styles.qtyInput}
                      value={quantities[weight] || ''}
                      onChangeText={(text) => setQuantities(prev => ({ ...prev, [weight]: text }))}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity 
                style={styles.calculateButton}
                onPress={calculateTotal}
              >
                <Text style={styles.calculateButtonText}>Calculate</Text>
              </TouchableOpacity>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
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
  keyboardView: {
    flex: 1,
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
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 20,
    color: '#666',
  },
  barWeightInput: {
    backgroundColor: '#E8E8E8',
    padding: 10,
    borderRadius: 8,
    marginLeft: 'auto',
    width: 80,
    textAlign: 'center',
    fontSize: 16,
  },
  weightsContainer: {
    maxHeight: 400,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  columnHeader: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  weightText: {
    fontSize: 16,
  },
  qtyInput: {
    backgroundColor: '#E8E8E8',
    padding: 10,
    borderRadius: 8,
    width: 80,
    textAlign: 'center',
    fontSize: 16,
  },
  calculateButton: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  calculateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 