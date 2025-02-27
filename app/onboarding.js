import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { Text, Button, useTheme, SegmentedButtons } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTransactions } from '../context/TransactionsContext';
import { useAppTheme } from '../theme/theme';
import { CURRENCIES } from '../services/format';
import { useRouter } from 'expo-router';

const LANGUAGES = [
  { value: 'tr', label: 'Türkçe' },
  { value: 'en', label: 'English' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { colors } = theme;
  const { changeLanguage, t } = useLanguage();
  const { setSelectedCurrency: updateCurrency } = useTransactions();
  const { isDarkMode, toggleTheme } = useAppTheme();

  const [selectedLanguage, setSelectedLanguage] = useState('tr');
  const [selectedCurrency, setSelectedCurrency] = useState('TRY');
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        const storedPrefs = await AsyncStorage.getItem('userPreferences');
        if (storedPrefs) {
          const { language, currency } = JSON.parse(storedPrefs);
          if (language) {
            handleLanguageSelect(language);
          }
          if (currency) {
            handleCurrencySelect(currency);
          }
        } else {
          // Default to Turkish
          handleLanguageSelect('tr');
          handleCurrencySelect('TRY');
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
        handleLanguageSelect('tr');
        handleCurrencySelect('TRY');
      }
    };

    initializeLanguage();
  }, []);

  const handleLanguageSelect = (lang) => {
    setSelectedLanguage(lang);
    changeLanguage(lang);
  };

  const handleCurrencySelect = (currency) => {
    setSelectedCurrency(currency);
    updateCurrency(currency);
  };

  const handleThemeSelect = (isDark) => {
    if (isDark !== isDarkMode) {
      toggleTheme();
    }
  };

  const handleComplete = async () => {
    try {
      const preferences = {
        language: selectedLanguage,
        currency: selectedCurrency,
        theme: isDarkMode ? 'dark' : 'light'
      };
      
      await AsyncStorage.setItem('userPreferences', JSON.stringify(preferences));
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');

      // Navigate to the main app using the correct path
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error in handleComplete:', error);
      Alert.alert(
        'Error',
        'There was an error saving your preferences. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderLanguageStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.contentContainer}>
        <Text variant="headlineMedium" style={styles.title}>
          {t('selectLanguage')}
        </Text>
        <View style={styles.optionsContainer}>
          <View style={styles.buttonContainer}>
            {LANGUAGES.map((lang) => (
              <Button
                key={lang.value}
                mode={selectedLanguage === lang.value ? 'contained' : 'outlined'}
                onPress={() => handleLanguageSelect(lang.value)}
                style={[styles.optionButton, styles.languageButton]}
                contentStyle={[styles.buttonContent, styles.languageButtonContent]}
                labelStyle={styles.buttonLabel}
              >
                {lang.label}
              </Button>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  const renderCurrencyStep = () => {
    const currencyEntries = Object.entries(CURRENCIES);
    const sortedCurrencies = [
      currencyEntries.find(([code]) => code === 'TRY'),
      ...currencyEntries.filter(([code]) => code !== 'TRY'),
    ].filter(Boolean);

    return (
      <View style={styles.stepContainer}>
        <View style={styles.contentContainer}>
          <Text variant="headlineMedium" style={styles.title}>
            {t('selectCurrency')}
          </Text>
          <View style={styles.optionsContainer}>
            <ScrollView 
              style={styles.currencyList} 
              contentContainerStyle={styles.currencyGridContainer}
              showsVerticalScrollIndicator={false}
            >
              {sortedCurrencies.map(([code, currency]) => (
                <Button
                  key={code}
                  mode={selectedCurrency === code ? 'contained' : 'outlined'}
                  onPress={() => handleCurrencySelect(code)}
                  style={[styles.optionButton, styles.currencyButton]}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  {`${currency.symbol} ${code}`}
                </Button>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };

  const renderThemeStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.contentContainer}>
        <Text variant="headlineMedium" style={styles.title}>
          {t('chooseTheme')}
        </Text>
        <View style={styles.optionsContainer}>
          <View style={styles.buttonContainer}>
            <Button
              mode={!isDarkMode ? 'contained' : 'outlined'}
              onPress={() => handleThemeSelect(false)}
              style={[styles.optionButton, styles.fixedWidthButton]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              left={(props) => (
                <MaterialCommunityIcons
                  name="white-balance-sunny"
                  size={24}
                  color={props.color}
                />
              )}
            >
              {t('lightTheme')}
            </Button>
            <Button
              mode={isDarkMode ? 'contained' : 'outlined'}
              onPress={() => handleThemeSelect(true)}
              style={[styles.optionButton, styles.fixedWidthButton]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              left={(props) => (
                <MaterialCommunityIcons
                  name="weather-night"
                  size={24}
                  color={props.color}
                />
              )}
            >
              {t('darkTheme')}
            </Button>
          </View>
        </View>
      </View>
    </View>
  );

  const steps = [
    renderLanguageStep,
    renderCurrencyStep,
    renderThemeStep,
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text variant="displaySmall" style={[styles.welcomeTitle, { color: colors.primary }]}>
          {t('welcome')}
        </Text>
        
        <View style={styles.stepContainer}>
          {steps[currentStep]()}
        </View>
      </View>
      
      <View style={[styles.navigationButtonsContainer, { backgroundColor: colors.background }]}>
        <View style={styles.navigationButtons}>
          {currentStep > 0 && (
            <Button
              mode="outlined"
              onPress={() => setCurrentStep(prev => prev - 1)}
              style={[styles.navButton, { flex: 1, marginRight: 8 }]}
            >
              {t('previous')}
            </Button>
          )}
          
          {currentStep < steps.length - 1 ? (
            <Button
              mode="contained"
              onPress={() => setCurrentStep(prev => prev + 1)}
              style={[styles.navButton, { flex: 1, marginLeft: currentStep > 0 ? 8 : 0 }]}
            >
              {t('next')}
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleComplete}
              style={[styles.navButton, { flex: 1, marginLeft: currentStep > 0 ? 8 : 0 }]}
            >
              {t('getStarted')}
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'web' ? 10 : 15,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    textAlign: 'center',
    marginTop: Platform.OS === 'web' ? '3%' : '5%',
    marginBottom: Platform.OS === 'web' ? '3%' : '5%',
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: 'bold',
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
    fontSize: Platform.OS === 'web' ? 24 : 20,
  },
  optionsContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginVertical: 8,
  },
  optionButton: {
    marginVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    textAlign: 'center',
    width: '100%',
  },
  currencyList: {
    width: '100%',
    maxHeight: Platform.OS === 'web' ? '50vh' : '40vh',
  },
  currencyGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  currencyButton: {
    width: '45%',
    margin: '2%',
    minWidth: 130,
  },
  navigationButtonsContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'web' ? 16 : 24,
    paddingTop: 8,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  navButton: {
    minWidth: 120,
  },
  fixedWidthButton: {
    width: '100%',
    maxWidth: 200,
  },
  buttonContent: {
    height: 48,
    justifyContent: 'center',
  },
  languageButton: {
    width: 200,
    minWidth: 200,
    marginHorizontal: 0,
    marginVertical: 8,
  },
  languageButtonContent: {
    minWidth: 200,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
