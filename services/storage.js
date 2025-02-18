import AsyncStorage from '@react-native-async-storage/async-storage';

const TRANSACTIONS_KEY = '@transactions';

export async function loadTransactions() {
  try {
    const jsonValue = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.warn('Error loading transactions:', e);
    return [];
  }
}

export async function saveTransactions(transactions) {
  try {
    const jsonValue = JSON.stringify(transactions);
    await AsyncStorage.setItem(TRANSACTIONS_KEY, jsonValue);
  } catch (e) {
    console.warn('Error saving transactions:', e);
  }
}
