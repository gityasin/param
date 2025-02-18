import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from './LanguageContext';

const CATEGORIES_STORAGE_KEY = '@categories';
const CATEGORY_COLORS_KEY = '@category_colors';

// Default category keys - these match the translation keys
const DEFAULT_CATEGORY_KEYS = ['food', 'transport', 'shopping', 'bills', 'entertainment', 'other'];

// A set of distinguishable colors
const CATEGORY_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Sage
  '#FFEEAD', // Cream
  '#FFD93D', // Yellow
  '#6C5B7B', // Purple
  '#C06C84', // Pink
  '#F8B195', // Peach
  '#2E86AB', // Navy
  '#A8E6CE', // Mint
  '#FF8C42', // Orange
  '#4B4E6D', // Dark Blue
  '#84DCC6', // Turquoise
  '#95A5A6', // Gray
  '#D980FA', // Bright Purple
  '#B53471', // Magenta
  '#12CBC4', // Cyan
  '#FFA502', // Dark Orange
  '#009432', // Green
];

const CategoriesContext = createContext();

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [categoryColors, setCategoryColors] = useState({});
  const { t } = useLanguage();

  const loadCategoriesAndColors = async () => {
    try {
      const [storedCategories, storedColors] = await Promise.all([
        AsyncStorage.getItem(CATEGORIES_STORAGE_KEY),
        AsyncStorage.getItem(CATEGORY_COLORS_KEY)
      ]);

      // Get translated default categories
      const translatedDefaultCategories = DEFAULT_CATEGORY_KEYS.map(key => t(key));
      let parsedCategories = translatedDefaultCategories;
      let parsedColors = {};

      if (storedCategories) {
        parsedCategories = JSON.parse(storedCategories);
      }

      if (storedColors) {
        parsedColors = JSON.parse(storedColors);
      } else {
        // Assign initial colors to default categories
        parsedColors = parsedCategories.reduce((acc, category, index) => {
          acc[category] = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
          return acc;
        }, {});
      }

      setCategories(parsedCategories);
      setCategoryColors(parsedColors);
    } catch (error) {
      console.error('Error loading categories and colors:', error);
    }
  };

  // Load categories on mount and when language changes
  useEffect(() => {
    loadCategoriesAndColors();
  }, [t]); // Reload when translations change

  const saveCategoriesAndColors = async (newCategories, newColors) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCategories)),
        AsyncStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(newColors))
      ]);
      setCategories(newCategories);
      setCategoryColors(newColors);
    } catch (error) {
      console.error('Error saving categories and colors:', error);
    }
  };

  const addCategory = async (category) => {
    if (!category || categories.includes(category)) return;
    
    const newCategories = [...categories, category];
    
    // Find first unused color
    const usedColors = Object.values(categoryColors);
    const availableColor = CATEGORY_COLORS.find(color => !usedColors.includes(color)) 
      || CATEGORY_COLORS[newCategories.length % CATEGORY_COLORS.length];
    
    const newColors = {
      ...categoryColors,
      [category]: availableColor
    };

    await saveCategoriesAndColors(newCategories, newColors);
  };

  const removeCategory = async (category) => {
    const newCategories = categories.filter(c => c !== category);
    const newColors = { ...categoryColors };
    delete newColors[category];
    await saveCategoriesAndColors(newCategories, newColors);
  };

  const updateCategory = async (oldCategory, newCategory) => {
    if (!newCategory || categories.includes(newCategory)) return;
    const newCategories = categories.map(c => 
      c === oldCategory ? newCategory : c
    );
    
    // Keep the same color for the updated category
    const newColors = { ...categoryColors };
    newColors[newCategory] = categoryColors[oldCategory];
    delete newColors[oldCategory];
    
    await saveCategoriesAndColors(newCategories, newColors);
  };

  const getCategoryColor = (category) => {
    return categoryColors[category] || CATEGORY_COLORS[0];
  };

  return (
    <CategoriesContext.Provider 
      value={{
        categories,
        addCategory,
        removeCategory,
        updateCategory,
        getCategoryColor,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  return useContext(CategoriesContext);
}