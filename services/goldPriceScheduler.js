import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { fetchAndStoreGoldPrices } from './storage';
import { Platform } from 'react-native';

const GOLD_FETCH_TASK = 'GOLD_FETCH_TASK';
let webRefreshInterval = null;

// Only define background task on native platforms
if (Platform.OS !== 'web') {
  TaskManager.defineTask(GOLD_FETCH_TASK, async () => {
    try {
      await fetchAndStoreGoldPrices();
      return BackgroundFetch.Result.NewData;
    } catch (error) {
      console.error('Error in background gold fetch:', error);
      return BackgroundFetch.Result.Failed;
    }
  });
}

export async function scheduleGoldPriceFetch() {
  try {
    // Handle web platform differently
    if (Platform.OS === 'web') {
      console.log('Setting up web-based gold price refresh (15 minutes)');
      
      // Clear any existing interval first to prevent duplicates
      if (webRefreshInterval) {
        clearInterval(webRefreshInterval);
      }
      
      // Set up a 15-minute interval for web
      webRefreshInterval = setInterval(async () => {
        console.log('Web timer triggered: Fetching fresh gold prices...');
        try {
          await fetchAndStoreGoldPrices();
          console.log('Successfully refreshed gold prices');
        } catch (error) {
          console.error('Error refreshing gold prices:', error);
        }
      }, 15 * 60 * 1000); // 15 minutes in milliseconds
      
      // Also fetch immediately on setup
      fetchAndStoreGoldPrices()
        .then(() => console.log('Initial gold price fetch completed'))
        .catch(error => console.error('Error in initial gold price fetch:', error));
      
      return;
    }
    
    // For native platforms, use the background fetch API
    await BackgroundFetch.registerTaskAsync(GOLD_FETCH_TASK, {
      minimumInterval: 6 * 60 * 60, // 6 hours
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('Gold price fetch scheduled successfully');
  } catch (error) {
    console.error('Error scheduling gold price fetch:', error);
  }
}

export async function unregisterGoldPriceFetch() {
  try {
    if (Platform.OS === 'web') return;
    
    await BackgroundFetch.unregisterTaskAsync(GOLD_FETCH_TASK);
  } catch (error) {
    console.error('Error unregistering gold price fetch:', error);
  }
}

// Clean up function to prevent memory leaks
export function cleanupGoldPriceFetch() {
  if (Platform.OS === 'web' && webRefreshInterval) {
    console.log('Cleaning up web gold price refresh interval');
    clearInterval(webRefreshInterval);
    webRefreshInterval = null;
  }
}