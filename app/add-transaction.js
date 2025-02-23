import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated, Platform } from 'react-native';
import { TextInput, Button, Switch, Text, HelperText, useTheme, SegmentedButtons, Menu, TouchableRipple } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTransactions } from '../context/TransactionsContext';
import { useCategories } from '../context/CategoriesContext';
import { getCurrencySymbol } from '../services/format';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { useRouter, useLocalSearchParams } from 'expo-router';

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
  return (
    <View style={{ flex: 1 }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
      {suggestion && value && suggestion.toLowerCase() !== value.toLowerCase() && (
        <View 
          pointerEvents="none" 
          style={{ 
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        >
          <TextInput
            value={value + suggestion.slice(value.length)}
            editable={false}
            style={[
              props.style,
              {
                backgroundColor: 'transparent',
                color: theme.colors.placeholder,
                opacity: 0.5,
              }
            ]}
            mode={props.mode}
            label={props.label}
          />
        </View>
      )}
    </View>
  );
};

export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialValuesRef = React.useRef(null);
  
  const { dispatch, selectedCurrency } = useTransactions();
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
  const [isEditable, setIsEditable] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (isEditing && existingTransaction && !initialValuesRef.current) {
      initialValuesRef.current = existingTransaction;
      setDescription(existingTransaction.description || '');
      setAmount(existingTransaction.amount ? Math.abs(existingTransaction.amount).toString() : '');
      setCategory(existingTransaction.category || '');
      setTransactionType(existingTransaction.amount < 0 ? 'expense' : 'income');
      setIsRecurring(Boolean(existingTransaction.isRecurring));
      setSelectedDate(new Date(existingTransaction.date));
    }
  }, [isEditing, existingTransaction]);

  const validateForm = () => {
    const newErrors = {};

    if (!description.trim()) {
      newErrors.description = t('descriptionRequired');
    }

    if (!amount) {
      newErrors.amount = t('amountRequired');
    } else if (isNaN(amount) || parseFloat(amount) <= 0) {
      newErrors.amount = t('invalidAmount');
    }

    if (!category.trim()) {
      newErrors.category = t('categoryRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const parsedAmount = parseFloat(amount);
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
      // Add a small delay before opening the menu
      setTimeout(() => {
        setShowCategoryMenu(true);
      }, 150); // 150ms delay for a smooth interaction
    }
  };

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'web') {
      // For web, we don't need to manage visibility state
      if (date) {
        setSelectedDate(date);
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
            ]}
            style={styles.segmentedButtons}
          />

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

          <TextInput
            mode="outlined"
            label={t('amount')}
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

          <View style={styles.categoryInputContainer}>
            <Menu
              visible={showCategoryMenu}
              onDismiss={() => setShowCategoryMenu(false)}
              anchor={
                <GhostTextInput
                  mode="outlined"
                  label={t('category')}
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
                      // Use the exact casing of the matched category
                      const matchedCategory = categories.find(cat => cat.toLowerCase() === suggestion.toLowerCase());
                      setCategory(matchedCategory || suggestion);
                      setSuggestion('');
                      // Prevent default tab behavior
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

          <TouchableRipple 
            onPress={() => setShowDatePicker(true)} 
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
                    max={new Date().toISOString().split('T')[0]}
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
              maximumDate={new Date()}
              style={Platform.OS === 'web' ? styles.webDatePicker : undefined}
            />
          )}

          <View style={styles.switchContainer}>
            <Text variant="bodyLarge" style={{ color: colors.text }}>{t('recurringMonthly')}</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              color={colors.primary}
            />
          </View>

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
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'stretch',
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
      -webkit-appearance: none;
      appearance: none;
    }
  `;
  document.head.appendChild(styleTag);
}
