import React, { useState, useRef } from 'react';
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

interface RegistrationScreenProps {
  onRegisterSuccess?: (userData: { fullName: string; phoneNumber: string }) => void;
  onNavigateToLogin: (registeredPhoneNumber?: string) => void;
}

export default function RegistrationScreen({ onRegisterSuccess, onNavigateToLogin }: RegistrationScreenProps) {
  // State variables for inputs
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Focus states for premium visual feedback (active border highlights)
  const [activeField, setActiveField] = useState<'fullName' | 'phoneNumber' | 'password' | null>(null);

  // Security toggle state
  const [showPassword, setShowPassword] = useState(false);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    phoneNumber?: string;
    password?: string;
    agreement?: string;
  }>({});

  // Success state and animation
  const [isSuccess, setIsSuccess] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Simple validation
  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 3) {
      newErrors.fullName = 'Name must be at least 3 characters';
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[0-9\s-]{8,15}$/.test(phoneNumber.trim())) {
      newErrors.phoneNumber = 'Enter a valid phone number';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!agreeToTerms) {
      newErrors.agreement = 'You must agree to the Terms of Service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          full_name: fullName,
          phone_number: phoneNumber,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && data.errors) {
          // Map backend errors to frontend state
          setErrors({
            fullName: data.errors.full_name?.[0],
            phoneNumber: data.errors.phone_number?.[0],
            password: data.errors.password?.[0],
          });
        } else {
          Alert.alert('Registration Failed', data.message || 'An unexpected error occurred.');
        }
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      setIsSuccess(true);
      
      // Animate success screen fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      if (onRegisterSuccess) {
        onRegisterSuccess({ fullName, phoneNumber });
      }
    } catch (error) {
      console.error('Registration Error:', error);
      setIsLoading(false);
      Alert.alert('Network Error', 'Could not connect to the server. Please try again later.');
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.successContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0914" />
        <Animated.View style={[styles.successCard, { opacity: fadeAnim }]}>
          <View style={styles.successIconWrapper}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Registration Complete!</Text>
          <Text style={styles.successSubtitle}>
            Welcome, <Text style={styles.highlightText}>{fullName}</Text>
          </Text>
          <Text style={styles.successDetails}>
            Your user ID (Phone Number) is: {'\n'}
            <Text style={styles.phoneBadge}>{phoneNumber}</Text>
          </Text>
          <TouchableOpacity 
            style={styles.doneButton}
            onPress={() => {
              const savedPhone = phoneNumber;
              // Reset state for demo purposes
              setIsSuccess(false);
              setFullName('');
              setPhoneNumber('');
              setPassword('');
              setAgreeToTerms(false);
              fadeAnim.setValue(0);
              onNavigateToLogin(savedPhone);
            }}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

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
          <Text style={styles.brandSubtitle}>Create your account to get started</Text>
        </View>

        {/* Input Fields */}
        <View style={styles.formContainer}>
          
          {/* Full Name Field */}
          <View style={styles.inputWrapper}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <View style={[
              styles.inputContainer,
              activeField === 'fullName' && styles.inputActive,
              errors.fullName ? styles.inputError : null
            ]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.textInput}
                placeholder="John Doe"
                placeholderTextColor="#64748B"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                }}
                onFocus={() => setActiveField('fullName')}
                onBlur={() => setActiveField(null)}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>

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

          {/* User Agreements Checkbox */}
          <TouchableOpacity
            style={styles.checkboxWrapper}
            onPress={() => {
              setAgreeToTerms(!agreeToTerms);
              if (errors.agreement) setErrors({ ...errors, agreement: undefined });
            }}
            activeOpacity={0.8}
          >
            <View style={[
              styles.checkboxBox,
              agreeToTerms && styles.checkboxBoxChecked,
              errors.agreement ? styles.checkboxBoxError : null
            ]}>
              {agreeToTerms && <Text style={styles.checkmarkIcon}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the{' '}
              <Text style={styles.linkText}>Terms of Service</Text> and{' '}
              <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
          {errors.agreement && <Text style={styles.errorTextAgreement}>{errors.agreement}</Text>}

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.registerButtonText}>Register</Text>
            )}
          </TouchableOpacity>

          {/* Switch to Login Screen */}
          <TouchableOpacity
            style={styles.loginToggle}
            onPress={() => onNavigateToLogin()}
            activeOpacity={0.7}
          >
            <Text style={styles.loginToggleText}>
              Already have an account? <Text style={styles.linkText}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0914', // Elegant ultra dark background
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7C3AED', // Vivid Indigo/Violet
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
    backgroundColor: '#1E1B2E', // Glassmorphism-style dark input background
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
  errorTextAgreement: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 16,
    marginLeft: 4,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    backgroundColor: '#1E1B2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxBoxChecked: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  checkboxBoxError: {
    borderColor: '#EF4444',
  },
  checkmarkIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  linkText: {
    color: '#A78BFA',
    fontWeight: '600',
  },
  registerButton: {
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
    marginTop: 12,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#0B0914',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successCard: {
    backgroundColor: '#1E1B2E',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#2D2942',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  successIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  successIcon: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 20,
    textAlign: 'center',
  },
  highlightText: {
    color: '#A78BFA',
    fontWeight: 'bold',
  },
  successDetails: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  phoneBadge: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    backgroundColor: '#110E1F',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  doneButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    height: 56,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginToggle: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginToggleText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
