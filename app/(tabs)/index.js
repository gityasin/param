import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Platform, Pressable, KeyboardAvoidingView } from 'react-native';
import { Text, FAB, Surface, useTheme, Divider, SegmentedButtons, Button, TouchableRipple, Portal, Dialog } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTransactions } from '../../context/TransactionsContext';
import TransactionItem from '../../components/TransactionItem';
import { formatCurrency } from '../../services/format';
import { useLanguage } from '../../context/LanguageContext';
import { useRouter } from 'expo-router';

// Only import DateTimePicker for non-web platforms
const DateTimePicker = Platform.select({
  web: null,
  default: require('@react-native-community/datetimepicker').default,
});

const CustomDialog = Platform.select({
  web: ({ visible, onDismiss, children, style, theme }) => {
    const [opacity, setOpacity] = useState(0);
    const dialogRef = useRef(null);

    useEffect(() => {
      if (visible) {
        requestAnimationFrame(() => setOpacity(1));
        const lastActiveElement = document.activeElement;
        if (dialogRef.current) {
          dialogRef.current.focus();
        }
        return () => {
          setOpacity(0);
          if (lastActiveElement) {
            lastActiveElement.focus();
          }
        };
      }
    }, [visible]);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    useEffect(() => {
      if (visible) {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
      }
    }, [visible]);
    
    if (!visible) return null;
    
    return (
      <div 
        role="dialog"
        aria-modal="true"
        ref={dialogRef}
        tabIndex={-1}
        onClick={onDismiss}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          opacity,
          transition: 'opacity 0.2s ease-in-out',
        }}
      >
        <div 
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 8,
            padding: 20,
            maxWidth: 400,
            width: '90%',
            position: 'relative',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transform: `translateY(${opacity * 0}px)`,
            transition: 'transform 0.2s ease-out',
            ...style,
          }}
          onClick={e => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    );
  },
  default: Dialog,
});

// Add a style tag for the date input on web
if (Platform.OS === 'web') {
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    .custom-date-input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      z-index: 2;
      padding: 0;
      margin: 0;
      border: none;
      -webkit-appearance: none;
      appearance: none;
    }
    .custom-date-input::-webkit-calendar-picker-indicator {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
    }
  `;
  document.head.appendChild(styleTag);
}

export default function HomeScreen() {
  const { 
    activeFilter, 
    setActiveFilter, 
    getFilteredTotals, 
    getFilteredTransactions, 
    selectedCurrency,
    FILTER_TYPES,
    customDateRange,
    setCustomRange
  } = useTransactions();
  const theme = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState(null);
  const [showCustomFilterModal, setShowCustomFilterModal] = useState(false);
  const [tempDateRange, setTempDateRange] = useState(null);

  // Get filtered transactions and totals
  const filteredTransactions = getFilteredTransactions();
  const { total, income, expenses } = getFilteredTotals();

  // Initialize or reset temp date range when modal opens
  useEffect(() => {
    if (showCustomFilterModal) {
      setTempDateRange(customDateRange || { startDate: null, endDate: null });
    }
  }, [showCustomFilterModal]);

  const handleApplyDateRange = () => {
    if (tempDateRange?.startDate) {
      setCustomRange(tempDateRange.startDate, tempDateRange.endDate);
    }
    setShowCustomFilterModal(false);
  };

  const handleDateSelect = (event, selectedDate) => {
    if (Platform.OS === 'web') {
      // For web, the event comes directly from the input element
      const date = new Date(event.target.value);
      if (!isNaN(date.getTime())) {  // Check if date is valid
        // If end date is selected and it's today, set it to null to represent "today"
        if (datePickerType === 'end' && isToday(date)) {
          setTempDateRange(prev => ({
            ...prev,
            endDate: null
          }));
        } else {
          setTempDateRange(prev => ({
            ...prev,
            [datePickerType === 'start' ? 'startDate' : 'endDate']: date
          }));
        }
      }
    } else {
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }
      
      if (!selectedDate || event.type === 'dismissed') {
        setShowDatePicker(false);
        return;
      }

      // If end date is selected and it's today, set it to null to represent "today"
      if (datePickerType === 'end' && isToday(selectedDate)) {
        setTempDateRange(prev => ({
          ...prev,
          endDate: null
        }));
      } else {
        setTempDateRange(prev => ({
          ...prev,
          [datePickerType === 'start' ? 'startDate' : 'endDate']: selectedDate
        }));
      }
    }
  };

  // Helper function to check if a date is today
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const renderDateButton = (type, label) => {
    const date = type === 'start' ? tempDateRange?.startDate : tempDateRange?.endDate;
    const displayText = date ? new Date(date).toLocaleDateString() : (type === 'end' ? t('today') : t('selectDate'));
    const ariaLabel = `${label}: ${displayText}`;

    return (
      <TouchableRipple
        onPress={() => {
          setDatePickerType(type);
          if (Platform.OS !== 'web') {
            setShowDatePicker(true);
          }
        }}
        style={[styles.dateButton, { borderColor: theme.colors.outline }]}
        accessibilityLabel={ariaLabel}
        accessibilityRole="button"
      >
        <>
          <View style={styles.dateButtonContent}>
            <Text variant="bodyLarge" style={{ color: theme.colors.text }}>
              {label}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
              {displayText}
            </Text>
          </View>
          {Platform.OS === 'web' && (
            <input
              type="date"
              value={date ? new Date(date).toISOString().split('T')[0] : ''}
              onChange={(e) => {
                setDatePickerType(type);
                handleDateSelect(e);
              }}
              max={new Date().toISOString().split('T')[0]}
              aria-label={ariaLabel}
              title={t('selectDate')}
              className="custom-date-input"
            />
          )}
        </>
      </TouchableRipple>
    );
  };

  const renderCustomFilterModal = () => (
    <CustomDialog 
      visible={showCustomFilterModal} 
      onDismiss={() => setShowCustomFilterModal(false)} 
      style={styles.dialogContainer}
      theme={theme}
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
        <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.text }]}>
          {t('customDateRange')}
        </Text>

        <View style={styles.datePickersContainer}>
          {renderDateButton('start', t('startDate'))}
          {renderDateButton('end', t('endDate'))}
        </View>

        <View style={styles.modalActions}>
          <Button
            mode="outlined"
            onPress={() => setShowCustomFilterModal(false)}
            style={styles.modalButton}
          >
            {t('cancel')}
          </Button>
          <Button
            mode="contained"
            onPress={handleApplyDateRange}
            style={styles.modalButton}
            disabled={!tempDateRange?.startDate}
          >
            {t('apply')}
          </Button>
        </View>

        {Platform.OS !== 'web' && showDatePicker && DateTimePicker && (
          <DateTimePicker
            testID="datePicker"
            value={new Date(datePickerType === 'start'
              ? tempDateRange?.startDate || new Date()
              : tempDateRange?.endDate || new Date()
            )}
            mode="date"
            onChange={handleDateSelect}
            maximumDate={new Date()}
            display={Platform.select({
              ios: 'spinner',
              android: 'default'
            })}
          />
        )}
      </View>
    </CustomDialog>
  );

  const handleDateRangeTextPress = () => {
    if (activeFilter === FILTER_TYPES.custom) {
      setShowCustomFilterModal(true);
    }
  };

  const renderHeader = () => (
    <>
      <Surface style={[styles.summaryContainer, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.text }]}>
          {t('myBudget')}
        </Text>

        <SegmentedButtons
          value={activeFilter}
          onValueChange={(value) => {
            // Don't show modal if switching to custom and we have a saved range
            if (value === FILTER_TYPES.custom && !(customDateRange?.startDate)) {
              setShowCustomFilterModal(true);
            }
            setActiveFilter(value);
          }}
          buttons={[
            { value: FILTER_TYPES.monthly, label: t('monthly') },
            { value: FILTER_TYPES.allTime, label: t('allTime') },
            { value: FILTER_TYPES.custom, label: t('custom') },
          ]}
          style={styles.filterButtons}
        />

        {/* Show date range text anytime we have a custom range and are on custom tab */}
        {activeFilter === FILTER_TYPES.custom && customDateRange?.startDate && (
          <Pressable onPress={handleDateRangeTextPress}>
            <Text variant="bodyMedium" style={[styles.dateRangeText, { 
              color: theme.colors.primary,
              textDecorationLine: Platform.OS === 'web' ? 'underline' : 'none',
            }]}>
              {new Date(customDateRange.startDate).toLocaleDateString()}
              {customDateRange.endDate ? ` - ${new Date(customDateRange.endDate).toLocaleDateString()}` : ` - ${t('today')}`}
            </Text>
          </Pressable>
        )}
        
        <View style={styles.balanceRow}>
          <Text variant="titleLarge" style={{ color: theme.colors.text }}>{t('totalBalance')}</Text>
          <Text 
            variant="headlineMedium"
            style={{ color: total >= 0 ? theme.colors.success : theme.colors.error }}
          >
            {formatCurrency(total, selectedCurrency)}
          </Text>
        </View>

        <Divider style={styles.divider} />
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ color: theme.colors.success }}>
              {t('income')}
            </Text>
            <Text variant="titleLarge" style={{ color: theme.colors.success }}>
              +{formatCurrency(income, selectedCurrency)}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ color: theme.colors.error }}>
              {t('expense')}
            </Text>
            <Text variant="titleLarge" style={{ color: theme.colors.error }}>
              {formatCurrency(Math.abs(expenses), selectedCurrency)}
            </Text>
          </View>
        </View>
      </Surface>

      <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {t('recentTransactions')}
      </Text>
    </>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text variant="bodyLarge" style={{ color: theme.colors.textSecondary }}>
        {t('noTransactions')}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.textSecondary }}>
        {t('addFirstTransaction')}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem 
            transaction={item}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={styles.listContent}
        style={Platform.OS === 'web' ? {
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0,0,0,0.3) transparent',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: '-ms-autohiding-scrollbar',
        } : undefined}
      />
      {renderCustomFilterModal()}
      <FAB
        icon={props => (
          <MaterialCommunityIcons
            name="plus"
            size={24}
            color={theme.colors.onPrimary}
          />
        )}
        style={[styles.fab, { 
          backgroundColor: theme.colors.primary,
        }]}
        onPress={() => router.push('/add-transaction')}
        label={t('addTransaction')}
        labelStyle={{ color: theme.colors.onPrimary }}
        theme={{
          colors: {
            primaryContainer: theme.colors.primary,
            onPrimaryContainer: theme.colors.onPrimary,
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  listContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 80 : 100, // Increased padding for mobile
    flexGrow: 1,
    minHeight: Platform.OS === 'web' ? '100%' : 'auto',
  },
  summaryContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  title: {
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'flex-start',
  },
  sectionTitle: {
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: Platform.OS === 'ios' ? 25 : 16, // Reduced bottom margin to bring FAB closer to bottom
  },
  filterButtons: {
    marginBottom: 16,
  },
  dialogContainer: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    width: Platform.OS === 'web' ? '100%' : '90%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  datePickersContainer: {
    gap: 16,
    marginBottom: 20,
    width: '100%',
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
  },
  dateButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  applyButton: {
    marginTop: 8,
  },
  dateRangeText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  modalButton: {
    minWidth: 100,
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    gap: 10,
  },
  datePickerButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    flex: 1,
    position: 'relative',
  },
  webDateInputWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'visible',
    zIndex: 1,
  },
});
