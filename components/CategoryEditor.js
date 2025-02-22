import React, { useState, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions, Platform, PanResponder } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, useTheme, SegmentedButtons } from 'react-native-paper';
import { useCategories } from '../context/CategoriesContext';
import { useLanguage } from '../context/LanguageContext';

// Extended color palette
const EXTENDED_COLORS = [
  // Reds & Crimsons
  '#FF0000', '#E34234', '#8B0000', '#B71C1C',
  
  // Oranges & Orange-Reds
  '#FF4500', '#FF6B00', '#FF8C00', '#FFA500',
  
  // Different Yellows & Golds (replaced previous duplicates)
  '#FFD700', '#E6B800', '#DAA520', '#BDB76B',
  
  // Warm Greens
  '#9ACD32', '#32CD32', '#228B22', '#00FF7F',
  
  // Cool & Deep Greens
  '#008000', '#006400', '#2E8B57',
  
  // Teals & Cyan
  '#008080', '#20B2AA', '#40E0D0',
  
  // Light Blues
  '#87CEEB', '#00BFFF', '#1E90FF',
  
  // Medium & Deep Blues
  '#0000FF', '#0000CD', '#191970', '#483D8B',
  
  // Indigos & Deep Purples
  '#4B0082', '#800080', '#8A2BE2',
  
  // Bright Purples & Magentas
  '#9400D3', '#FF00FF', '#FF1493',
  
  // Pinks
  '#FF69B4', '#FFB6C1',
  
  // Browns from Light to Dark
  '#D2691E', '#A0522D', '#8B4513',
  
  // Greys from Light to Dark
  '#A9A9A9', '#708090', '#2F4F4F'
];

// Extended icon set organized by categories
const EXTENDED_ICONS = {
  basic: [
    'silverware-fork-knife', // food
    'car', // transport
    'shopping', // shopping
    'file-document', // bills
    'gamepad-variant', // entertainment
    'cash-multiple', // salary
    'home', // rent
    'basket', // groceries
    'dots-horizontal', // other
    'tag', // generic icon for custom categories
  ],
  finance: [
    'cash', 'cash-multiple', 'credit-card', 'wallet', 'bank',
    'piggy-bank', 'chart-line', 'file-document', 'shield-check',
    'currency-usd', 'percent', 'bank-transfer', 'receipt',
    'hand-coin', 'cash-register', 'currency-eur', 'sale'
  ],
  bills: [
    'file-document-outline', 'lightning-bolt', 'water', 'home',
    'wifi', 'phone', 'television', 'gas-station', 'shield-home',
    'finance', 'handshake', 'account-cash'
  ],
  food: [
    'silverware-fork-knife', 'silverware-variant', 'food', 'food-apple',
    'coffee', 'cookie', 'pizza', 'bottle-wine', 'basket',
    'food-takeout-box', 'noodles', 'beer', 'cup'
  ],
  transport: [
    'car', 'car-sports', 'bus', 'train', 'bike', 'airplane',
    'gas-station', 'car-wrench', 'parking', 'road-variant',
    'taxi', 'walk', 'ferry', 'subway'
  ],
  shopping: [
    'shopping', 'cart', 'tshirt-crew', 'hanger', 'shoe-formal',
    'glasses', 'spray-bottle', 'briefcase', 'shopping-outline',
    'gift', 'store', 'tag-outline'
  ],
  house: [
    'home', 'lightning-bolt', 'flash', 'water', 'wifi',
    'washing-machine', 'chair-rolling', 'tools', 'hammer',
    'window-open', 'door', 'air-conditioner', 'broom',
    'lightbulb', 'security', 'radiator'
  ],
  health: [
    'medical-bag', 'shield-plus', 'dumbbell', 'hiking',
    'pill', 'hospital-box', 'heart-pulse', 'run',
    'yoga', 'bandage', 'tooth'
  ],
  tech: [
    'laptop', 'desktop-mac', 'printer', 'cellphone', 'television',
    'phone', 'router-wireless', 'keyboard', 'mouse',
    'headphones', 'camera', 'tablet'
  ],
  entertainment: [
    'gamepad-variant', 'music', 'movie', 'spotify', 'youtube',
    'netflix', 'instagram', 'facebook', 'play-circle',
    'ticket', 'cards', 'party-popper'
  ],
  education: [
    'school', 'book', 'book-open-page-variant', 'pencil-box',
    'calculator', 'notebook', 'book-education', 'bookshelf',
    'desk-lamp', 'lead-pencil'
  ],
  travel: [
    'beach', 'swim', 'umbrella', 'passport', 'map-marker',
    'airplane', 'compass', 'airplane-takeoff', 'palm-tree',
    'bed', 'camera', 'earth'
  ],
  family: [
    'baby-carriage', 'face-man', 'heart', 'paw', 'hand-heart',
    'account-group', 'human-male-female-child', 'dog',
    'cat', 'teddy-bear'
  ],
  services: [
    'cloud', 'content-cut', 'broom', 'key', 'cog',
    'wrench', 'palette', 'printer', 'brush',
    'vacuum', 'washing-machine', 'iron'
  ]
};

export const CategoryEditor = ({ category, onClose }) => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const { getCategoryColor, getCategoryIcon, updateCategoryColor, updateCategoryIcon } = useCategories();
  const { t } = useLanguage();
  const [selectedColor, setSelectedColor] = useState(getCategoryColor(category));
  const [selectedIcon, setSelectedIcon] = useState(getCategoryIcon(category));
  const [selectedIconCategory, setSelectedIconCategory] = useState('basic');
  const [selectedTab, setSelectedTab] = useState('colors');
  const categoryScrollRef = useRef(null);
  const [isScrollingCategories, setIsScrollingCategories] = useState(false);

  // Calculate dimensions based on screen width
  const itemsPerRow = Math.floor(width / 50); // Adjust 50 to change density
  const colorSize = (width - 32 - (itemsPerRow - 1) * 8) / itemsPerRow; // 32 for padding, 8 for gap

  const handleColorSelect = async (color) => {
    setSelectedColor(color);
    await updateCategoryColor(category, color);
  };

  const handleIconSelect = async (icon) => {
    setSelectedIcon(icon);
    await updateCategoryIcon(category, icon);
  };

  const handleKeyPress = (e) => {
    const currentIndex = iconCategories.findIndex(cat => cat.key === selectedIconCategory);
    
    if (e.key === 'ArrowRight' && currentIndex < iconCategories.length - 1) {
      setSelectedIconCategory(iconCategories[currentIndex + 1].key);
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      setSelectedIconCategory(iconCategories[currentIndex - 1].key);
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      // Only respond to touches in the bottom half of the screen
      return evt.nativeEvent.locationY > height / 2;
    },
    onMoveShouldSetPanResponder: (evt) => {
      // Only respond to touches in the bottom half of the screen
      return evt.nativeEvent.locationY > height / 2;
    },
    onPanResponderRelease: (_, gestureState) => {
      const { dx } = gestureState;
      if (Math.abs(dx) > 50) {  // Threshold of 50 pixels
        if (dx > 0) {  // Swipe right
          if (selectedTab === 'icons') setSelectedTab('colors');
        } else {  // Swipe left
          if (selectedTab === 'colors') setSelectedTab('icons');
        }
      }
    }
  });

  // Icon categories for the segmented control
  const iconCategories = [
    { key: 'basic', label: t('iconCatBasic') },
    { key: 'finance', label: t('iconCatFinance') },
    { key: 'bills', label: t('iconCatBills') },
    { key: 'food', label: t('iconCatFood') },
    { key: 'transport', label: t('iconCatTransport') },
    { key: 'shopping', label: t('iconCatShopping') },
    { key: 'house', label: t('iconCatHouse') },
    { key: 'health', label: t('iconCatHealth') },
    { key: 'tech', label: t('iconCatTech') },
    { key: 'entertainment', label: t('iconCatEntertainment') },
    { key: 'education', label: t('iconCatEducation') },
    { key: 'travel', label: t('iconCatTravel') },
    { key: 'family', label: t('iconCatFamily') },
    { key: 'services', label: t('iconCatServices') }
  ];

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Text variant="titleLarge" style={[styles.title, { color: colors.text }]}>{category}</Text>
      
      <SegmentedButtons
        value={selectedTab}
        onValueChange={setSelectedTab}
        style={styles.tabButtons}
        buttons={[
          { 
            value: 'colors', 
            label: t('colors'),
            style: { borderRadius: 8 }
          },
          { 
            value: 'icons', 
            label: t('icons'),
            style: { borderRadius: 8 }
          },
        ]}
      />

      <ScrollView 
        style={[
          styles.scrollContainer,
          Platform.OS === 'web' && {
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0,0,0,0.3) transparent',
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: '-ms-autohiding-scrollbar',
          }
        ]} 
        contentContainerStyle={styles.contentContainer}
      >
        {selectedTab === 'colors' ? (
          <View style={styles.colorGridContainer}>
            <View style={styles.colorContainer}>
              {EXTENDED_COLORS.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorButton,
                    { 
                      backgroundColor: color,
                      width: colorSize,
                      height: colorSize,
                      margin: 4,
                    },
                    selectedColor === color && [
                      styles.selectedItem,
                      { borderColor: colors.primary }
                    ]
                  ]}
                  onPress={() => handleColorSelect(color)}
                />
              ))}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.categoryScrollContainer}>
              <ScrollView 
                ref={categoryScrollRef}
                horizontal 
                showsHorizontalScrollIndicator={true}
                onScrollBeginDrag={() => setIsScrollingCategories(true)}
                onScrollEndDrag={() => setIsScrollingCategories(false)}
                onMomentumScrollEnd={() => setIsScrollingCategories(false)}
                style={[
                  styles.categoryScroll,
                  Platform.OS === 'web' && {
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(0,0,0,0.3) transparent',
                    WebkitOverflowScrolling: 'touch',
                    msOverflowStyle: '-ms-autohiding-scrollbar',
                  }
                ]}
                contentContainerStyle={styles.categoryScrollContent}
              >
                {iconCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryButton,
                      { backgroundColor: colors.surfaceVariant },
                      selectedIconCategory === cat.key && {
                        backgroundColor: colors.primary,
                      }
                    ]}
                    onPress={() => setSelectedIconCategory(cat.key)}
                    onKeyDown={handleKeyPress}
                    tabIndex={0}
                    accessible={true}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: selectedIconCategory === cat.key }}
                  >
                    <Text style={[
                      styles.categoryText,
                      { color: selectedIconCategory === cat.key ? colors.onPrimary : colors.onSurfaceVariant }
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.iconGridContainer}>
              <View style={styles.iconGrid}>
                {EXTENDED_ICONS[selectedIconCategory].map((icon, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.iconButton,
                      { backgroundColor: colors.surfaceVariant },
                      selectedIcon === icon && [
                        styles.selectedItem,
                        { borderColor: colors.primary }
                      ]
                    ]}
                    onPress={() => handleIconSelect(icon)}
                  >
                    <MaterialCommunityIcons 
                      name={icon} 
                      size={28}  // Increased from 24
                      color={selectedColor}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32, // Add extra padding at bottom for better scrolling
  },
  title: {
    marginVertical: 16,
    textAlign: 'center',
  },
  tabButtons: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  colorGridContainer: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  colorButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  iconGridContainer: {
    flex: 1,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  iconButton: {
    width: 52,  // Increased from 48
    height: 52, // Increased from 48
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 4,
  },
  selectedItem: {
    borderWidth: 4,
  },
  categoryScrollContainer: {
    marginVertical: 8,
    overflow: 'hidden',
    WebkitOverflowScrolling: 'touch',
  },
  categoryScroll: {
    flexGrow: 0,
    minHeight: 48,
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(0,0,0,0.3) transparent',
    msOverflowStyle: '-ms-autohiding-scrollbar',
  },
  categoryScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
    paddingHorizontal: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    minWidth: 100,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  }
});