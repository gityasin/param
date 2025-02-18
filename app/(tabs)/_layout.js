import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { View, StyleSheet } from 'react-native';

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Tabs
        screenOptions={{
          title: 'PARAM',
          headerStyle: {
            backgroundColor: colors.background,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingVertical: 8,
            height: 60,
          },
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'PARAM',
            tabBarLabel: t('tabHome'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="charts"
          options={{
            title: t('tabCharts'),
            tabBarLabel: t('tabCharts'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-bar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tabSettings'),
            tabBarLabel: t('tabSettings'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cog" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
});
