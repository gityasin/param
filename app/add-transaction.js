import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated, Platform } from 'react-native';
import { TextInput, Button, Switch, Text, HelperText, useTheme, SegmentedButtons, Menu } from 'react-native-paper';
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

export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialValuesRef = React.useRef(null);
  
  const { dispatch, selectedCurrency } = useTransactions();
  const { categories, addCategory, getCategoryIcon } = useCategories();
  const theme = useTheme();
  const { colors } = theme;
  const { t } = useLanguage();

  const isEditing = Boolean(params.isEditing);
  const existingTransaction = params.transaction ? JSON.parse(params.transaction) : null;

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [transactionType, setTransactionType] = useState('expense');
  const [errors, setErrors] = useState({});
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  useEffect(() => {
    if (isEditing && existingTransaction && !initialValuesRef.current) {
      initialValuesRef.current = existingTransaction;
      setDescription(existingTransaction.description || '');
      setAmount(existingTransaction.amount ? Math.abs(existingTransaction.amount).toString() : '');
      setCategory(existingTransaction.category || '');
      setTransactionType(existingTransaction.amount < 0 ? 'expense' : 'income');
      setIsRecurring(Boolean(existingTransaction.isRecurring));
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

    if (trimmedCategory && !categories.includes(trimmedCategory)) {
      await addCategory(trimmedCategory);
    }

    const transactionData = {
      description: description.trim(),
      amount: finalAmount,
      date: isEditing ? initialValuesRef.current.date : new Date().toISOString().split('T')[0],
      category: trimmedCategory,
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

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <SegmentedButtons
            value={transactionType}
            onValueChange={setTransactionType}
            buttons={[
              { value: 'expense', label: t('expense') },
              { value: 'income', label: t('income') },
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
                <TextInput
                  mode="outlined"
                  label={t('category')}
                  value={category}
                  onChangeText={(text) => {
                    setCategory(text);
                    setErrors({ ...errors, category: '' });
                  }}
                  error={!!errors.category}
                  style={[styles.input, { flex: 1 }]}
                  right={
                    <TextInput.Icon 
                      icon={() => (
                        <MaterialCommunityIcons
                          name={category ? getCategoryIcon(category) : "menu-down"}
                          size={24}
                          color={colors.primary}
                        />
                      )}
                      onPress={() => setShowCategoryMenu(true)}
                      forceTextInputFocus={false}
                    />
                  }
                  onPressIn={() => {
                    if (Platform.OS === 'web') {
                      setShowCategoryMenu(true);
                    }
                  }}
                  showSoftInputOnFocus={false}
                  caretHidden={true}
                />
              }
              contentStyle={Platform.select({
                web: {
                  maxHeight: 300,
                  overflowY: 'auto'
                },
                default: {}
              })}
            >
              {categories.map((cat) => (
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
                      color={colors.primary}
                    />
                  )}
                  style={Platform.select({
                    web: {
                      minHeight: 48,
                      justifyContent: 'center'
                    },
                    default: {}
                  })}
                />
              ))}
            </Menu>
          </View>
          <HelperText type="error" visible={!!errors.category}>
            {errors.category}
          </HelperText>

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
});
