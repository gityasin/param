import React, { createContext, useReducer, useContext, useEffect, useState } from 'react';
import { loadTransactions, saveTransactions, getStoredGoldPrices, fetchAndStoreGoldPrices } from '../services/storage';
import { scheduleGoldPriceFetch, cleanupGoldPriceFetch } from '../services/goldPriceScheduler';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initialState = {
  transactions: [],
};

// Filter types
const FILTER_TYPES = {
  monthly: 'monthly',  // Now represents last 30 days, not current month
  allTime: 'allTime',
  custom: 'custom',
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
      // Sort by date descending (newest first) and then by ID descending (most recently added first)
      const sortedTransactions = normalizedTransactions.sort((a, b) => {
        const dateComparison = new Date(b.date) - new Date(a.date);
        return dateComparison === 0 ? parseInt(b.id) - parseInt(a.id) : dateComparison;
      });
      return { ...state, transactions: sortedTransactions };

    case 'ADD_TRANSACTION':
      // Case-insensitive category matching for new transactions
      const existingCategory = state.transactions.find(tx => 
        tx.category && tx.category.toLowerCase() === action.payload.category.toLowerCase()
      );
      const newTransaction = {
        ...action.payload,
        category: existingCategory?.category || action.payload.category,
        isRecurring: Boolean(action.payload.isRecurring),
        // Ensure type field is set (expense, income, or investment)
        type: action.payload.type || (action.payload.amount < 0 ? 'expense' : 'income')
      };
      const transactionsWithNew = [...state.transactions, newTransaction]
        .sort((a, b) => {
          const dateComparison = new Date(b.date) - new Date(a.date);
          return dateComparison === 0 ? parseInt(b.id) - parseInt(a.id) : dateComparison;
        });
      return { 
        ...state, 
        transactions: transactionsWithNew
      };

    case 'UPDATE_TRANSACTION':
      // Case-insensitive category matching when updating
      const updatedExistingCategory = state.transactions.find(tx => 
        tx.category && tx.category.toLowerCase() === action.payload.category.toLowerCase()
      );
      const modifiedTransactions = state.transactions
        .map(tx =>
          tx.id === action.payload.id ? {
            ...action.payload,
            category: updatedExistingCategory?.category || action.payload.category,
            isRecurring: Boolean(action.payload.isRecurring),
            // Ensure type field is set (expense, income, or investment)
            type: action.payload.type || (action.payload.amount < 0 ? 'expense' : 'income')
          } : tx
        )
        .sort((a, b) => {
          const dateComparison = new Date(b.date) - new Date(a.date);
          return dateComparison === 0 ? parseInt(b.id) - parseInt(a.id) : dateComparison;
        });
      
      console.log("Updated transactions:", modifiedTransactions);
      return {
        ...state,
        transactions: modifiedTransactions
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
  const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.monthly);
  const [customDateRange, setCustomDateRange] = useState(null);
  const [goldPrices, setGoldPrices] = useState(null);

  // Load saved filter and custom date range on mount
  useEffect(() => {
    const loadSavedFilter = async () => {
      try {
        const [savedFilter, savedCustomRange] = await Promise.all([
          AsyncStorage.getItem('activeFilter'),
          AsyncStorage.getItem('customDateRange'),
        ]);
        
        // First set the custom range if it exists
        if (savedCustomRange) {
          setCustomDateRange(JSON.parse(savedCustomRange));
        }
        
        // Then set the active filter
        if (savedFilter) {
          setActiveFilter(savedFilter);
        }
      } catch (error) {
        console.error('Error loading saved filter:', error);
      }
    };

    loadSavedFilter();
  }, []);

  // Save filter when it changes
  useEffect(() => {
    const saveFilter = async () => {
      try {
        await AsyncStorage.setItem('activeFilter', activeFilter);
      } catch (error) {
        console.error('Error saving filter:', error);
      }
    };

    saveFilter();
  }, [activeFilter]);

  // Filter transactions based on selected time period
  const getFilteredTransactions = () => {
    let filtered;
    switch (activeFilter) {
      case FILTER_TYPES.monthly:
        // Changed from month start to last 30 days
        const last30DaysStart = new Date();
        last30DaysStart.setDate(last30DaysStart.getDate() - 30); // Last 30 days
        last30DaysStart.setHours(0, 0, 0, 0);
        filtered = state.transactions.filter(tx => new Date(tx.date) >= last30DaysStart);
        break;

      case FILTER_TYPES.custom:
        if (!customDateRange?.startDate) {
          filtered = state.transactions;
          break;
        }
        
        const start = new Date(customDateRange.startDate);
        start.setHours(0, 0, 0, 0);
        let end = customDateRange.endDate ? new Date(customDateRange.endDate) : new Date();
        end.setHours(23, 59, 59, 999);

        filtered = state.transactions.filter(tx => {
          const txDate = new Date(tx.date);
          return txDate >= start && txDate <= end;
        });
        break;

      case FILTER_TYPES.allTime:
      default:
        filtered = state.transactions;
        break;
    }

    // Sort transactions by date in descending order (newest first) and then by ID
    return filtered.sort((a, b) => {
      const dateComparison = new Date(b.date) - new Date(a.date);
      return dateComparison === 0 ? parseInt(b.id) - parseInt(a.id) : dateComparison;
    });
  };

  // Calculate totals for filtered transactions
  const getFilteredTotals = () => {
    const filteredTransactions = getFilteredTransactions();
    
    // Calculate investment value
    const investments = filteredTransactions.filter(tx => tx.type === 'investment');
    const investmentValue = investments.reduce((acc, inv) => {
      // Use currentValue for the total investment value
      return acc + (inv.currentValue || 0);
    }, 0);
    
    // Calculate investment purchase total (initial money spent on investments)
    const investmentPurchaseTotal = investments.reduce((acc, inv) => {
      // Add purchase price * quantity plus any fees
      return acc + (inv.purchasePrice * inv.quantity) + (inv.fees || 0);
    }, 0);

    // Calculate investment value difference (gain/loss)
    const investmentValueDifference = investmentValue - investmentPurchaseTotal;
    
    // Calculate traditional income/expense
    const regularTransactions = filteredTransactions.filter(tx => tx.type !== 'investment');
    const income = regularTransactions.filter(tx => tx.amount > 0).reduce((acc, tx) => acc + tx.amount, 0);
    const expenses = regularTransactions.filter(tx => tx.amount < 0).reduce((acc, tx) => acc + tx.amount, 0);
    
    // Total is now income + expenses + investment value difference
    const total = income + expenses + investmentValueDifference;
    
    return {
      total,
      income,
      expenses,
      investmentValue,
      investmentPurchaseTotal,
      investmentValueDifference
    };
  };

  // Handle custom date range changes
  const setCustomRange = async (startDate, endDate = null) => {
    const newRange = { startDate, endDate };
    setCustomDateRange(newRange);
    setActiveFilter(FILTER_TYPES.custom);
    try {
      await AsyncStorage.setItem('customDateRange', JSON.stringify(newRange));
    } catch (error) {
      console.error('Error saving custom range:', error);
    }
  };

  // Modified handleFilterChange to fix persistence issues
  const handleFilterChange = async (filter) => {
    setActiveFilter(filter);
    try {
      await AsyncStorage.setItem('activeFilter', filter);
      
      if (filter === FILTER_TYPES.custom) {
        // When switching to custom, try to restore last custom range if we don't have a current one
        if (!customDateRange?.startDate) {
          const lastRange = await AsyncStorage.getItem('lastCustomRange');
          if (lastRange) {
            const parsedRange = JSON.parse(lastRange);
            setCustomDateRange(parsedRange);
            await AsyncStorage.setItem('customDateRange', JSON.stringify(parsedRange));
          }
        }
      } else if (customDateRange?.startDate) {
        // When switching away from custom, save current range as last range
        await AsyncStorage.setItem('lastCustomRange', JSON.stringify(customDateRange));
      }
    } catch (error) {
      console.error('Error saving filter:', error);
    }
  };

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

  // Get all investments
  const getInvestments = () => {
    return state.transactions.filter(tx => tx.type === 'investment');
  };

  // Calculate investment gain/loss
  const calculateInvestmentGainLoss = (investment) => {
    if (!investment || investment.type !== 'investment') return 0;
    
    const purchaseTotalCost = (investment.purchasePrice * investment.quantity) + (investment.fees || 0);
    return (investment.currentValue || 0) - purchaseTotalCost;
  };

  // Initialize gold price fetching
  useEffect(() => {
    const initializeGoldPrices = async () => {
      // Try to get stored prices first
      const prices = await getStoredGoldPrices();
      
      // Check if we need to fetch fresh prices
      const needsFreshPrices = !prices || (
        prices.lastUpdate && 
        (new Date().getTime() - new Date(prices.lastUpdate).getTime() > 15 * 60 * 1000) // Check if 15 minutes have passed
      );
      
      if (needsFreshPrices) {
        console.log('Fetching fresh gold prices on initialization...');
        const freshPrices = await fetchAndStoreGoldPrices();
        if (freshPrices) {
          setGoldPrices({ prices: freshPrices, lastUpdate: new Date() });
        }
      } else {
        setGoldPrices(prices);
      }

      // Set up the regular refresh schedule
      scheduleGoldPriceFetch();
    };

    initializeGoldPrices();
    
    // Clean up the interval when component unmounts
    return () => {
      cleanupGoldPriceFetch();
    };
  }, []);

  // Update gold investment values periodically
  useEffect(() => {
    if (!goldPrices?.prices) return;

    const goldInvestments = state.transactions.filter(tx => 
      tx.type === 'investment' && tx.assetType === 'Gold'
    );

    if (goldInvestments.length === 0) return;

    const updatedTransactions = state.transactions.map(tx => {
      if (tx.type === 'investment' && tx.assetType === 'Gold' && tx.goldCategory) {
        const currentPrice = goldPrices.prices[tx.goldCategory];
        if (currentPrice) {
          return {
            ...tx,
            currentValue: currentPrice * tx.quantity
          };
        }
      }
      return tx;
    });

    if (JSON.stringify(updatedTransactions) !== JSON.stringify(state.transactions)) {
      dispatch({ type: 'SET_TRANSACTIONS', payload: updatedTransactions });
    }
  }, [goldPrices, state.transactions]);

  // Add getGoldCategories helper
  const getGoldCategories = () => {
    if (!goldPrices?.prices || Object.keys(goldPrices.prices).length === 0) {
      // If no prices yet, return default categories based on the new API
      return [
        'Gram Altın',
        'Çeyrek Altın (Yeni)',
        'Çeyrek Altın (Eski)',
        'Yarım Altın (Yeni)',
        'Yarım Altın (Eski)',
        'Tam Altın (Yeni)',
        'Tam Altın (Eski)',
        'Has Altın',
        'Ata Altın (Yeni)',
        'Ata Altın (Eski)',
        'Beşli Ata Altın (Yeni)',
        'Beşli Ata Altın (Eski)',
        'Gremse Altın (Yeni)',
        'Gremse Altın (Eski)',
        '14 Ayar Altın',
        '22 Ayar Altın'
      ];
    }
    
    // Get all available categories
    const allCategories = Object.keys(goldPrices.prices);
    
    // Define priority categories in the desired order
    const priorityCategories = [
      'Gram Altın',
      'Çeyrek Altın (Yeni)',
      'Çeyrek Altın (Eski)',
      'Yarım Altın (Yeni)',
      'Yarım Altın (Eski)',
      'Tam Altın (Yeni)',
      'Tam Altın (Eski)'
    ];
    
    // Filter out priority categories that exist in our data
    const availablePriorityCategories = priorityCategories.filter(cat => 
      allCategories.includes(cat)
    );
    
    // Get remaining categories (excluding priority ones)
    const remainingCategories = allCategories.filter(cat => 
      !priorityCategories.includes(cat)
    );
    
    // Return priority categories first, then the rest
    return [...availablePriorityCategories, ...remainingCategories];
  };

  return (
    <TransactionsContext.Provider
      value={{
        ...state,
        dispatch,
        selectedCurrency,
        setSelectedCurrency: handleCurrencyChange,
        getFilteredTransactions,
        getFilteredTotals,
        getInvestments,
        calculateInvestmentGainLoss,
        activeFilter,
        FILTER_TYPES,
        handleFilterChange,
        customDateRange,
        setCustomRange,
        getGoldCategories,
        goldPrices,
        setGoldPrices
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  return useContext(TransactionsContext);
}