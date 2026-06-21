import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RegistrationScreen from './src/screens/RegistrationScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import FirebaseMessagingService from './src/services/FirebaseMessagingService';

function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <AppContent />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'register' | 'home'>('login');
  const [registeredPhone, setRegisteredPhone] = useState('');
  const [loggedInName, setLoggedInName] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermissionsAndLoadSession = async () => {
      // 1. Check and request notification permissions on app startup
      if (Platform.OS === 'android') {
        const apiLevel = typeof Platform.Version === 'string'
          ? parseInt(Platform.Version, 10)
          : Platform.Version;

        if (apiLevel >= 33) {
          try {
            const hasPermission = await PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            if (!hasPermission) {
              const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
              );
              if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                Alert.alert(
                  'Permission Required',
                  'Notification permission is required to receive updates when the app is closed. Please enable it in Settings.',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Go to Settings',
                      onPress: () => Linking.openSettings(),
                    },
                  ]
                );
              }
            }
          } catch (error) {
            console.error('Error checking permissions:', error);
          }
        }
      }

      // 2. Load the stored user session
      try {
        const [token, phone, name] = await Promise.all([
          AsyncStorage.getItem('apiToken'),
          AsyncStorage.getItem('loggedInPhone'),
          AsyncStorage.getItem('loggedInName'),
        ]);

        if (token && phone) {
          setLoggedInName(name || 'User');
          setApiToken(token);
          FirebaseMessagingService.initialize(token);
          setCurrentScreen('home');
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermissionsAndLoadSession();
  }, []);

  const handleLoginSuccess = async ({ phoneNumber, apiToken: token, fullName }: { phoneNumber: string; apiToken?: string; fullName?: string }) => {
    try {
      setLoggedInName(fullName || 'User');
      if (token) {
        setApiToken(token);
        await Promise.all([
          AsyncStorage.setItem('apiToken', token),
          AsyncStorage.setItem('loggedInPhone', phoneNumber),
          AsyncStorage.setItem('loggedInName', fullName || 'User'),
        ]);
        FirebaseMessagingService.initialize(token);
      }
      setCurrentScreen('home');
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('apiToken'),
        AsyncStorage.removeItem('loggedInPhone'),
        AsyncStorage.removeItem('loggedInName'),
      ]);
      setLoggedInName('');
      setApiToken('');
      setCurrentScreen('login');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentScreen === 'home' ? (
        <HomeScreen 
          userName={loggedInName}
          onUpdateName={async (newName) => {
            setLoggedInName(newName);
            await AsyncStorage.setItem('loggedInName', newName);
          }}
          apiToken={apiToken}
          onLogout={handleLogout} 
        />
      ) : currentScreen === 'login' ? (
        <LoginScreen
          initialPhoneNumber={registeredPhone}
          onLoginSuccess={handleLoginSuccess}
          onNavigateToRegister={() => setCurrentScreen('register')}
        />
      ) : (
        <RegistrationScreen
          onNavigateToLogin={(phone) => {
            if (phone) {
              setRegisteredPhone(phone);
            }
            setCurrentScreen('login');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0914', // Match the RegistrationScreen background
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0914',
  },
});

export default App;

