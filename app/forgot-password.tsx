import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    Alert, 
    ActivityIndicator, 
    StyleSheet, 
    KeyboardAvoidingView, 
    ScrollView, 
    Platform, 
    TouchableWithoutFeedback, 
    Keyboard 
  } from 'react-native';
  import { useState } from 'react';
  import { router } from 'expo-router';
  import { sendPasswordResetEmail } from 'firebase/auth';
  import { auth } from './config/firebase';
  import { SafeAreaView } from 'react-native-safe-area-context';
  
  export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState('');
  
    // Function to validate email format
    const validateEmail = (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email validation regex
      return emailRegex.test(email);
    };
  
    const handleResetPassword = async () => {
      if (!email) {
        setEmailError('Please enter your email address.');
        return;
      }
  
      if (!validateEmail(email)) {
        setEmailError('Please enter a valid email address.');
        return;
      }
  
      setEmailError(''); // Clear previous errors
  
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, email);
        Alert.alert(
          'Success',
          'Password reset email sent. Please check your inbox.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to send reset email');
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <SafeAreaView style={styles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={styles.flexContainer}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollViewContent} 
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backText}>← Back to Login</Text>
              </TouchableOpacity>
  
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you instructions to reset your password.
              </Text>
  
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailError(''); // Clear error when user starts typing
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, emailError && styles.inputError]}
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>
  
              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={loading}
                style={[styles.button, loading && styles.buttonDisabled]}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Instructions</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    );
  }
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F5F5F5',
    },
    flexContainer: {
      flex: 1,
    },
    scrollViewContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    backButton: {
      marginBottom: 20,
    },
    backText: {
      color: '#4CAF50',
      fontSize: 16,
      fontWeight: '500',
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#1E1E1E',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: '#666',
      marginBottom: 32,
      lineHeight: 24,
    },
    inputContainer: {
      marginBottom: 20,
    },
    input: {
      backgroundColor: '#FFF',
      padding: 16,
      borderRadius: 12,
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#E0E0E0',
      color: '#1E1E1E',
    },
    inputError: {
      borderColor: '#FF4444',
    },
    errorText: {
      color: '#FF4444',
      fontSize: 14,
      marginTop: 4,
    },
    button: {
      backgroundColor: '#4CAF50',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
  