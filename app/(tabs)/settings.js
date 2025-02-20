import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal as RNModal, Platform } from 'react-native';
import { List, Switch, Divider, Text, Surface, useTheme, Button, TextInput, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scheduleDailyReminder, cancelAllNotifications, getAllScheduledNotifications } from '../../notifications/NotificationsService';
import { useAppTheme } from '../../theme/theme';
import { getAvailableCurrencies } from '../../services/format';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTransactions } from '../../context/TransactionsContext';
import { useCategories } from '../../context/CategoriesContext';
import { useLanguage } from '../../context/LanguageContext';
import * as Notifications from 'expo-notifications';

export default function SettingsScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const { isDarkMode, toggleTheme } = useAppTheme();
  const { language, changeLanguage, t } = useLanguage();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const currencies = getAvailableCurrencies();
  const { selectedCurrency, handleCurrencyChange } = useTransactions();
  const { categories, addCategory, removeCategory, updateCategory, getCategoryColor, getCategoryIcon } = useCategories();
  
  // Category management state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editedCategory, setEditedCategory] = useState('');

  // Add useEffect to load notification settings
  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      // Check both stored setting and actual scheduled notifications
      const [notificationSetting, scheduledNotifications] = await Promise.all([
        AsyncStorage.getItem('notificationsEnabled'),
        getAllScheduledNotifications()
      ]);
      
      // Consider notifications enabled if there are scheduled notifications
      // or if the setting is explicitly set to 'true'
      const isEnabled = notificationSetting === 'true' || scheduledNotifications.length > 0;
      setNotificationsEnabled(isEnabled);
      
      // Sync the storage with actual state if they don't match
      if (isEnabled && notificationSetting !== 'true') {
        await AsyncStorage.setItem('notificationsEnabled', 'true');
      } else if (!isEnabled && notificationSetting === 'true') {
        await AsyncStorage.setItem('notificationsEnabled', 'false');
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const handleNotificationToggle = async () => {
    try {
      if (!notificationsEnabled) {
        // Attempt to schedule the reminder
        await scheduleDailyReminder();
        
        // If we get here, it means the scheduling was successful
        await AsyncStorage.setItem('notificationsEnabled', 'true');
        setNotificationsEnabled(true);
      } else {
        // Cancel all notifications
        await cancelAllNotifications();
        await AsyncStorage.setItem('notificationsEnabled', 'false');
        setNotificationsEnabled(false);
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      
      // Show more specific error message based on the error
      if (error.message === 'Notification permissions not granted') {
        alert(t('notificationPermissionRequired'));
      } else {
        alert(t('notificationError'));
      }
      
      // Ensure the switch state matches reality
      loadNotificationSettings();
    }
  };

  const handleCurrencySelect = async (currencyCode) => {
    await handleCurrencyChange(currencyCode);
    setShowCurrencySelector(false);
  };

  const selectedCurrencyDetails = currencies.find(c => c.code === selectedCurrency);

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      addCategory(newCategory.trim());
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

  const handleEditCategory = () => {
    if (editedCategory.trim() && selectedCategory) {
      updateCategory(selectedCategory, editedCategory.trim());
      setEditedCategory('');
      setSelectedCategory(null);
      setShowEditCategory(false);
    }
  };

  const handleDeleteCategory = (category) => {
    removeCategory(category);
  };

  const renderDialog = (visible, title, content, onDismiss, dialogCategory) => {
    return (
      <RNModal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onDismiss}
      >
        <View style={styles.modalOverlay}>
          <Surface style={[styles.dialogContainer, { backgroundColor: colors.surface }]} elevation={5}>
            <View style={styles.dialogHeader}>
              <MaterialCommunityIcons
                name={dialogCategory ? getCategoryIcon(dialogCategory) : 'tag-plus'}
                size={24}
                color={colors.primary}
                style={styles.dialogIcon}
              />
              <Text variant="titleLarge" style={[styles.dialogTitle, { color: colors.text }]}>
                {title}
              </Text>
            </View>
            {content}
          </Surface>
        </View>
      </RNModal>
    );
  };

  const renderAddCategoryDialog = () => {
    return renderDialog(
      showAddCategory,
      t('addNewCategory'),
      <View>
        <TextInput
          label={t('categoryName')}
          value={newCategory}
          onChangeText={setNewCategory}
          mode="outlined"
          style={styles.dialogInput}
        />
        <View style={styles.dialogActions}>
          <Button onPress={() => setShowAddCategory(false)}>{t('cancel')}</Button>
          <Button onPress={handleAddCategory}>{t('add')}</Button>
        </View>
      </View>,
      () => setShowAddCategory(false),
      newCategory
    );
  };

  const renderEditCategoryDialog = () => {
    return renderDialog(
      showEditCategory,
      t('editCategory'),
      <View>
        <TextInput
          label={t('categoryName')}
          value={editedCategory}
          onChangeText={setEditedCategory}
          mode="outlined"
          style={styles.dialogInput}
        />
        <View style={styles.dialogActions}>
          <Button onPress={() => setShowEditCategory(false)}>{t('cancel')}</Button>
          <Button onPress={handleEditCategory}>{t('update')}</Button>
        </View>
      </View>,
      () => setShowEditCategory(false),
      editedCategory
    );
  };

  const renderCurrencySelector = () => {
    return renderDialog(
      showCurrencySelector,
      'Select Currency',
      <View>
        <ScrollView style={styles.currencyList}>
          {currencies.map((currency) => (
            <TouchableOpacity
              key={currency.code}
              style={[
                styles.currencyItem,
                selectedCurrency === currency.code && { backgroundColor: colors.primaryContainer }
              ]}
              onPress={() => handleCurrencySelect(currency.code)}
            >
              <Text style={[styles.currencyLabel, { color: colors.text }]}>
                {currency.label}
              </Text>
              {selectedCurrency === currency.code && (
                <MaterialCommunityIcons
                  name="check"
                  size={24}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Button 
          onPress={() => setShowCurrencySelector(false)}
          style={styles.dialogCloseButton}
        >
          Close
        </Button>
      </View>,
      () => setShowCurrencySelector(false)
    );
  };

  const renderLanguageSelector = () => {
    const languages = [
      { code: 'tr', label: 'Türkçe' },
      { code: 'en', label: 'English' }
    ];

    return renderDialog(
      showLanguageSelector,
      t('language'),
      <View>
        <ScrollView style={styles.languageList}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageItem,
                language === lang.code && { backgroundColor: colors.primaryContainer }
              ]}
              onPress={() => {
                changeLanguage(lang.code);
                setShowLanguageSelector(false);
              }}
            >
              <Text style={[styles.languageLabel, { color: colors.text }]}>
                {lang.label}
              </Text>
              {language === lang.code && (
                <MaterialCommunityIcons
                  name="check"
                  size={24}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Button 
          onPress={() => setShowLanguageSelector(false)}
          style={styles.dialogCloseButton}
        >
          {t('close')}
        </Button>
      </View>,
      () => setShowLanguageSelector(false)
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        {/* App Settings Section */}
        <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('appSettings')}
          </Text>
          <List.Section style={styles.listSection}>
            <List.Item
              title={t('darkMode')}
              description={t('darkModeDesc')}
              left={props => (
                <MaterialCommunityIcons
                  name="theme-light-dark"
                  size={24}
                  color={colors.primary}
                  style={props.style}
                />
              )}
              right={() => (
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  color={colors.primary}
                />
              )}
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
            />
            <Divider />
            
            <List.Item
              title={t('dailyReminders')}
              description={t('dailyRemindersDesc')}
              left={props => (
                <MaterialCommunityIcons
                  name="bell"
                  size={24}
                  color={colors.primary}
                  style={props.style}
                />
              )}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                  color={colors.primary}
                />
              )}
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
            />
            <Divider />

            <List.Item
              title={t('currency')}
              description={selectedCurrencyDetails ? selectedCurrencyDetails.label : ''}
              left={props => (
                <MaterialCommunityIcons
                  name="currency-usd"
                  size={24}
                  color={props.color}
                  style={props.style}
                />
              )}
              onPress={() => setShowCurrencySelector(true)}
              right={props => (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={props.color}
                  style={props.style}
                />
              )}
            />
            <Divider />

            <List.Item
              title={t('language')}
              description={language === 'tr' ? 'Türkçe' : 'English'}
              left={props => (
                <MaterialCommunityIcons
                  name="translate"
                  size={24}
                  color={props.color}
                  style={props.style}
                />
              )}
              onPress={() => setShowLanguageSelector(true)}
              right={props => (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={props.color}
                  style={props.style}
                />
              )}
            />
          </List.Section>
        </Surface>

        {/* Categories Section */}
        <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={{ color: colors.text }}>
              {t('categories')}
            </Text>
            <IconButton
              icon="plus-thick"
              size={24}
              iconColor={colors.primary}
              style={styles.categoryAddButton}
              onPress={() => setShowAddCategory(true)}
            />
          </View>
          <List.Section style={styles.listSection}>
            {categories.map((category) => (
              <React.Fragment key={category}>
                <List.Item
                  title={category}
                  left={props => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons
                        name={getCategoryIcon(category)}
                        size={24}
                        color={getCategoryColor(category)}
                        style={props.style}
                      />
                    </View>
                  )}
                  right={() => (
                    <View style={styles.categoryActions}>
                      <IconButton
                        icon="pencil"
                        size={20}
                        onPress={() => {
                          setSelectedCategory(category);
                          setEditedCategory(category);
                          setShowEditCategory(true);
                        }}
                      />
                      <IconButton
                        icon="delete"
                        size={20}
                        onPress={() => handleDeleteCategory(category)}
                      />
                    </View>
                  )}
                />
                <Divider />
              </React.Fragment>
            ))}
          </List.Section>
        </Surface>

        {/* About Section */}
        <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('about')}
          </Text>
          <List.Section style={styles.listSection}>
            <List.Item
              title={t('version')}
              description="1.0.0"
              left={props => (
                <MaterialCommunityIcons
                  name="information"
                  size={24}
                  color={colors.primary}
                  style={props.style}
                />
              )}
            />
            <Divider />
            <List.Item
              title={t('helpAndSupport')}
              description={t('helpDesc')}
              left={props => (
                <MaterialCommunityIcons
                  name="help-circle"
                  size={24}
                  color={colors.primary}
                  style={props.style}
                />
              )}
              onPress={() => {/* Add help action here */}}
              right={props => (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={props.color}
                  style={props.style}
                />
              )}
            />
            <Divider />
            <List.Item
              title={t('privacyPolicy')}
              description={t('privacyPolicyDesc')}
              left={props => (
                <MaterialCommunityIcons
                  name="shield-account"
                  size={24}
                  color={colors.primary}
                  style={props.style}
                />
              )}
              onPress={() => {/* Add privacy policy action here */}}
              right={props => (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={props.color}
                  style={props.style}
                />
              )}
            />
          </List.Section>
        </Surface>
      </ScrollView>
      {renderAddCategoryDialog()}
      {renderEditCategoryDialog()}
      {renderCurrencySelector()}
      {renderLanguageSelector()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  surface: {
    margin: 16,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12, // Changed from 16 to 12 pixels
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 13, // Remove right padding since IconButton has its own margin
    marginBottom: 8, // Add bottom margin to match other sections
    height: 32, // Set a fixed height to ensure vertical centering
  },
  categoryAddButton: {
    margin: 0, // Remove default margin to align with title
    alignSelf: 'center', // Ensure vertical centering
    top: 1, // Slight vertical adjustment to perfectly center with text
  },
  listSection: {
    marginTop: 0, // Added to remove extra space at the top of List.Section
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -14, // Increased from -12 to -16 to move icons further right
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 8,
    padding: 16,
  },
  dialogTitle: {
    marginBottom: 16,
  },
  dialogInput: {
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  currencyList: {
    maxHeight: 300,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 4,
  },
  currencyLabel: {
    fontSize: 16,
  },
  dialogCloseButton: {
    marginTop: 16,
  },
  languageList: {
    maxHeight: 200,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 4,
  },
  languageLabel: {
    fontSize: 16,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogIcon: {
    marginRight: 8,
  },
});
