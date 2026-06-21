import messaging from '@react-native-firebase/messaging';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import { API_BASE_URL, getApiHeaders } from '../config/api';

class FirebaseMessagingService {
  private currentApiToken: string | null = null;

  public async initialize(apiToken: string) {
    this.currentApiToken = apiToken;
    await this.requestUserPermission();
    await this.getToken();
    this.setupListeners();
  }

  private async requestUserPermission() {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Authorization status:', authStatus);
      }
    } else if (Platform.OS === 'android') {
      const apiLevel = typeof Platform.Version === 'string'
        ? parseInt(Platform.Version, 10)
        : Platform.Version;

      if (apiLevel >= 33) {
        try {
          const hasPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          console.log('Android notification permission status:', hasPermission);
        } catch (error) {
          console.error('Error checking notification permission:', error);
        }
      }
    }
  }

  private async getToken() {
    try {
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      await this.sendTokenToBackend(token);
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  }

  private setupListeners() {
    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived in the foreground!', remoteMessage);
      Alert.alert(
        remoteMessage.notification?.title || 'Notification',
        remoteMessage.notification?.body || ''
      );
    });

    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
    });

    // Handle token refresh
    messaging().onTokenRefresh(async token => {
      console.log('FCM Token refreshed:', token);
      await this.sendTokenToBackend(token);
    });
  }

  private async sendTokenToBackend(fcmToken: string) {
    if (!this.currentApiToken) return;

    try {
      const apiToken = this.currentApiToken; 

      const response = await fetch(`${API_BASE_URL}/update-fcm-token`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          api_token: apiToken,
          fcm_token: fcmToken,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Failed to send FCM token to backend:', data);
      } else {
        console.log('FCM token sent to backend successfully');
      }
    } catch (error) {
      console.error('Error sending token to backend:', error);
    }
  }
}

export default new FirebaseMessagingService();
