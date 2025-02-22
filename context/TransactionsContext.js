import React, { createContext, useReducer, useContext, useEffect, useState } from 'react';
import { loadTransactions, saveTransactions } from '../services/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initialState = {
  transactions: [],
};

function transactionsReducer(state, action) {
  console.log("Reducer called with action:", action);

  switch (action.type) {
    case 'SET_TRANSACTIONS':
      // Case-insensitive category normalization when loading transactions
      const normalizedTransactions = action.payload.map(tx => {
        if (!tx.category) return tx;
        // Find matching category with proper casing
        const matchingCategory = state.transactions.find(t => 
          t.category && t.category.toLowerCase() === tx.category.toLowerCase()
        );
        return {
          ...tx,
          category: matchingCategory?.category || tx.category
        };
      });
      return { ...state, transactions: normalizedTransactions };

    case 'ADD_TRANSACTION':
      // Case-insensitive category matching for new transactions
      const existingCategory = state.transactions.find(tx => 
        tx.category && tx.category.toLowerCase() === action.payload.category.toLowerCase()
      );
      return { 
        ...state, 
        transactions: [...state.transactions, {
          ...action.payload,
          category: existingCategory?.category || action.payload.category,
          isRecurring: Boolean(action.payload.isRecurring)
        }] 
      };

    case 'UPDATE_TRANSACTION':
      // Case-insensitive category matching when updating
      const updatedExistingCategory = state.transactions.find(tx => 
        tx.category && tx.category.toLowerCase() === action.payload.category.toLowerCase()
      );
      const updatedTransactions = state.transactions.map(tx =>
        tx.id === action.payload.id ? {
          ...action.payload,
          category: updatedExistingCategory?.category || action.payload.category,
          isRecurring: Boolean(action.payload.isRecurring)
        } : tx
      );
      console.log("Updated transactions:", updatedTransactions);
      return {
        ...state,
        transactions: updatedTransactions,
      };

    case 'DELETE_TRANSACTION':
      console.log("Deleting transaction with ID:", action.payload);
      return {
        ...state,
        transactions: state.transactions.filter(tx => tx.id !== action.payload)
      };
    default:
      return state;
  }
}

const TransactionsContext = createContext();

export function TransactionsProvider({ children }) {
  const [state, dispatch] = useReducer(transactionsReducer, initialState);
  const [selectedCurrency, setSelectedCurrency] = useState('TRY');

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [stored, userPreferences] = await Promise.all([
          loadTransactions(),
          AsyncStorage.getItem('userPreferences')
        ]);

        dispatch({ type: 'SET_TRANSACTIONS', payload: stored });
        
        // Check userPreferences (set during onboarding)
        if (userPreferences) {
          const { currency } = JSON.parse(userPreferences);
          if (currency) {
            setSelectedCurrency(currency);
            await AsyncStorage.setItem('selectedCurrency', currency);
          }
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  // Save transactions whenever they change
  useEffect(() => {
    console.log("Saving transactions to storage:", state.transactions);
    saveTransactions(state.transactions);
  }, [state.transactions]);

  // Handle currency changes
  const handleCurrencyChange = async (newCurrency) => {
    if (newCurrency === selectedCurrency) return;

    try {
      // Update both selectedCurrency and userPreferences
      await Promise.all([
        AsyncStorage.setItem('selectedCurrency', newCurrency),
        AsyncStorage.setItem('userPreferences', JSON.stringify({
          ...(await AsyncStorage.getItem('userPreferences').then(prefs => JSON.parse(prefs) || {})),
          currency: newCurrency
        }))
      ]);
      setSelectedCurrency(newCurrency);
    } catch (error) {
      console.error('Error changing currency:', error);
    }
  };

  return (
    <TransactionsContext.Provider 
      value={{ 
        state, 
        dispatch,
        selectedCurrency,
        handleCurrencyChange
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  return useContext(TransactionsContext);
}