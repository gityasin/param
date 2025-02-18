import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { CategoriesProvider } from '../context/CategoriesContext';
import { TransactionsProvider } from '../context/TransactionsContext';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { AppThemeProvider, useAppTheme } from '../theme/theme';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';

function RootLayoutContent() {
  const { theme, isDarkMode } = useAppTheme();
  const router = useRouter();
  const segments = useSegments();
  const { t } = useLanguage();

  useEffect(() => {
    checkOnboarding();
  }, []);

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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          headerBackTitleVisible: false,
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
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: '100vh',
    backgroundColor: 'transparent',
  },
});
