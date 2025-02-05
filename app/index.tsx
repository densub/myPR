import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Keyboard, Platform, TouchableWithoutFeedback } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { auth } from './config/firebase';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  Easing
} from 'react-native-reanimated';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: false,
    password: false
  });
  const [showPassword, setShowPassword] = useState(false);

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

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: formPosition.value }]
    };
  });

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const newErrors = {
      email: !email.trim() || !emailRegex.test(email),
      password: !password.trim()
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      if (userCredential.user) {
        router.replace('/(authenticated)/(tabs)/schedule');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.topSection}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logo}
          />
        </View>

        <Animated.View style={[styles.bottomSection, animatedStyle]}>
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Sign in to continue.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrors(prev => ({ ...prev, email: false }));
              }}
              placeholder="email@example.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && (
              <Text style={styles.errorText}>Please enter a valid email</Text>
            )}

            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors(prev => ({ ...prev, password: false }));
                }}
                placeholder="******"
                secureTextEntry={!showPassword}
                placeholderTextColor="#999"
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={24} 
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>Password is required</Text>
            )}

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Logging in...' : 'Log in'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => router.push('/forgot-password')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.signup}
              onPress={() => router.push('/signup')}
            >
              <Text style={styles.signupText}>Sign up!</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  topSection: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    zIndex: 2,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
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
  form: {
    width: '100%',
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
    marginBottom: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginBottom: 16,
    marginTop: -4,
  },
  loginButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    marginTop: 20,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#666',
    fontSize: 14,
  },
  signup: {
    marginTop: 12,
    alignItems: 'center',
  },
  signupText: {
    color: '#666',
    fontSize: 14,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    width: '100%',
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
});