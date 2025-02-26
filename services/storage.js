import AsyncStorage from '@react-native-async-storage/async-storage';

const TRANSACTIONS_KEY = '@transactions';
const GOLD_PRICES_KEY = '@goldPrices';
const LAST_GOLD_UPDATE_KEY = '@lastGoldUpdate';

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

export async function fetchAndStoreGoldPrices() {
  // Define fallback prices that will be used if the API call fails
  const fallbackPrices = {
    'Gram Altın': 3475.89,
    'Has Altın': 3493.36,
    'Çeyrek Altın (Yeni)': 5694.00,
    'Çeyrek Altın (Eski)': 5624.00,
    'Yarım Altın (Yeni)': 11388.00,
    'Yarım Altın (Eski)': 11284.00,
    'Tam Altın (Yeni)': 22707.00,
    'Tam Altın (Eski)': 22462.00,
    'Ata Altın (Yeni)': 23318.00,
    'Ata Altın (Eski)': 23266.00,
    'Beşli Ata Altın (Yeni)': 116154.00,
    'Beşli Ata Altın (Eski)': 115805.00,
    'Gremse Altın (Yeni)': 56418.00,
    'Gremse Altın (Eski)': 56243.00,
    '14 Ayar Altın': 1896.28,
    '22 Ayar Altın': 3176.96,
    'Ons Altın': 2920.30,
    'USD/KG': 95420.00,
    'EUR/KG': 90960.00,
    'Altın/Gümüş Oranı': 91.79,
    'Gümüş (TL/Gram)': 36.72,
    'Gümüş (Ons)': 31.77,
    'Gümüş (USD)': 1009.00,
    'Platin (Ons)': 967.00,
    'Paladyum (Ons)': 934.00,
    'Platin (USD)': 26090.00,
    'Paladyum (USD)': 20030.00
  };

  // Get previously stored prices (if any) to use for fallback
  let cachedPrices = fallbackPrices;
  try {
    const storedPrices = await AsyncStorage.getItem(GOLD_PRICES_KEY);
    if (storedPrices) {
      cachedPrices = JSON.parse(storedPrices);
      console.log('Retrieved cached gold prices');
    }
  } catch (storageError) {
    console.warn('Error retrieving stored prices:', storageError);
  }

  try {
    // Attempt to fetch from API with a timeout
    console.log('Fetching gold prices from API...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch('http://209.38.188.91/gold-prices', {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'X-API-KEY': 'betul_altin_sever_53'
      },
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Handle non-successful responses
    if (!response.ok) {
      console.warn(`API returned error status: ${response.status}`);
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    
    // Debug log to check API response structure
    console.log('Gold API Response received');
    
    // Extract gold categories and their prices from the array
    const goldPrices = {};
    
    // Map API names to our display categories
    const categoryMappings = {
      'GRAM_ALTIN': 'Gram Altın',
      'HAS_ALTIN': 'Has Altın',
      'YENI_CEYREK': 'Çeyrek Altın (Yeni)',
      'ESKI_CEYREK': 'Çeyrek Altın (Eski)',
      'YENI_YARIM': 'Yarım Altın (Yeni)',
      'ESKI_YARIM': 'Yarım Altın (Eski)',
      'YENI_TAM': 'Tam Altın (Yeni)',
      'ESKI_TAM': 'Tam Altın (Eski)',
      'YENI_ATA': 'Ata Altın (Yeni)',
      'ESKI_ATA': 'Ata Altın (Eski)',
      'YENI_ATA5': 'Beşli Ata Altın (Yeni)',
      'ESKI_ATA5': 'Beşli Ata Altın (Eski)',
      'YENI_GREMSE': 'Gremse Altın (Yeni)',
      'ESKI_GREMSE': 'Gremse Altın (Eski)',
      '14_AYAR': '14 Ayar Altın',
      '22_AYAR': '22 Ayar Altın',
      'ONS': 'Ons Altın',
      'USD_KG': 'USD/KG',
      'EUR_KG': 'EUR/KG',
      'ALTIN_GUMUS': 'Altın/Gümüş Oranı',
      'GUMUS_TL': 'Gümüş (TL/Gram)',
      'GUMUS_ONS': 'Gümüş (Ons)',
      'GUMUS_USD': 'Gümüş (USD)',
      'PLATIN_ONS': 'Platin (Ons)',
      'PALADYUM_ONS': 'Paladyum (Ons)',
      'PLATIN_USD': 'Platin (USD)',
      'PALADYUM_USD': 'Paladyum (USD)'
    };

    // Check if we have the expected structure (array of objects)
    if (Array.isArray(data)) {
      // Process each item in the array
      data.forEach(item => {
        if (item.name && item.alis && categoryMappings[item.name]) {
          try {
            // Parse price by replacing comma with period and removing any spaces or non-numeric characters
            const priceStr = item.alis.replace(/\./g, '').replace(',', '.').trim();
            const price = parseFloat(priceStr);
            
            if (!isNaN(price)) {
              goldPrices[categoryMappings[item.name]] = price;
            }
          } catch (parseError) {
            console.warn(`Failed to parse price for ${item.name}: ${item.alis}`, parseError);
          }
        }
      });
    }

    // Count the number of successful categories from API
    const fetchedCategories = Object.keys(goldPrices).length;
    const totalExpectedCategories = Object.keys(categoryMappings).length;
    
    // Check if we got all the expected categories
    if (fetchedCategories === 0) {
      console.warn('No valid gold prices found in API response, using cached values');
      // Use cached prices (which might be fallback prices)
      Object.assign(goldPrices, cachedPrices);
    } else if (fetchedCategories < totalExpectedCategories) {
      console.warn(`Partial data received from API: ${fetchedCategories}/${totalExpectedCategories} categories`);
      
      // For each expected category, use the fetched value if available, otherwise use cached value
      Object.values(categoryMappings).forEach(category => {
        if (!goldPrices[category] && cachedPrices[category]) {
          console.log(`Using cached value for missing category: ${category}`);
          goldPrices[category] = cachedPrices[category];
        }
      });
    }

    // Check for any missing categories after merging with cached data
    const expectedCategories = Object.values(categoryMappings);
    const missingCategories = expectedCategories.filter(category => !goldPrices[category]);
    
    // If we still have missing categories, fall back to default values for those
    if (missingCategories.length > 0) {
      console.warn(`Still missing ${missingCategories.length} categories after merging with cache`);
      missingCategories.forEach(category => {
        if (fallbackPrices[category]) {
          console.log(`Using fallback value for category: ${category}`);
          goldPrices[category] = fallbackPrices[category];
        }
      });
    }

    console.log(`Final gold prices (${Object.keys(goldPrices).length} categories)`);
    
    // Store and return prices
    await AsyncStorage.setItem(GOLD_PRICES_KEY, JSON.stringify(goldPrices));
    await AsyncStorage.setItem(LAST_GOLD_UPDATE_KEY, new Date().toISOString());
    return goldPrices;
  } catch (error) {
    console.error('Error fetching gold prices:', error.message);
    
    // Use previously retrieved cached prices (which might be fallback prices)
    console.log(`Using cached gold prices due to API error: ${Object.keys(cachedPrices).length} categories`);
    
    // Update the last updated timestamp to reflect we tried to update
    await AsyncStorage.setItem(LAST_GOLD_UPDATE_KEY, new Date().toISOString());
    
    return cachedPrices;
  }
}

export async function getStoredGoldPrices() {
  try {
    const [jsonValue, lastUpdate] = await Promise.all([
      AsyncStorage.getItem(GOLD_PRICES_KEY),
      AsyncStorage.getItem(LAST_GOLD_UPDATE_KEY)
    ]);
    
    if (!jsonValue) return null;

    return {
      prices: JSON.parse(jsonValue),
      lastUpdate: lastUpdate ? new Date(lastUpdate) : null
    };
  } catch (e) {
    console.error('Error getting stored gold prices:', e);
    return null;
  }
}
