import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import RegistrationScreen from './src/screens/RegistrationScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';

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
  const [loggedInPhone, setLoggedInPhone] = useState('');

  return (
    <View style={styles.container}>
      {currentScreen === 'home' ? (
        <HomeScreen 
          userPhone={loggedInPhone}
          onLogout={() => {
            setCurrentScreen('login');
            setLoggedInPhone('');
          }} 
        />
      ) : currentScreen === 'login' ? (
        <LoginScreen
          initialPhoneNumber={registeredPhone}
          onLoginSuccess={({ phoneNumber }) => {
            setLoggedInPhone(phoneNumber);
            setCurrentScreen('home');
          }}
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
});

export default App;

