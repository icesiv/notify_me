import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  StatusBar,
  Alert,
} from 'react-native';
import { API_BASE_URL, getApiHeaders } from '../config/api';

interface LoginScreenProps {
  initialPhoneNumber?: string;
  onLoginSuccess?: (userData: { phoneNumber: string }) => void;
  onNavigateToRegister: () => void;
}

export default function LoginScreen({ initialPhoneNumber, onLoginSuccess, onNavigateToRegister }: LoginScreenProps) {
  // State variables for inputs
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || '');
  const [password, setPassword] = useState('');

  // Focus states for premium visual feedback
  const [activeField, setActiveField] = useState<'phoneNumber' | 'password' | null>(null);

  // Security toggle state
  const [showPassword, setShowPassword] = useState(false);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    phoneNumber?: string;
    password?: string;
  }>({});


  // Toast state for debug purposes
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastAnim.setValue(0);

    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    toastTimeoutRef.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastMessage(null);
      });
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (initialPhoneNumber) {
      setPhoneNumber(initialPhoneNumber);
    }
  }, [initialPhoneNumber]);

  // Simple validation
  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[0-9\s-]{8,15}$/.test(phoneNumber.trim())) {
      newErrors.phoneNumber = 'Enter a valid phone number';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    const apiUrl = `${API_BASE_URL}/login`;
    showToast(`Requesting API: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          phone_number: phoneNumber,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && data.errors) {
          // Map validation errors
          setErrors({
            phoneNumber: data.errors.phone_number?.[0],
            password: data.errors.password?.[0],
          });
        } else if (response.status === 401) {
          Alert.alert('Login Failed', 'Invalid credentials or inactive account.');
        } else {
          Alert.alert('Login Failed', data.message || 'An unexpected error occurred.');
        }
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      const savedPhone = phoneNumber;
      setPhoneNumber('');
      setPassword('');
      if (onLoginSuccess) {
        onLoginSuccess({ phoneNumber: savedPhone });
      }
    } catch (error: any) {
      console.error('Login Error:', error);
      setIsLoading(false);
      const errorMessage = error?.message || 'Could not connect';
      showToast(`Network Error: ${errorMessage}\nURL: ${apiUrl}`);
      Alert.alert(
        'Network Error',
        `Could not connect to the server. Please try again later.\n\nAPI Link:\n${apiUrl}`
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B0914" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand logo container */}
        <View style={styles.headerContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>N</Text>
          </View>
          <Text style={styles.brandTitle}>NotifyMe</Text>
          <Text style={styles.brandSubtitle}>Sign in to access your account</Text>
        </View>

        {/* Input Fields */}
        <View style={styles.formContainer}>
          
          {/* Phone Number Field */}
          <View style={styles.inputWrapper}>
            <Text style={styles.fieldLabel}>Phone Number (User ID)</Text>
            <View style={[
              styles.inputContainer,
              activeField === 'phoneNumber' && styles.inputActive,
              errors.phoneNumber ? styles.inputError : null
            ]}>
              <Text style={styles.inputIcon}>📞</Text>
              <TextInput
                style={styles.textInput}
                placeholder="+1 234 567 8900"
                placeholderTextColor="#64748B"
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: undefined });
                }}
                onFocus={() => setActiveField('phoneNumber')}
                onBlur={() => setActiveField(null)}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
          </View>

          {/* Password Field */}
          <View style={styles.inputWrapper}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={[
              styles.inputContainer,
              activeField === 'password' && styles.inputActive,
              errors.password ? styles.inputError : null
            ]}>
              <Text style={styles.inputIcon}>🔑</Text>
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                onFocus={() => setActiveField('password')}
                onBlur={() => setActiveField(null)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.visibilityButton}
                activeOpacity={0.6}
              >
                <Text style={styles.visibilityText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Forgot Password Helper */}
          <TouchableOpacity style={styles.forgotPasswordContainer} activeOpacity={0.7}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Switch to Register Screen */}
          <TouchableOpacity
            style={styles.registerToggle}
            onPress={onNavigateToRegister}
            activeOpacity={0.7}
          >
            <Text style={styles.registerToggleText}>
              Don't have an account? <Text style={styles.linkText}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {toastMessage && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [60, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.toastContent}>
            <Text style={styles.toastIcon}>🌐</Text>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0914', // Match the elegant ultra dark background
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  logoBadgeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1B2E',
    borderWidth: 1.5,
    borderColor: '#2D2942',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#231F3B',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
    color: '#94A3B8',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    height: '100%',
    padding: 0,
  },
  visibilityButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  visibilityText: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 28,
    marginTop: 4,
  },
  forgotPasswordText: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  registerToggle: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerToggleText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  linkText: {
    color: '#A78BFA',
    fontWeight: '600',
  },
  toastContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    backgroundColor: '#1E1B2E',
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
