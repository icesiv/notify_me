import {
  getMessaging,
  getToken,
  onMessage,
  setBackgroundMessageHandler,
  onTokenRefresh,
  requestPermission,
  AuthorizationStatus
} from '@react-native-firebase/messaging';
import { Platform, Alert, PermissionsAndroid, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      const messagingInstance = getMessaging();
      const authStatus = await requestPermission(messagingInstance);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

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
      const messagingInstance = getMessaging();
      const token = await getToken(messagingInstance);
      console.log('FCM Token:', token);
      await this.sendTokenToBackend(token);
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  }

  private setupListeners() {
    const messagingInstance = getMessaging();

    // Handle foreground messages
    onMessage(messagingInstance, async remoteMessage => {
      console.log('A new FCM message arrived in the foreground!', remoteMessage);
      await this.processFcmMessage(remoteMessage, true);
    });

    // Handle background messages
    setBackgroundMessageHandler(messagingInstance, async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
      await this.processFcmMessage(remoteMessage, false);
    });

    // Handle token refresh
    onTokenRefresh(messagingInstance, async token => {
      console.log('FCM Token refreshed:', token);
      await this.sendTokenToBackend(token);
    });
  }

  private async processFcmMessage(remoteMessage: any, isForeground: boolean) {
    console.log(`Processing FCM Message (${isForeground ? 'Foreground' : 'Background'}):`, remoteMessage);

    const { data } = remoteMessage;
    if (!data) return;

    const type = data.type || 'general';
    const title = data.title || remoteMessage.notification?.title || 'New Update';
    const body = data.body || remoteMessage.notification?.body || '';

    if (type === 'reminder') {
      try {
        const date = data.date;
        const time = data.time;
        if (!date || !time) return;

        // 1. Save reminder to AsyncStorage
        const stored = await AsyncStorage.getItem('userReminders');
        const reminders = stored ? JSON.parse(stored) : [];
        
        // Avoid duplicate by title + date + time
        const exists = reminders.some((r: any) => 
          r.title.toLowerCase() === title.toLowerCase() && 
          r.date === date && 
          r.time === time
        );

        if (!exists) {
          const newReminder = {
            id: remoteMessage.messageId || Date.now().toString(),
            title: title.trim(),
            date: date.trim(),
            time: time.trim(),
            isEnabled: true,
          };
          reminders.unshift(newReminder);
          await AsyncStorage.setItem('userReminders', JSON.stringify(reminders));
          
          // Emit event to update UI in active views
          DeviceEventEmitter.emit('reminders_updated');
          console.log('Saved new reminder from FCM:', newReminder);
        }

        if (isForeground) {
          Alert.alert('⏰ Reminder Scheduled', `${title}\nScheduled for: ${date} at ${time}`);
        }
      } catch (e) {
        console.error('Error saving FCM reminder:', e);
      }
    } else if (type === 'timer') {
      try {
        const durationSecs = Number(data.duration);
        if (isNaN(durationSecs) || durationSecs <= 0) return;

        const endTime = Date.now() + durationSecs * 1000;
        
        // Save running timer details
        await AsyncStorage.setItem('activeTimerEndTime', String(endTime));
        await AsyncStorage.setItem('activeTimerDuration', String(durationSecs));
        
        DeviceEventEmitter.emit('timer_updated');
        console.log('Saved new active timer from FCM. Ends at:', new Date(endTime));

        if (isForeground) {
          Alert.alert('⏳ Timer Started', `Timer for ${durationSecs} seconds has started!`);
        }
      } catch (e) {
        console.error('Error starting FCM timer:', e);
      }
    } else if (type === 'tasks') {
      try {
        const description = data.body || '';
        const priority = (data.priority || 'low').toLowerCase();
        const dueDate = data.dueDate || '';

        const stored = await AsyncStorage.getItem('userTasks');
        const tasks = stored ? JSON.parse(stored) : [];

        // Check for duplicates
        const isDuplicate = tasks.some((t: any) => 
          t.title.toLowerCase().trim() === title.toLowerCase().trim()
        );

        if (!isDuplicate) {
          const newTask = {
            id: remoteMessage.messageId || Date.now().toString(),
            title: title.trim(),
            description: description.trim() || undefined,
            priority: priority as 'low' | 'medium' | 'high',
            dueDate: dueDate.trim() || undefined,
            isCompleted: false,
          };
          tasks.unshift(newTask);
          await AsyncStorage.setItem('userTasks', JSON.stringify(tasks));

          DeviceEventEmitter.emit('tasks_updated');
          console.log('Saved new task from FCM:', newTask);
          
          if (isForeground) {
            Alert.alert('✅ New Task Added', title);
          }
        } else {
          console.log('Duplicate task skipped:', title);
        }
      } catch (e) {
        console.error('Error saving FCM task:', e);
      }
    } else {
      // General notification
      if (isForeground) {
        Alert.alert(title, body);
      }
    }
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
