import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated, Platform, TouchableOpacity } from 'react-native';
import { TextInput, Button, Switch, Text, HelperText, useTheme, SegmentedButtons, Menu, TouchableRipple } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTransactions } from '../context/TransactionsContext';
import { useCategories } from '../context/CategoriesContext';
import { getCurrencySymbol } from '../services/format';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { fetchAndStoreGoldPrices, getStoredGoldPrices } from '../services/storage';

const CustomSnackbar = ({ visible, message, style }) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.snackbar,
        style,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
        },
      ]}
    >
      <Text style={styles.snackbarText}>{message}</Text>
    </Animated.View>
  );
};

const GhostTextInput = ({ value, suggestion, onChangeText, ...props }) => {
  const theme = useTheme();
  const suggestionText = suggestion && value && suggestion.toLowerCase() !== value.toLowerCase() 
    ? suggestion.slice(value.length) 
    : '';

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        style={[
          props.style,
          { backgroundColor: theme.colors.background }
        ]}
      />
      {suggestionText !== '' && (
        <TextInput
          value={value + suggestionText}
          editable={false}
          style={[
            props.style,
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: 'transparent',
              color: theme.colors.placeholder,
              opacity: 0.5,
            }
          ]}
          mode={props.mode}
          label={props.label}
          pointerEvents="none"
        />
      )}
    </View>
  );
};

// Create a custom centered menu item component
const CenteredMenuItem = ({ title, icon, onPress }) => {
  const theme = useTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      style={styles.centeredMenuItemContainer}
    >
      <View style={styles.centeredMenuItemContent}>
        {icon}
        <Text style={[styles.centeredMenuItemText, { color: theme.colors.text }]}>
          {title}
        </Text>
      </View>
    </TouchableRipple>
  );
};

export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialValuesRef = React.useRef(null);
  
  const { dispatch, selectedCurrency, getGoldCategories, goldPrices, setGoldPrices } = useTransactions();
  const { categories, addCategory, getCategoryIcon, getCategoryColor } = useCategories();
  const theme = useTheme();
  const { colors } = theme;
  const { t } = useLanguage();

  const isEditing = Boolean(params.isEditing);
  const existingTransaction = params.transaction ? JSON.parse(params.transaction) : null;

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [transactionType, setTransactionType] = useState('expense');
  const [errors, setErrors] = useState({});
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showGoldCategoryMenu, setShowGoldCategoryMenu] = useState(false);
  const [isEditable, setIsEditable] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Asset type scroll reference
  const assetTypeScrollRef = useRef(null);
  const [isScrollingAssetTypes, setIsScrollingAssetTypes] = useState(false);
  
  // Investment specific fields
  const [assetType, setAssetType] = useState('Gold');
  const [symbol, setSymbol] = useState('');
  const [assetName, setAssetName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [fees, setFees] = useState('');
  const [goldCategory, setGoldCategory] = useState('');

  const assetTypes = [
    { value: 'Gold', label: t('gold'), icon: 'gold' },
    { value: 'Foreign Currency', label: t('foreignCurrency'), icon: 'currency-usd' },
    { value: 'Stock', label: t('stock'), icon: 'chart-line' },
    { value: 'Mutual Fund', label: t('mutualFund'), icon: 'chart-areaspline' },
    { value: 'Cryptocurrency', label: t('cryptocurrency'), icon: 'bitcoin' },
    { value: 'Bond', label: t('bond'), icon: 'file-certificate' },
    { value: 'ETF', label: t('etf'), icon: 'chart-box' },
    { value: 'Real Estate', label: t('realEstate'), icon: 'home-city' },
    { value: 'Other', label: t('otherAsset'), icon: 'dots-horizontal' },
  ];

  useEffect(() => {
    if (isEditing && existingTransaction && !initialValuesRef.current) {
      initialValuesRef.current = existingTransaction;
      setDescription(existingTransaction.description || '');
      setAmount(existingTransaction.amount ? Math.abs(existingTransaction.amount).toString() : '');
      setCategory(existingTransaction.category || '');
      setTransactionType(existingTransaction.type || (existingTransaction.amount < 0 ? 'expense' : 'income'));
      setIsRecurring(Boolean(existingTransaction.isRecurring));
      const date = new Date(existingTransaction.date);
      date.setHours(23, 59, 59, 999);
      setSelectedDate(date);
      
      // Set investment fields if editing an investment
      if (existingTransaction.type === 'investment') {
        setAssetType(existingTransaction.assetType || 'Stock');
        setSymbol(existingTransaction.symbol || '');
        setAssetName(existingTransaction.name || '');
        setQuantity(existingTransaction.quantity ? existingTransaction.quantity.toString() : '');
        setCurrentValue(existingTransaction.currentValue ? existingTransaction.currentValue.toString() : '');
        setFees(existingTransaction.fees ? existingTransaction.fees.toString() : '');
        setGoldCategory(existingTransaction.goldCategory || '');
      }
    }
  }, [isEditing, existingTransaction]);

  useEffect(() => {
    if (params) {
      // Set transaction type from params
      if (params.type) {
        setTransactionType(params.type);
        
        // Automatically set category to "Investment" for investment transactions
        if (params.type === 'investment') {
          setCategory(t('investment'));
          setIsEditable(false);
        }
      }
      
      // Rest of your existing code...
    }
  }, [params]);

  // Automatically calculate when dependencies change
  useEffect(() => {
    if (transactionType === 'investment' && assetType === 'Gold') {
      console.log('🔄 Gold value dependencies changed, recalculating...');
      calculateGoldValue();
    }
  }, [assetType, goldCategory, goldPrices, quantity, calculateGoldValue, transactionType]);
  
  // Define a single, consistent way to calculate gold value - using useCallback for stability
  const calculateGoldValue = useCallback(async (forceApiCall = false) => {
    console.log('📊 Calculate Gold Value called', forceApiCall ? '(forcing API call)' : '');
    
    if (transactionType !== 'investment' || assetType !== 'Gold') {
      console.log('Not a gold investment, skipping calculation');
      return false;
    }

    // Force API call if requested (for the recalculate button)
    if (forceApiCall) {
      try {
        console.log('Forcing fresh gold prices from API...');
        const freshPrices = await fetchAndStoreGoldPrices();
        if (freshPrices) {
          setGoldPrices({ prices: freshPrices, lastUpdate: new Date() });
          console.log('Successfully updated gold prices from API');
        }
      } catch (error) {
        console.error('Error fetching fresh gold prices:', error);
      }
    }

    if (!goldCategory || !goldPrices?.prices) {
      console.log('Missing required data for calculation');
      return false;
    }

    const goldPrice = goldPrices.prices[goldCategory];
    if (!goldPrice || isNaN(goldPrice)) {
      console.log('Invalid gold price');
      return false;
    }

    const parsedQty = parseFloat(quantity || '0');
    if (isNaN(parsedQty)) {
      console.log('Invalid quantity');
      return false;
    }

    const calculatedValue = (goldPrice * parsedQty).toFixed(2);
    console.log(`Calculated value: ${calculatedValue} (${goldPrice} × ${parsedQty})`);
    
    if (calculatedValue !== currentValue) {
      setCurrentValue(calculatedValue);
      return true;
    }

    return false;
  }, [transactionType, assetType, goldCategory, goldPrices, quantity, currentValue, setGoldPrices]);
  
  // Clean implementation of gold price initialization - runs only once when investment/gold is selected
  useEffect(() => {
    // Only run this effect when we first select gold as the asset type
    if (transactionType === 'investment' && assetType === 'Gold') {
      console.log('🔶 Initializing gold data - one time setup');
      
      const initializeGoldData = async () => {
        try {
          // First try to get stored prices
          let prices = await getStoredGoldPrices();
          
          // If no prices available or they're too old (15 minutes), fetch fresh ones
          if (!prices?.prices || Object.keys(prices.prices).length === 0 || 
              (prices.lastUpdate && (new Date().getTime() - new Date(prices.lastUpdate).getTime() > 15 * 60 * 1000))) {
            console.log('Fetching fresh gold prices...');
            const freshPrices = await fetchAndStoreGoldPrices();
            if (freshPrices) {
              prices = { prices: freshPrices, lastUpdate: new Date() };
              if (typeof setGoldPrices === 'function') {
                setGoldPrices(prices);
              }
            }
          } else if (prices && typeof setGoldPrices === 'function') {
            console.log('Using stored gold prices');
            setGoldPrices(prices);
          }
          
          // Set a default gold category if needed
          const categories = getGoldCategories();
          if (categories.length > 0 && !goldCategory) {
            console.log('Setting default gold category (one-time)');
            setGoldCategory(categories[0]);
          }
        } catch (error) {
          console.error('Error initializing gold prices:', error);
        }
      };
      
      initializeGoldData();
    }
  }, [transactionType, assetType]);

  // Simplified gold value calculation effect - runs only when relevant inputs change
  useEffect(() => {
    if (transactionType === 'investment' && assetType === 'Gold' && goldCategory && quantity && goldPrices?.prices) {
      console.log('Recalculating gold value - inputs changed');
      
      const goldPrice = goldPrices.prices[goldCategory];
      if (goldPrice && !isNaN(goldPrice)) {
        try {
          const parsedQty = parseFloat(quantity || '0');
          if (!isNaN(parsedQty)) {
            const calculatedValue = (goldPrice * parsedQty).toFixed(2);
            console.log(`Calculated value: ${calculatedValue} (${goldPrice} × ${parsedQty})`);
            
            // Only update if value has changed
            if (calculatedValue !== currentValue) {
              setCurrentValue(calculatedValue);
            }
          }
        } catch (error) {
          console.error('Error calculating gold value:', error);
        }
      }
    }
  }, [goldCategory, quantity, goldPrices?.prices, transactionType, assetType, currentValue]);

  const validateForm = () => {
    const newErrors = {};

    if (!amount) {
      newErrors.amount = t('amountRequired');
    } else if (isNaN(amount) || parseFloat(amount) <= 0) {
      newErrors.amount = t('invalidAmount');
    }

    // Only validate category for non-investment transactions
    if (transactionType !== 'investment' && !category.trim()) {
      newErrors.category = t('categoryRequired');
    }
    
    // Validate investment-specific fields
    if (transactionType === 'investment') {
      if (!quantity || isNaN(quantity) || parseFloat(quantity) <= 0) {
        newErrors.quantity = t('invalidQuantity');
      }
      
      if (!currentValue || isNaN(currentValue) || parseFloat(currentValue) < 0) {
        newErrors.currentValue = t('invalidAmount');
      }
      
      if (fees && (isNaN(fees) || parseFloat(fees) < 0)) {
        newErrors.fees = t('invalidFees');
      }

      if (assetType === 'Gold' && !goldCategory) {
        newErrors.goldCategory = t('goldCategoryRequired');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const parsedAmount = parseFloat(amount);
    // For investments, amount is always positive (representing purchase price)
    const finalAmount = transactionType === 'expense' ? -parsedAmount : parsedAmount;
    const trimmedCategory = category.trim();

    // Find existing category with case-insensitive match
    const existingCategory = categories.find(cat => cat.toLowerCase() === trimmedCategory.toLowerCase());
    const finalCategory = existingCategory || trimmedCategory;

    if (!existingCategory && trimmedCategory) {
      await addCategory(trimmedCategory);
    }

    const transactionData = {
      description: description.trim(),
      amount: finalAmount,
      date: selectedDate.toISOString().split('T')[0],
      category: finalCategory,
      isRecurring,
      type: transactionType,
    };
    
    // Add investment-specific fields if this is an investment
    if (transactionType === 'investment') {
      transactionData.assetType = assetType;
      transactionData.symbol = symbol.trim();
      transactionData.name = assetName.trim();
      transactionData.quantity = parseFloat(quantity);
      transactionData.purchasePrice = parseFloat(amount);
      transactionData.currentValue = parseFloat(currentValue);
      transactionData.purchaseDate = selectedDate.toISOString().split('T')[0];
      
      if (assetType === 'Gold') {
        transactionData.goldCategory = goldCategory;
      }
      
      if (fees && !isNaN(fees) && parseFloat(fees) > 0) {
        transactionData.fees = parseFloat(fees);
      } else {
        transactionData.fees = 0;
      }
    }

    if (isEditing && initialValuesRef.current) {
      const updatePayload = {
        id: initialValuesRef.current.id,
        ...transactionData,
      };
      dispatch({
        type: 'UPDATE_TRANSACTION',
        payload: updatePayload,
      });
    } else {
      const newTransactionId = Date.now().toString();
      dispatch({
        type: 'ADD_TRANSACTION',
        payload: {
          id: newTransactionId,
          ...transactionData,
        },
      });
    }

    setShowSnackbar(true);
    setTimeout(() => {
      setShowSnackbar(false);
      router.back();
    }, 750);
  };

  const handleCategoryIconPress = () => {
    if (!isEditable) {
      setIsEditable(true);
    } else {
      // Add a longer delay before opening the menu
      setTimeout(() => {
        setShowCategoryMenu(true);
      }, 100); // high delay for ios animations
    }
  };

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'web') {
      // For web, we handle the HTML input element event
      if (event && event.target && event.target.value) {
        const selectedDate = new Date(event.target.value);
        // Make sure it's a valid date
        if (!isNaN(selectedDate.getTime())) {
          // Preserve time of the original date
          const originalTime = new Date(date).getTime() % 86400000;
          selectedDate.setTime(selectedDate.getTime() + originalTime);
          setSelectedDate(selectedDate);
        }
      }
      return;
    }

    // Existing mobile platform handling
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    
    if (date) {
      setSelectedDate(date);
    }
  };

  // Modify the gold category menu section
  const goldCategorySection = assetType === 'Gold' && (
    <>
      <View>
        <TouchableRipple
          onPress={() => {
            console.log('Gold category field pressed');
            setShowGoldCategoryMenu(true);
          }}
          style={{ borderRadius: 4 }}
        >
          <TextInput
            mode="outlined"
            label={`${t('goldCategory')} *`}
            value={goldCategory}
            editable={false}
            error={!!errors.goldCategory}
            style={[styles.input, styles.clickableInput]}
            pointerEvents="none"
            right={
              <TextInput.Icon 
                icon="chevron-down"
                disabled={true}
                style={{ opacity: 0.7 }}
              />
            }
          />
        </TouchableRipple>
        <Menu
          visible={showGoldCategoryMenu}
          onDismiss={() => setShowGoldCategoryMenu(false)}
          anchor={{x: 0, y: 0}}
          style={Platform.select({
            web: {
              position: 'fixed',
              top: '30%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '95%',
              maxWidth: 500
            },
            default: {
              width: '90%',
              maxWidth: 500,
              alignSelf: 'center',
              marginTop: 40,
              borderRadius: 8,
              elevation: 8
            }
          })}
          contentStyle={[
            { backgroundColor: colors.surface },
            Platform.select({
              web: {
                maxHeight: '50vh',
                overflowY: 'auto',
                padding: 8
              },
              default: {
                maxHeight: '70%',
                padding: 8
              }
            }),
          ]}
        >
          <View style={styles.goldCategoryMenuHeader}>
            <Text style={styles.goldCategoryMenuTitle}>{t('selectGoldCategory')}</Text>
          </View>
          {getGoldCategories().length > 0 ? (
            getGoldCategories().map((category) => (
              <TouchableRipple
                key={category}
                onPress={() => {
                  console.log('Selected gold category:', category);
                  setGoldCategory(category);
                  setShowGoldCategoryMenu(false);
                  setErrors({ ...errors, goldCategory: '' });
                  
                  // Force immediate calculation with the new category
                  setTimeout(() => {
                    if (quantity && goldPrices?.prices) {
                      console.log('Forcing calculation after category selection');
                      const goldPrice = goldPrices.prices[category];
                      if (goldPrice && !isNaN(goldPrice)) {
                        const parsedQty = parseFloat(quantity || 0);
                        const calculatedValue = (goldPrice * parsedQty).toFixed(2);
                        console.log('Direct calculation result:', calculatedValue);
                        setCurrentValue(calculatedValue);
                      }
                    }
                  }, 0);
                }}
                style={[styles.goldCategoryItem, { width: '100%' }]}
                underlayColor={colors.surfaceVariant}
              >
                <View style={styles.goldCategoryItemContent}>
                  <MaterialCommunityIcons
                    name="gold"
                    size={20}
                    color={colors.amber500 || '#FFC107'}
                    style={styles.goldItemIcon}
                  />
                  <Text style={styles.goldCategoryItemText} numberOfLines={1}>
                    {category}
                  </Text>
                  <MaterialCommunityIcons
                    name="gold"
                    size={20}
                    color={colors.amber500 || '#FFC107'}
                    style={styles.goldItemIcon}
                  />
                </View>
              </TouchableRipple>
            ))
          ) : (
            <View style={styles.noGoldCategoriesContainer}>
              <Text style={styles.noGoldCategoriesText}>
                {t('noGoldCategoriesAvailable')}
              </Text>
            </View>
          )}
        </Menu>
      </View>
      <HelperText type="error" visible={!!errors.goldCategory}>
        {errors.goldCategory}
      </HelperText>
    </>
  );

  // Simplified handler for quantity changes
  const handleQuantityChange = (text) => {
    console.log('⌨️ Quantity changed to:', text);
    setQuantity(text);
    setErrors({ ...errors, quantity: '' });
    
    // No automatic calculations here - they will be handled by the useEffect
  };

  return (
    <>
      <ScrollView 
        style={[
          styles.container,
          Platform.OS === 'web' && {
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0,0,0,0.3) transparent',
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: '-ms-autohiding-scrollbar',
          }
        ]}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.content}>
          <SegmentedButtons
            value={transactionType}
            onValueChange={setTransactionType}
            buttons={[
              { 
                value: 'expense', 
                label: t('expense'),
                style: {
                  backgroundColor: transactionType === 'expense' ? colors.error + '20' : undefined
                }
              },
              { 
                value: 'income', 
                label: t('income'),
                style: {
                  backgroundColor: transactionType === 'income' ? colors.success + '20' : undefined
                }
              },
              { 
                value: 'investment', 
                label: t('investment'),
                style: {
                  backgroundColor: transactionType === 'investment' ? colors.tertiary + '20' : undefined
                }
              },
            ]}
            style={styles.segmentedButtons}
          />

          <TouchableRipple 
            onPress={() => Platform.OS !== 'web' && setShowDatePicker(true)}
            style={[
              styles.datePickerButton,
              Platform.OS === 'web' && styles.datePickerButtonWeb
            ]}
          >
            <View style={styles.datePickerContent}>
              <MaterialCommunityIcons name="calendar" size={24} color={colors.primary} />
              <Text style={[styles.dateText, { color: colors.text }]}>
                {selectedDate.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              {Platform.OS === 'web' && (
                <View style={styles.dateInputWrapper}>
                  <input
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={(e) => handleDateChange(e, new Date(e.target.value))}
                    className="date-input-field"
                    max={(() => {
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      return today.toISOString().split('T')[0];
                    })()}
                    aria-label={t('selectDate')}
                    title={t('selectDate')}
                  />
                </View>
              )}
            </View>
          </TouchableRipple>

          {(showDatePicker && Platform.OS !== 'web') && (
            <DateTimePicker
              testID="datePicker"
              value={selectedDate}
              mode="date"
              display={Platform.select({
                ios: 'spinner',
                android: 'default',
                default: 'default'
              })}
              onChange={handleDateChange}
              maximumDate={(() => {
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                return today;
              })()}
              style={Platform.OS === 'web' ? styles.webDatePicker : undefined}
            />
          )}

          {/* Investment specific fields */}
          {transactionType === 'investment' && (
            <>
              {/* Asset Types Horizontal Scrollable Menu */}
              <View style={styles.assetTypeScrollContainer}>
                <ScrollView
                  ref={assetTypeScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  onScrollBeginDrag={() => setIsScrollingAssetTypes(true)}
                  onScrollEndDrag={() => setIsScrollingAssetTypes(false)}
                  onMomentumScrollEnd={() => setIsScrollingAssetTypes(false)}
                  style={[
                    styles.assetTypeScroll,
                    Platform.OS === 'web' && {
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(0,0,0,0.3) transparent',
                      WebkitOverflowScrolling: 'touch',
                      msOverflowStyle: '-ms-autohiding-scrollbar',
                    }
                  ]}
                  contentContainerStyle={styles.assetTypeScrollContent}
                >
                  {assetTypes.map((asset) => (
                    <TouchableOpacity
                      key={asset.value}
                      style={[
                        styles.assetTypeButton,
                        { backgroundColor: colors.surfaceVariant },
                        assetType === asset.value && {
                          backgroundColor: colors.tertiary,
                        }
                      ]}
                      onPress={() => setAssetType(asset.value)}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityState={{ selected: assetType === asset.value }}
                    >
                      <MaterialCommunityIcons
                        name={asset.icon}
                        size={24}
                        color={assetType === asset.value ? colors.onTertiary : colors.onSurfaceVariant}
                        style={styles.assetTypeIcon}
                      />
                      <Text style={[
                        styles.assetTypeText,
                        { color: assetType === asset.value ? colors.onTertiary : colors.onSurfaceVariant }
                      ]}>
                        {asset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {assetType === 'Gold' ? goldCategorySection : (
                <>
                  <TextInput
                    mode="outlined"
                    label={t('symbol')}
                    value={symbol}
                    onChangeText={(text) => {
                      setSymbol(text);
                      setErrors({ ...errors, symbol: '' });
                    }}
                    style={styles.input}
                    error={!!errors.symbol}
                  />
                  <HelperText type="error" visible={!!errors.symbol}>
                    {errors.symbol}
                  </HelperText>
                  
                  <TextInput
                    mode="outlined"
                    label={t('name')}
                    value={assetName}
                    onChangeText={(text) => {
                      setAssetName(text);
                      setErrors({ ...errors, assetName: '' });
                    }}
                    style={styles.input}
                    error={!!errors.assetName}
                  />
                  <HelperText type="error" visible={!!errors.assetName}>
                    {errors.assetName}
                  </HelperText>
                </>
              )}

              <TextInput
                mode="outlined"
                label={t('quantity') + ' *'}
                value={quantity}
                onChangeText={handleQuantityChange}
                keyboardType="decimal-pad"
                style={styles.input}
                error={!!errors.quantity}
              />
              <HelperText type="error" visible={!!errors.quantity}>
                {errors.quantity}
              </HelperText>

              <TextInput
                mode="outlined"
                label={t('unitPrice') + ' *'}
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  setErrors({ ...errors, amount: '' });
                }}
                keyboardType="decimal-pad"
                error={!!errors.amount}
                style={styles.input}
                left={<TextInput.Affix text={getCurrencySymbol(selectedCurrency)} />}
              />
              <HelperText type="error" visible={!!errors.amount}>
                {errors.amount}
              </HelperText>
              
              <TextInput
                mode="outlined"
                label={t('currentValue')}
                value={currentValue}
                onChangeText={(text) => {
                  setCurrentValue(text);
                  setErrors({ ...errors, currentValue: '' });
                }}
                keyboardType="decimal-pad"
                style={styles.input}
                error={!!errors.currentValue}
                left={<TextInput.Affix text={getCurrencySymbol(selectedCurrency)} />}
                right={
                  <TextInput.Icon 
                    icon="refresh"
                    onPress={async () => {
                      console.log('📱 Manual recalculation button pressed - forcing API call');
                      await calculateGoldValue(true);
                    }}
                  />
                }
              />
              <HelperText type="error" visible={!!errors.currentValue}>
                {errors.currentValue}
              </HelperText>
              
              {/* Only show fees field for non-Gold assets */}
              {assetType !== 'Gold' && (
                <>
                  <TextInput
                    mode="outlined"
                    label={t('fees')}
                    value={fees}
                    onChangeText={(text) => {
                      setFees(text);
                      setErrors({ ...errors, fees: '' });
                    }}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    error={!!errors.fees}
                    left={<TextInput.Affix text={getCurrencySymbol(selectedCurrency)} />}
                  />
                  <HelperText type="error" visible={!!errors.fees}>
                    {errors.fees}
                  </HelperText>
                </>
              )}

              <TextInput
                mode="outlined"
                label={t('description')}
                value={description}
                onChangeText={setDescription}
                style={styles.input}
                error={errors.description}
              />
              <HelperText type="error" visible={!!errors.description}>
                {errors.description}
              </HelperText>
            </>
          )}

          {/* Only show category selection for non-investment transactions */}
          {transactionType !== 'investment' && (
            <>
              <View style={styles.categoryInputContainer}>
                <Menu
                  visible={showCategoryMenu}
                  onDismiss={() => setShowCategoryMenu(false)}
                  anchor={
                    <GhostTextInput
                      mode="outlined"
                      label={t('category') + ' *'}
                      value={category}
                      suggestion={suggestion}
                      onChangeText={(text) => {
                        setCategory(text);
                        setIsEditable(true);
                        setErrors({ ...errors, category: '' });
                        // Handle autocomplete suggestions
                        if (text.length >= 2) {
                          const matches = categories.filter(cat => 
                            cat.toLowerCase().startsWith(text.toLowerCase()) && 
                            cat.toLowerCase() !== text.toLowerCase()
                          );
                          if (matches.length > 0) {
                            setSuggestion(matches[0]);
                          } else {
                            setSuggestion('');
                          }
                        } else {
                          setSuggestion('');
                        }
                      }}
                      onKeyPress={({ nativeEvent }) => {
                        if ((nativeEvent.key === 'Enter' || nativeEvent.key === 'Tab') && suggestion) {
                          const matchedCategory = categories.find(cat => cat.toLowerCase() === suggestion.toLowerCase());
                          setCategory(matchedCategory || suggestion);
                          setSuggestion('');
                          if (nativeEvent.key === 'Tab') {
                            nativeEvent.preventDefault?.();
                          }
                        }
                      }}
                      error={!!errors.category}
                      style={[styles.input, { flex: 1, backgroundColor: colors.background }]}
                      editable={isEditable}
                      theme={theme}
                      right={
                        <TextInput.Icon 
                          icon={() => (
                            <View style={{ width: 24, alignItems: 'center' }}>
                              <MaterialCommunityIcons
                                name={!isEditable ? "pencil" : (category ? getCategoryIcon(category) : "menu-down")}
                                size={24}
                                color={category ? getCategoryColor(category) : colors.primary}
                              />
                            </View>
                          )}
                          onPress={handleCategoryIconPress}
                          forceTextInputFocus={false}
                        />
                      }
                    />
                  }
                  contentStyle={[
                    Platform.select({
                      web: {
                        maxHeight: '50vh', // Use viewport height instead of fixed pixels
                        overflowY: 'auto'
                      },
                      default: {
                        maxHeight: '70%' // Use percentage of screen height on mobile
                      }
                    }),
                    { marginTop: 4 }
                  ]}
                  style={{ 
                    alignItems: 'flex-end',
                    justifyContent: 'flex-end',
                    right: 0
                  }}
                >
                  {Platform.OS === 'web' ? (
                    <ScrollView style={[
                      styles.webCategoryList,
                      {
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(0,0,0,0.3) transparent',
                        WebkitOverflowScrolling: 'touch',
                        msOverflowStyle: '-ms-autohiding-scrollbar',
                      }
                    ]}>
                      {categories.map((cat) => (
                        <Menu.Item
                          key={cat}
                          onPress={() => {
                            setCategory(cat);
                            setShowCategoryMenu(false);
                            setSuggestion('');
                            setIsEditable(false);
                            setErrors({ ...errors, category: '' });
                          }}
                          title={cat}
                          leadingIcon={() => (
                            <MaterialCommunityIcons
                              name={getCategoryIcon(cat)}
                              size={24}
                              color={getCategoryColor(cat)}
                            />
                          )}
                          style={{
                            minHeight: 48,
                            justifyContent: 'center'
                          }}
                        />
                      ))}
                    </ScrollView>
                  ) : (
                    categories.map((cat) => (
                      <Menu.Item
                        key={cat}
                        onPress={() => {
                          setCategory(cat);
                          setShowCategoryMenu(false);
                          setErrors({ ...errors, category: '' });
                        }}
                        title={cat}
                        leadingIcon={() => (
                          <MaterialCommunityIcons
                            name={getCategoryIcon(cat)}
                            size={24}
                            color={getCategoryColor(cat)}
                          />
                        )}
                        style={{
                          minHeight: 48,
                          justifyContent: 'center'
                        }}
                      />
                    ))
                  )}
                </Menu>
              </View>
              <HelperText type="error" visible={!!errors.category}>
                {errors.category}
              </HelperText>

              <TextInput
                mode="outlined"
                label={t('amount') + ' *'}
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  setErrors({ ...errors, amount: '' });
                }}
                keyboardType="decimal-pad"
                error={!!errors.amount}
                style={styles.input}
                left={<TextInput.Affix text={getCurrencySymbol(selectedCurrency)} />}
              />
              <HelperText type="error" visible={!!errors.amount}>
                {errors.amount}
              </HelperText>

              <TextInput
                mode="outlined"
                label={t('description')}
                value={description}
                onChangeText={setDescription}
                style={styles.input}
                error={errors.description}
              />
              <HelperText type="error" visible={!!errors.description}>
                {errors.description}
              </HelperText>

              <View style={styles.switchContainer}>
                <Text variant="bodyLarge" style={{ color: colors.text }}>{t('recurringMonthly')}</Text>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  color={colors.primary}
                />
              </View>
            </>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
          >
            {isEditing ? t('saveChanges') : t('addTransaction')}
          </Button>
        </View>
      </ScrollView>

      <CustomSnackbar
        visible={showSnackbar}
        message={isEditing ? t('transactionUpdated') : t('transactionAdded')}
        style={{ backgroundColor: colors.primary }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 4,
  },
  categoryInputContainer: {
    marginBottom: 4,
    position: 'relative'
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  submitButton: {
    marginTop: 24,
  },
  segmentedButtons: {
    marginBottom: 24,
  },
  snackbar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 8,
    elevation: 4,
  },
  snackbarText: {
    color: 'white',
    textAlign: 'center',
  },
  webCategoryList: {
    maxHeight: '50vh',
    overflow: 'auto',
  },
  datePickerButton: {
    borderRadius: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  datePickerButtonWeb: {
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    ':hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
  },
  dateInputWrapper: {
    ...Platform.select({
      web: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
        cursor: 'pointer',
      }
    })
  },
  webDatePicker: {
    width: '100%',
    marginBottom: 16,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
  },
  centeredMenuItemTitle: {
    textAlign: 'center',
    flex: 1,
    marginLeft: -24, // Offset the leading icon space to center the text
  },
  centeredMenuItem: {
    height: 56,
    justifyContent: 'center',
  },
  goldIconContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
  },
  goldCategoryMenuHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 8,
  },
  goldCategoryMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  goldCategoryItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginVertical: 1,
  },
  goldCategoryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 24,
  },
  goldCategoryItemText: {
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 4,
    lineHeight: 20,
  },
  goldItemIcon: {
    marginHorizontal: 4,
    height: 20,
    width: 20,
    textAlignVertical: 'center',
  },
  noGoldCategoriesContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noGoldCategoriesText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  centeredMenuItemContainer: {
    padding: 8,
  },
  centeredMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  centeredMenuItemText: {
    fontSize: 16,
  },
  goldCategoryScrollView: {
    maxHeight: '50vh',
    overflow: 'auto',
  },
  menuItemContentStyle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clickableInput: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(0,0,0,0.02)' : undefined,
    cursor: 'pointer',
  },
  // Asset type scrollable styles
  assetTypeScrollContainer: {
    marginVertical: 8,
    overflow: 'hidden',
    WebkitOverflowScrolling: 'touch',
  },
  assetTypeScroll: {
    flexGrow: 0,
    minHeight: 60,
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(0,0,0,0.3) transparent',
    msOverflowStyle: '-ms-autohiding-scrollbar',
  },
  assetTypeScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
    paddingHorizontal: 8,
  },
  assetTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 2,
    borderRadius: 16,
    minWidth: 120,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetTypeIcon: {
    marginRight: 8,
  },
  assetTypeText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

// Add a style tag for the date input
if (Platform.OS === 'web') {
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    .date-input-field {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      z-index: 2;
      padding: 0;
      margin: 0;
      border: none;
      -webkit-appearance: none;
      appearance: none;
    }
    .date-input-field::-webkit-calendar-picker-indicator {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      z-index: 3;
    }
  `;
  document.head.appendChild(styleTag);
}
