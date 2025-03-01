import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { CategoriesProvider } from '../context/CategoriesContext';
import { TransactionsProvider } from '../context/TransactionsContext';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { AppThemeProvider, useAppTheme } from '../theme/theme';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform, SafeAreaView } from 'react-native';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';

function RootLayoutContent() {
  const { theme, isDarkMode } = useAppTheme();
  const router = useRouter();
  const segments = useSegments();
  const { t, language } = useLanguage();

  useEffect(() => {
    checkOnboarding();
  }, []);

  useEffect(() => {
    // Set HTML lang attribute when language changes
    if (Platform.OS === 'web') {
      document.documentElement.lang = language;
      document.documentElement.setAttribute('xml:lang', language);
      document.documentElement.setAttribute('content-language', language);
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'; // Future-proofing for RTL languages
    }
  }, [language]);

  const checkOnboarding = async () => {
    try {
      const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
      
      // If we're not on the onboarding screen and haven't completed onboarding
      if (!segments.includes('onboarding') && hasCompletedOnboarding !== 'true') {
        router.replace('/onboarding');
      }
      // If we're on onboarding screen but have completed it
      else if (segments.includes('onboarding') && hasCompletedOnboarding === 'true') {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.container}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerTintColor: theme.colors.text,
            headerShadowVisible: false,
            headerBackTitleVisible: false,
            contentStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="onboarding"
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="add-transaction"
            options={({ route }) => ({
              presentation: 'modal',
              headerTitle: route.params?.isEditing ? t('editTransaction') : t('addTransaction'),
            })}
          />
        </Stack>
      </View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <LanguageProvider>
        <TransactionsProvider>
          <CategoriesProvider>
            <RootLayoutContent />
          </CategoriesProvider>
        </TransactionsProvider>
      </LanguageProvider>
    </AppThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    width: '100%',
    height: Platform.select({
      web: '100vh',
      default: '100%'
    }),
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    backgroundColor: 'transparent',
  },
});
