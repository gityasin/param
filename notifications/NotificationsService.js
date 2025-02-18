import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler for mobile platforms
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Initialize notifications with proper settings
export async function initializeNotifications() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('daily-reminders', {
        name: 'Daily Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch (error) {
      console.error('Error setting up notification channel:', error);
      throw error;
    }
  }
}

export async function checkNotificationPermissions() {
  try {
    if (Platform.OS === 'web') {
      if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications');
      }
      
      if (Notification.permission === 'granted') {
        return true;
      }
      
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } else {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    }
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    throw error;
  }
}

export async function scheduleDailyReminder() {
  try {
    // Initialize notifications first
    await initializeNotifications();

    // Check permissions
    const hasPermission = await checkNotificationPermissions();
    if (!hasPermission) {
      throw new Error('Notification permissions not granted');
    }

    if (Platform.OS === 'web') {
      // For web, we'll use the browser's notification API
      // Note: This will only show when the page is open
      // We'll store the preference and show notifications when the page is active
      localStorage.setItem('dailyReminderEnabled', 'true');
      
      // Show a test notification to confirm it's working
      new Notification('Notifications Enabled', {
        body: 'You will receive daily reminders at 8 PM when the app is open.',
        // Don't use icon for now as it's causing issues
        // We can add it back later with proper asset handling
      });

      return 'web-notification-enabled';
    } else {
      // Cancel any existing notifications before scheduling new ones
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Schedule the daily reminder for mobile
      const scheduleResult = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Daily Budget Reminder',
          body: "Don't forget to log your expenses today!",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          hour: 20, // 8 PM
          minute: 0,
          repeats: true,
        },
      });

      return scheduleResult;
    }
  } catch (error) {
    console.error('Error scheduling daily reminder:', error);
    throw error;
  }
}

export async function cancelAllNotifications() {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem('dailyReminderEnabled');
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  } catch (error) {
    console.error('Error canceling notifications:', error);
    throw error;
  }
}

export async function getAllScheduledNotifications() {
  try {
    if (Platform.OS === 'web') {
      const isEnabled = localStorage.getItem('dailyReminderEnabled') === 'true';
      return isEnabled ? [{ identifier: 'web-daily-reminder' }] : [];
    } else {
      return await Notifications.getAllScheduledNotificationsAsync();
    }
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    throw error;
  }
}

// For web platform, set up the notification check interval
if (Platform.OS === 'web') {
  setInterval(() => {
    const isEnabled = localStorage.getItem('dailyReminderEnabled') === 'true';
    if (isEnabled && document.visibilityState === 'visible') {
      const now = new Date();
      if (now.getHours() === 20 && now.getMinutes() === 0) {
        new Notification('Daily Budget Reminder', {
          body: "Don't forget to log your expenses today!",
          // Don't use icon for now
        });
      }
    }
  }, 60000); // Check every minute
}
