import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Keyboard, Platform, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { auth } from './config/firebase';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  Easing
} from 'react-native-reanimated';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { FirebaseService } from './services/firebase';
import { Ionicons } from '@expo/vector-icons';

// Update interface to remove phoneNumber
interface FormErrors {
  firstName?: boolean;
  lastName?: boolean;
  username?: boolean;
  email?: boolean;
  password?: boolean;
  confirmPassword?: boolean;
}

export default function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'available' | 'taken' | 'checking' | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const formPosition = useSharedValue(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        formPosition.value = withTiming(-100, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }
    );
    
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        formPosition.value = withTiming(0, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const checkUsername = async () => {
      if (username.length < 3) {
        setUsernameStatus(null);
        return;
      }

      setUsernameStatus('checking');
      try {
        const isAvailable = await FirebaseService.isUsernameAvailable(username);
        setUsernameStatus(isAvailable ? 'available' : 'taken');
        if (!isAvailable) {
          setError('Username already taken');
        }
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameStatus(null);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: formPosition.value }]
    };
  });

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const newErrors: FormErrors = {
      firstName: !firstName.trim(),
      lastName: !lastName.trim(),
      username: !username.trim() || usernameStatus === 'taken',
      email: !email.trim() || !emailRegex.test(email),
      password: !password || password.length < 6,
      confirmPassword: password !== confirmPassword
    };

    setFormErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: `${firstName} ${lastName}`
        });

        await FirebaseService.createUserProfile(userCredential.user.uid, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim(),
          email: email.trim()
        });
      }

      router.replace('/(authenticated)/(tabs)/schedule');
    } catch (error) {
      console.error(error);
      // Handle specific Firebase errors here if needed
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.content, animatedStyle]}>
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.logo}
        />

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <Text style={styles.title}>Sign Up</Text>
            <Text style={styles.subtitle}>Create your account</Text>

            <Text style={styles.label}>FIRST NAME</Text>
            <TextInput
              style={[
                styles.input,
                formErrors.firstName && styles.inputError
              ]}
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                setFormErrors(prev => ({ ...prev, firstName: false }));
              }}
              placeholder="John"
              placeholderTextColor="#999"
            />
            {formErrors.firstName && (
              <Text style={styles.errorText}>First name is required</Text>
            )}

            <Text style={styles.label}>LAST NAME</Text>
            <TextInput
              style={[
                styles.input,
                formErrors.lastName && styles.inputError
              ]}
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                setFormErrors(prev => ({ ...prev, lastName: false }));
              }}
              placeholder="Doe"
              placeholderTextColor="#999"
            />
            {formErrors.lastName && (
              <Text style={styles.errorText}>Last name is required</Text>
            )}

            <Text style={styles.label}>USERNAME</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  formErrors.username && styles.inputError,
                  usernameStatus === 'available' && styles.inputSuccess
                ]}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setFormErrors(prev => ({ ...prev, username: false }));
                }}
                placeholder="johndoe"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
              {usernameStatus === 'checking' && (
                <ActivityIndicator 
                  style={styles.inputIcon} 
                  size="small" 
                  color="#666" 
                />
              )}
              {usernameStatus === 'available' && (
                <Ionicons 
                  name="checkmark-circle" 
                  size={24} 
                  color="#4CAF50" 
                  style={styles.inputIcon} 
                />
              )}
              {usernameStatus === 'taken' && (
                <Ionicons 
                  name="close-circle" 
                  size={24} 
                  color="#FF3B30" 
                  style={styles.inputIcon} 
                />
              )}
            </View>
            {formErrors.username && (
              <Text style={styles.errorText}>Username is required and must be available</Text>
            )}

            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={[
                styles.input,
                formErrors.email && styles.inputError
              ]}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setFormErrors(prev => ({ ...prev, email: false }));
              }}
              placeholder="john@example.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {formErrors.email && (
              <Text style={styles.errorText}>Email is required and must be valid</Text>
            )}

            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={[
                styles.input,
                formErrors.password && styles.inputError
              ]}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setFormErrors(prev => ({ ...prev, password: false }));
              }}
              placeholder="******"
              secureTextEntry
              placeholderTextColor="#999"
            />
            {formErrors.password && (
              <Text style={styles.errorText}>Password is required and must be at least 6 characters long</Text>
            )}

            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <TextInput
              style={[
                styles.input,
                formErrors.confirmPassword && styles.inputError
              ]}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setFormErrors(prev => ({ ...prev, confirmPassword: false }));
              }}
              placeholder="******"
              secureTextEntry
              placeholderTextColor="#999"
            />
            {formErrors.confirmPassword && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}

            <TouchableOpacity 
              style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
            >
              <Text style={styles.signupButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 100,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: -60,
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  form: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingRight: 44,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  signupButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
    top: 13,
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  inputSuccess: {
    borderColor: '#4CAF50',
    backgroundColor: '#F5FFF5',
  },
}); 