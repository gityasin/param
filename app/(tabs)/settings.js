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
import { CategoryEditor } from '../../components/CategoryEditor';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const { isDarkMode, toggleTheme } = useAppTheme();
  const { language, changeLanguage, t } = useLanguage();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const currencies = getAvailableCurrencies();
  const { selectedCurrency, setSelectedCurrency, dispatch } = useTransactions();
  const { categories, addCategory, removeCategory, updateCategory, getCategoryColor, getCategoryIcon } = useCategories();
  
  // Category management state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editedCategory, setEditedCategory] = useState('');
  const [showIconEditor, setShowIconEditor] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  
  // Reset app state
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

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
    await setSelectedCurrency(currencyCode);
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
    setCategoryToDelete(null);
  };

  const confirmDeleteCategory = (category) => {
    setCategoryToDelete(category);
  };

  const handleEditIconAndColor = (category) => {
    setCategoryToEdit(category);
    setShowIconEditor(true);
  };

  const handleResetApp = async () => {
    try {
      // Cancel any active notifications
      await cancelAllNotifications();
      
      // Clear all stored data
      const keysToPreserve = ['userLanguage']; // Optionally preserve language setting
      
      // Get all keys from AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filter out keys we want to preserve
      const keysToRemove = allKeys.filter(key => !keysToPreserve.includes(key));
      
      // Remove all other keys
      await AsyncStorage.multiRemove(keysToRemove);
      
      // Reset transactions in the context
      dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
      
      // Redirect to onboarding
      router.replace('/onboarding');
    } catch (error) {
      console.error('Error resetting app:', error);
      alert(t('errorResettingApp'));
    }
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
      t('currencyFormat'),
      <View>
        <ScrollView 
          style={[
            styles.currencyList,
            Platform.OS === 'web' && {
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0,0,0,0.3) transparent',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: '-ms-autohiding-scrollbar',
            }
          ]}
        >
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
          {t('close')}
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
        <ScrollView 
          style={[
            styles.languageList,
            Platform.OS === 'web' && {
              scrollbarWidth: 'thin',
              scrollbarColor: `${colors.primary} ${colors.surfaceVariant}`,
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: '-ms-autohiding-scrollbar',
            }
          ]}
        >
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
  
  const renderResetConfirmation = () => {
    return renderDialog(
      showResetConfirmation,
      t('resetApp') || 'Reset App',
      <View>
        <Text style={{ marginBottom: 16, color: colors.text }}>
          {t('resetAppConfirm') || 'This will erase all your data and return to the onboarding screen. This action cannot be undone. Are you sure?'}
        </Text>
        <View style={styles.dialogActions}>
          <Button onPress={() => setShowResetConfirmation(false)}>{t('cancel')}</Button>
          <Button onPress={handleResetApp} textColor={colors.error}>
            {t('reset') || 'Reset'}
          </Button>
        </View>
      </View>,
      () => setShowResetConfirmation(false)
    );
  };

  const renderCategorySelector = () => {
    // Sort categories alphabetically for display
    const sortedCategories = [...categories].sort((a, b) => a.localeCompare(b));

    return (
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
        <List.Section style={[styles.listSection, styles.compactList]}>
          {[...categories].sort((a, b) => a.localeCompare(b)).map((category, index) => (
            <React.Fragment key={category}>
              <List.Item
                title={category}
                style={styles.compactListItem}
                left={props => (
                  <TouchableOpacity 
                    onPress={() => handleEditIconAndColor(category)}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <MaterialCommunityIcons
                      name={getCategoryIcon(category)}
                      size={24}
                      color={getCategoryColor(category)}
                      style={props.style}
                    />
                  </TouchableOpacity>
                )}
                right={() => (
                  <View style={styles.categoryActions}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      style={styles.compactIconButton}
                      onPress={() => {
                        setSelectedCategory(category);
                        setEditedCategory(category);
                        setShowEditCategory(true);
                      }}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      style={styles.compactIconButton}
                      onPress={() => confirmDeleteCategory(category)}
                    />
                  </View>
                )}
              />
              {index < sortedCategories.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List.Section>
      </Surface>
    );
  };

  const renderDeleteConfirmation = () => {
    return renderDialog(
      categoryToDelete !== null,
      t('deleteCategory'),
      <View>
        <Text style={{ marginBottom: 16, color: colors.text }}>
          {t('deleteCategoryConfirm')} "{categoryToDelete}"?
        </Text>
        <View style={styles.dialogActions}>
          <Button onPress={() => setCategoryToDelete(null)}>{t('cancel')}</Button>
          <Button onPress={() => handleDeleteCategory(categoryToDelete)} textColor={colors.error}>
            {t('delete')}
          </Button>
        </View>
      </View>,
      () => setCategoryToDelete(null)
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
              title={t('currencyFormat')}
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
        {renderCategorySelector()}

        {/* Reset App Section */}
        <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('resetAndData') || 'Data Management'}
          </Text>
          <List.Section style={styles.listSection}>
            <List.Item
              title={t('resetApp') || 'Reset App'}
              description={t('resetAppDesc') || 'Erase all data and start fresh with onboarding'}
              left={props => (
                <MaterialCommunityIcons
                  name="refresh"
                  size={24}
                  color={colors.error}
                  style={props.style}
                />
              )}
              onPress={() => setShowResetConfirmation(true)}
              right={props => (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={props.color}
                  style={props.style}
                />
              )}
              titleStyle={{ color: colors.error }}
              descriptionStyle={{ color: colors.textSecondary }}
            />
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
      {renderDeleteConfirmation()}
      {renderResetConfirmation()}

      {/* Category Icon Editor Modal */}
      <RNModal
        visible={showIconEditor}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIconEditor(false)}
      >
        <View style={[styles.modalOverlay, { margin: 0, padding: 0 }]}>
          <Surface style={[styles.iconEditorContainer, { backgroundColor: colors.surface }]} elevation={5}>
            <View style={styles.iconEditorHeader}>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setShowIconEditor(false)}
              />
              <Text variant="titleLarge" style={{ flex: 1, textAlign: 'center' }}>
                {t('editCategoryStyle')}
              </Text>
              <IconButton
                icon="check"
                size={24}
                onPress={() => setShowIconEditor(false)}
              />
            </View>
            {categoryToEdit && (
              <CategoryEditor
                category={categoryToEdit}
                onClose={() => setShowIconEditor(false)}
              />
            )}
          </Surface>
        </View>
      </RNModal>
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
    paddingHorizontal: 0, // Remove horizontal padding from surface as List.Item has its own padding
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    marginBottom: 12,
    paddingHorizontal: 16, // Add padding to section titles to match List.Items
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, // Add consistent padding
    marginBottom: 8,
    height: 32,
  },
  categoryAddButton: {
    margin: 0, // Remove default margin to align with title
    alignSelf: 'center', // Ensure vertical centering
    top: 1, // Slight vertical adjustment to perfectly center with text
    left: 2, // Move 3 pixels to the right
  },
  listSection: {
    marginTop: 0, // Added to remove extra space at the top of List.Section
    marginBottom: 0, // Added to remove extra space at the bottom
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -8, // Adjust to account for IconButton padding
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
    overflow: 'auto',
  },
  languageList: {
    maxHeight: 200,
    overflow: 'auto',
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
  compactList: {
    paddingVertical: 0,
  },
  compactListItem: {
    paddingVertical: 4,
  },
  compactIconButton: {
    margin: 0,
    padding: 8,
  },
  iconEditorContainer: {
    flex: 1,
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  iconEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
