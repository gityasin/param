import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from './LanguageContext';
import { translations } from '../i18n/translations';

const CATEGORIES_STORAGE_KEY = '@categories';
const CATEGORY_COLORS_KEY = '@category_colors';
const CATEGORY_CUSTOM_ICONS_KEY = '@category_custom_icons';

// Default category keys - these match the translation keys
const DEFAULT_CATEGORY_KEYS = ['food', 'transport', 'shopping', 'bills', 'entertainment', 'salary', 'rent', 'groceries', 'other', 'investment'];

// A set of distinguishable colors
const CATEGORY_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Sage
  '#FF8C42', // Orange (moved up to be used for entertainment)
  '#FFD93D', // Yellow
  '#6C5B7B', // Purple
  '#C06C84', // Pink
  '#F8B195', // Peach
  '#2E86AB', // Navy
  '#A8E6CE', // Mint
  '#FFEEAD', // Cream
  '#4B4E6D', // Dark Blue
  '#84DCC6', // Turquoise
  '#95A5A6', // Gray
  '#D980FA', // Bright Purple
  '#B53471', // Magenta
  '#12CBC4', // Cyan
  '#FFA502', // Dark Orange
  '#009432', // Green
];

// Default category icons mapping
export const CATEGORY_ICONS = {
  // Keep existing default categories
  food: 'silverware-fork-knife',
  transport: 'car',
  shopping: 'shopping',
  bills: 'file-document',
  entertainment: 'gamepad-variant',
  groceries: 'basket',
  rent: 'home',
  salary: 'cash-multiple',
  other: 'dots-horizontal',
  investment: 'chart-line',  // Add investment icon mapping
  
  // Housing & Utilities
  mortgage: 'bank',
  utilities: 'lightning-bolt',
  electricity: 'flash',
  water: 'water',
  gas: 'gas-station',
  internet: 'wifi',
  mobile: 'cellphone',

  // Food & Dining
  groceries: 'basket',
  'dining-out': 'silverware-variant',
  coffee: 'coffee',
  'fast-food': 'food',
  snacks: 'cookie',

  // Transportation
  transportation: 'car',
  fuel: 'gas-station',
  'car-maintenance': 'car-wrench',
  'public-transit': 'bus',
  parking: 'parking',
  tolls: 'road-variant',
  'auto-insurance': 'car-shield',

  // Health & Wellness
  'health-insurance': 'shield-plus',
  'medical-expenses': 'medical-bag',
  pharmacy: 'medical-bag', // Changed from 'pharmacy' to 'medical-bag'
  'gym-fitness': 'dumbbell',

  // Education & Entertainment
  education: 'school',
  entertainment: 'gamepad-variant',
  'streaming-services': 'television',
  subscriptions: 'sync',

  // Personal Care & Shopping
  clothing: 'hanger',
  'personal-care': 'face-man',
  beauty: 'lipstick',
  haircuts: 'content-cut', // Changed from 'scissors' to 'content-cut'

  // Home & Living
  'household-supplies': 'spray-bottle',
  'home-repairs': 'tools',
  'home-improvement': 'hammer',
  furniture: 'chair-rolling',
  electronics: 'television',
  'office-supplies': 'pencil',

  // Family & Pets
  'pet-care': 'paw',
  childcare: 'baby-carriage',

  // Travel & Leisure
  travel: 'airplane',
  vacation: 'beach',
  
  // Gifts & Donations
  gifts: 'gift',
  donations: 'hand-heart',

  // Financial
  savings: 'piggy-bank',
  investments: 'chart-line',
  taxes: 'file-document',
  'debt-payments': 'credit-card',

  // Miscellaneous
  'books-magazines': 'book',
  miscellaneous: 'dots-horizontal'
};

// Available icons for custom categories
export const AVAILABLE_ICONS = [
  // Basic
  'tag', 'dots-horizontal', 'pencil', 'content-cut', 'brush',
  // Finance
  'cash', 'cash-multiple', 'credit-card', 'wallet', 'bank',
  'piggy-bank', 'chart-line', 'file-document', 'shield-check',
  'currency-usd', 'percent', 'bank-transfer', 'receipt',
  'hand-coin', 'cash-register', 'currency-eur', 'sale',
  // Bills
  'file-document-outline', 'lightning-bolt', 'water', 'home',
  'wifi', 'phone', 'television', 'gas-station', 'shield-home',
  'finance', 'handshake', 'account-cash',
  // Food
  'silverware-fork-knife', 'silverware-variant', 'food', 'food-apple',
  'coffee', 'cookie', 'pizza', 'bottle-wine', 'basket',
  'food-takeout-box', 'noodles', 'beer', 'cup',
  // Transport
  'car', 'car-sports', 'bus', 'train', 'bike', 'airplane',
  'gas-station', 'car-wrench', 'parking', 'road-variant',
  'taxi', 'walk', 'ferry', 'subway',
  // Shopping
  'shopping', 'cart', 'tshirt-crew', 'hanger', 'shoe-formal',
  'glasses', 'spray-bottle', 'briefcase', 'shopping-outline',
  'gift', 'store', 'tag-outline',
  // House & Utilities
  'home', 'lightning-bolt', 'flash', 'water', 'wifi',
  'washing-machine', 'chair-rolling', 'tools', 'hammer',
  'window-open', 'door', 'air-conditioner', 'broom',
  'lightbulb', 'security', 'radiator',
  // Health
  'medical-bag', 'shield-plus', 'dumbbell', 'hiking',
  'pill', 'hospital-box', 'heart-pulse', 'run',
  'yoga', 'bandage', 'tooth',
  // Tech
  'laptop', 'desktop-mac', 'printer', 'cellphone', 'television',
  'phone', 'router-wireless', 'keyboard', 'mouse',
  'headphones', 'camera', 'tablet',
  // Entertainment
  'gamepad-variant', 'music', 'movie', 'spotify', 'youtube',
  'netflix', 'instagram', 'facebook', 'play-circle',
  'ticket', 'cards', 'party-popper',
  // Education
  'school', 'book', 'book-open-page-variant', 'pencil-box',
  'calculator', 'notebook', 'diploma', 'bookshelf',
  'translator', 'teach',
  // Travel
  'beach', 'swim', 'umbrella', 'passport', 'map-marker',
  'suitcase', 'sun', 'mountain', 'palm-tree',
  'hotel', 'camera', 'earth',
  // Family & Personal
  'baby-carriage', 'face-man', 'heart', 'paw', 'hand-heart',
  'account-group', 'human-male-female-child', 'dog',
  'cat', 'teddy-bear',
  // Services
  'cloud', 'scissors', 'broom', 'key', 'cog',
  'wrench', 'palette', 'printer', 'brush',
  'vacuum', 'washing', 'iron'
];

const CategoriesContext = createContext();

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [categoryColors, setCategoryColors] = useState({});
  const [customIcons, setCustomIcons] = useState({});
  const { t } = useLanguage();

  const loadCategoriesAndColors = async () => {
    try {
      const [storedCategories, storedColors, storedCustomIcons] = await Promise.all([
        AsyncStorage.getItem(CATEGORIES_STORAGE_KEY),
        AsyncStorage.getItem(CATEGORY_COLORS_KEY),
        AsyncStorage.getItem(CATEGORY_CUSTOM_ICONS_KEY)
      ]);

      // Get translated default categories
      const translatedDefaultCategories = DEFAULT_CATEGORY_KEYS.map(key => t(key));
      let parsedCategories = [];
      let parsedColors = storedColors ? JSON.parse(storedColors) : {};

      if (storedCategories) {
        const stored = JSON.parse(storedCategories);
        // Update any default category names to their current translation
        parsedCategories = stored.map(cat => {
          // Find if this category was a default one by checking its untranslated version
          const defaultKey = DEFAULT_CATEGORY_KEYS.find(key => {
            const oldTranslation = Object.values(translations).some(lang => 
              lang[key].toLowerCase() === cat.toLowerCase()
            );
            return oldTranslation;
          });
          
          if (defaultKey) {
            // If it was a default category, use current translation
            const newTranslation = t(defaultKey);
            // Update the color mapping if needed
            if (parsedColors[cat]) {
              parsedColors[newTranslation] = parsedColors[cat];
              delete parsedColors[cat];
            }
            return newTranslation;
          }
          return cat;
        });
      } else {
        // If no stored categories, use translated defaults
        parsedCategories = translatedDefaultCategories;
      }

      // Ensure all categories have colors
      parsedCategories.forEach((category, index) => {
        if (!parsedColors[category]) {
          parsedColors[category] = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
        }
      });

      setCategories(parsedCategories);
      setCategoryColors(parsedColors);

      const parsedCustomIcons = storedCustomIcons ? JSON.parse(storedCustomIcons) : {};
      setCustomIcons(parsedCustomIcons);

      // Save the updated translations
      await saveCategoriesAndColors(parsedCategories, parsedColors, parsedCustomIcons);
    } catch (error) {
      console.error('Error loading categories data:', error);
    }
  };

  // Load categories on mount and when language changes
  useEffect(() => {
    loadCategoriesAndColors();
  }, [t]); // Reload when translations change

  const saveCategoriesAndColors = async (newCategories, newColors, newCustomIcons = customIcons) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCategories)),
        AsyncStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(newColors)),
        AsyncStorage.setItem(CATEGORY_CUSTOM_ICONS_KEY, JSON.stringify(newCustomIcons))
      ]);
      setCategories(newCategories);
      setCategoryColors(newColors);
      setCustomIcons(newCustomIcons);
    } catch (error) {
      console.error('Error saving categories data:', error);
    }
  };

  const addCategory = async (category) => {
    // Check if category exists case-insensitively
    const exists = categories.some(cat => cat.toLowerCase() === category.toLowerCase());
    if (!category || exists) return;
    
    // Use proper casing from existing category if it exists with different case
    const existingCategory = categories.find(cat => cat.toLowerCase() === category.toLowerCase());
    const categoryToAdd = existingCategory || category;
    
    const newCategories = [...categories, categoryToAdd];
    
    // Get all currently used colors
    const usedColors = Object.values(categoryColors);
    
    // Get all unused colors
    const unusedColors = CATEGORY_COLORS.filter(color => !usedColors.includes(color));
    
    // Pick a random unused color, or if all colors are used, pick a random color from all available colors
    const availableColor = unusedColors.length > 0 
      ? unusedColors[Math.floor(Math.random() * unusedColors.length)]
      : CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];
    
    const newColors = {
      ...categoryColors,
      [categoryToAdd]: availableColor
    };

    await saveCategoriesAndColors(newCategories, newColors);
  };

  const removeCategory = async (category) => {
    const newCategories = categories.filter(c => c.toLowerCase() !== category.toLowerCase());
    const newColors = { ...categoryColors };
    delete newColors[category];
    const newCustomIcons = { ...customIcons };
    delete newCustomIcons[category];
    await saveCategoriesAndColors(newCategories, newColors, newCustomIcons);
  };

  const updateCategory = async (oldCategory, newCategory) => {
    const exists = categories.some(cat => 
      cat.toLowerCase() === newCategory.toLowerCase() && 
      cat.toLowerCase() !== oldCategory.toLowerCase()
    );
    if (!newCategory || exists) return;
    
    const newCategories = categories.map(c => 
      c.toLowerCase() === oldCategory.toLowerCase() ? newCategory : c
    );
    
    // Keep the same color for the updated category
    const newColors = { ...categoryColors };
    newColors[newCategory] = categoryColors[oldCategory];
    delete newColors[oldCategory];

    // Keep the same icon for the updated category
    const newCustomIcons = { ...customIcons };
    newCustomIcons[newCategory] = customIcons[oldCategory];
    delete newCustomIcons[oldCategory];
    
    await saveCategoriesAndColors(newCategories, newColors, newCustomIcons);
  };

  const updateCategoryColor = async (category, newColor) => {
    if (!category || !newColor) return;
    const newColors = {
      ...categoryColors,
      [category]: newColor
    };
    await saveCategoriesAndColors(categories, newColors);
  };

  const updateCategoryIcon = async (category, newIcon) => {
    if (!category || !newIcon) return;
    const newCustomIcons = {
      ...customIcons,
      [category]: newIcon
    };
    await saveCategoriesAndColors(categories, categoryColors, newCustomIcons);
  };

  const getCategoryColor = (category) => {
    return categoryColors[category] || CATEGORY_COLORS[0];
  };

  const getCategoryIcon = (category) => {
    if (!category) return 'tag';
    
    // First check if there's a custom icon
    if (customIcons[category]) {
      return customIcons[category];
    }
    
    // Then check if it's a translated default category
    const defaultKey = DEFAULT_CATEGORY_KEYS.find(key => {
      const currentTranslation = t(key);
      return currentTranslation.toLowerCase() === category.toLowerCase();
    });
    
    if (defaultKey) {
      return CATEGORY_ICONS[defaultKey];
    }
    
    // If not a default category, use generic tag icon
    return 'tag';
  };

  return (
    <CategoriesContext.Provider 
      value={{
        categories,
        addCategory,
        removeCategory,
        updateCategory,
        getCategoryColor,
        getCategoryIcon,
        updateCategoryColor,
        updateCategoryIcon,
        AVAILABLE_ICONS,
        CATEGORY_COLORS,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  return useContext(CategoriesContext);
}