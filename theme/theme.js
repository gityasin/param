import React, { createContext, useContext, useState, useEffect } from 'react';
import { MD3LightTheme, MD3DarkTheme, Provider as PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#3B82F6',
    onPrimary: '#FFFFFF',
    secondary: '#F59E0B',
    tertiary: '#2563EB', // Changed to blue
    background: '#FFFFFF',
    surface: '#F3F4F6',
    text: '#1F2937',
    textSecondary: '#6B7280',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
    border: '#E5E7EB',
    surfaceContainer: '#F3F4F6',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  roundness: 8,
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#60A5FA',
    onPrimary: '#FFFFFF',
    secondary: '#FBBF24',
    tertiary: '#3B82F6', // Changed to blue
    background: '#111827',
    surface: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    info: '#60A5FA',
    border: '#374151',
  },
  spacing: lightTheme.spacing,
  typography: lightTheme.typography,
  roundness: lightTheme.roundness,
};

const ThemeContext = createContext({
  theme: lightTheme,
  isDarkMode: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const colorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const userPrefs = await AsyncStorage.getItem('userPreferences');
        if (userPrefs) {
          const { theme } = JSON.parse(userPrefs);
          setIsDarkMode(theme === 'dark');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    loadThemePreference();
  }, []);

  const toggleTheme = async () => {
    try {
      const newIsDarkMode = !isDarkMode;
      setIsDarkMode(newIsDarkMode);
      
      // Save to preferences and update theme
      const userPrefs = await AsyncStorage.getItem('userPreferences');
      const preferences = userPrefs ? JSON.parse(userPrefs) : {};
      await AsyncStorage.setItem('userPreferences', JSON.stringify({
        ...preferences,
        theme: newIsDarkMode ? 'dark' : 'light'
      }));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, isDarkMode, toggleTheme }}>
      <PaperProvider theme={currentTheme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
}

export { ThemeProvider as AppThemeProvider };

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}