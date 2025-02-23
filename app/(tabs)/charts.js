import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Platform, TouchableWithoutFeedback, Pressable } from 'react-native';
import { Text, Surface, useTheme, SegmentedButtons, Menu, Button } from 'react-native-paper';
import { VictoryPie, VictoryLabel, VictoryContainer, createContainer } from 'victory-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTransactions } from '../../context/TransactionsContext';
import { formatCurrency } from '../../services/format';
import { useLanguage } from '../../context/LanguageContext';
import { useCategories } from '../../context/CategoriesContext';

const CHART_TYPES = [
  { value: 'pie', label: 'pieChart' },
  { value: 'donut', label: 'donutChart' },
];

export default function ChartScreen() {
  const { 
    state, 
    selectedCurrency, 
    activeFilter,
    setActiveFilter,
    FILTER_TYPES,
    getFilteredTransactions,
    customDateRange
  } = useTransactions();
  const theme = useTheme();
  const { colors } = theme;
  const { t } = useLanguage();
  const { getCategoryColor } = useCategories();
  const [chartType, setChartType] = useState('pie');
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Calculate total expenses and group by category using filtered transactions
  const filteredTransactions = getFilteredTransactions();
  const expensesByCategory = filteredTransactions
    .filter(tx => tx.amount < 0)
    .reduce((acc, tx) => {
      const category = tx.category || 'Other';
      const existingCategory = Object.keys(acc).find(key => key.toLowerCase() === category.toLowerCase());
      const finalCategory = existingCategory || category;
      acc[finalCategory] = (acc[finalCategory] || 0) + Math.abs(tx.amount);
      return acc;
    }, {});

  // Sort and process chart data, grouping small segments
  const SMALL_SEGMENT_THRESHOLD = 0.03; // 3% threshold
  const sortedEntries = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a);
  
  const total = sortedEntries.reduce((sum, [, amount]) => sum + amount, 0);
  
  const chartData = sortedEntries.reduce((acc, [category, amount]) => {
    const percentage = amount / total;
    if (percentage < SMALL_SEGMENT_THRESHOLD) {
      acc.smallSegments.amount += amount;
      acc.smallSegments.categories.push(category);
    } else {
      acc.mainSegments.push({
        x: category,
        y: amount,
        originalAmount: amount,
        color: getCategoryColor(category),
        label: `${category}\n${((amount / total) * 100).toFixed(1)}%`
      });
    }
    return acc;
  }, { mainSegments: [], smallSegments: { amount: 0, categories: [] } });

  // Add "Other" category if we have small segments
  const sortedChartData = chartData.smallSegments.amount > 0 
    ? [...chartData.mainSegments, {
        x: 'Other',
        y: chartData.smallSegments.amount,
        originalAmount: chartData.smallSegments.amount,
        color: getCategoryColor('Other'),
        label: `Other\n${((chartData.smallSegments.amount / total) * 100).toFixed(1)}%`
      }]
    : chartData.mainSegments;

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text variant="bodyLarge" style={{ color: colors.textSecondary }}>
        {t('noExpenseData')}
      </Text>
      <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
        {t('addExpensesToSee')}
      </Text>
    </View>
  );

  const renderSummary = () => {
    if (total <= 0) return null;

    return (
      <Surface style={[styles.summaryContainer, { backgroundColor: colors.surface, width: '100%' }]} elevation={2}>
        <Text variant="titleLarge" style={[styles.summaryTitle, { color: colors.text }]}>
          {t('summary')}
        </Text>
        
        <View style={styles.summaryList}>
          {sortedChartData.map((item) => {
            const percentage = ((item.originalAmount / total) * 100).toFixed(1);
            return (
              <View key={item.x} style={styles.summaryItem}>
                <View style={styles.summaryLeftSection}>
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text style={[styles.summaryCategory, { color: colors.text }]}>{item.x}</Text>
                </View>
                <View style={styles.summaryRightSection}>
                  <Text style={[styles.summaryPercentage, { color: colors.textSecondary }]}>
                    {percentage}%
                  </Text>
                  <Text style={[styles.summaryAmount, { color: colors.text }]}>
                    {formatCurrency(item.originalAmount, selectedCurrency)}
                  </Text>
                </View>
              </View>
            );
          })}
          <View style={[styles.totalLine, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalText, { color: colors.text }]}>{t('total')}</Text>
            <Text style={[styles.totalAmount, { color: colors.error }]}>
              {formatCurrency(total, selectedCurrency)}
            </Text>
          </View>
        </View>
      </Surface>
    );
  };

  const renderFilterButton = () => {
    let filterText = '';
    switch (activeFilter) {
      case FILTER_TYPES.monthly:
        filterText = t('monthly');
        break;
      case FILTER_TYPES.allTime:
        filterText = t('allTime');
        break;
      case FILTER_TYPES.custom:
        if (customDateRange?.startDate) {
          const start = new Date(customDateRange.startDate).toLocaleDateString();
          const end = customDateRange.endDate 
            ? new Date(customDateRange.endDate).toLocaleDateString()
            : t('today');
          filterText = `${start} - ${end}`;
        } else {
          filterText = t('custom');
        }
        break;
    }

    return (
      <Menu
        visible={showFilterMenu}
        onDismiss={() => setShowFilterMenu(false)}
        anchor={
          <Button
            mode="text"
            onPress={() => setShowFilterMenu(true)}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="calendar" size={size} color={color} />
            )}
            style={styles.filterButton}
          >
            {filterText}
          </Button>
        }
      >
        <Menu.Item 
          onPress={() => {
            setActiveFilter(FILTER_TYPES.monthly);
            setShowFilterMenu(false);
          }} 
          title={t('monthly')}
        />
        <Menu.Item 
          onPress={() => {
            setActiveFilter(FILTER_TYPES.allTime);
            setShowFilterMenu(false);
          }} 
          title={t('allTime')}
        />
        <Menu.Item 
          onPress={() => {
            setActiveFilter(FILTER_TYPES.custom);
            setShowFilterMenu(false);
          }} 
          title={t('custom')}
        />
      </Menu>
    );
  };

  const VictoryZoomVoronoiContainer = createContainer("zoom", "voronoi");

  return (
    <ScrollView 
      style={[
        styles.container, 
        { backgroundColor: colors.background },
        Platform.OS === 'web' && {
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0,0,0,0.3) transparent',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: '-ms-autohiding-scrollbar',
        }
      ]}
      contentContainerStyle={styles.contentContainer}
    >
      <Text variant="headlineMedium" style={[styles.title, { color: colors.text, textAlign: 'center', width: '100%' }]}>
        {t('expenseBreakdown')}
      </Text>
      
      <Surface style={[styles.chartContainer, { backgroundColor: colors.surface, width: '100%' }]} elevation={2}>
        <View style={styles.headerRow}>
          <Text variant="titleLarge" style={[styles.totalAmount, { color: colors.error, flex: 1 }]}>
            {t('total')}: {formatCurrency(total, selectedCurrency)}
          </Text>
          {renderFilterButton()}
        </View>

        <SegmentedButtons
          value={chartType}
          onValueChange={setChartType}
          buttons={CHART_TYPES.map(type => ({
            ...type,
            label: t(type.label)
          }))}
          style={styles.segmentedButtons}
        />
        
        {total > 0 ? (
          <>
            <View style={styles.chartWrapper}>
              {selectedSegment && (
                <View style={[styles.selectedSegmentInfo, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.selectedSegmentText, { color: colors.text }]}>
                    {selectedSegment.x}
                  </Text>
                  <Text style={[styles.selectedSegmentText, { color: colors.text }]}>
                    {((selectedSegment.y / total) * 100).toFixed(1)}%
                  </Text>
                  <Text style={[styles.selectedSegmentText, { color: colors.error }]}>
                    {formatCurrency(selectedSegment.y, selectedCurrency)}
                  </Text>
                </View>
              )}
              
              <VictoryPie
                key={`filter-${activeFilter}`}
                data={sortedChartData}
                colorScale={sortedChartData.map(item => item.color)}
                innerRadius={chartType === 'donut' ? 65 : 0}
                radius={120}
                padAngle={sortedChartData.length > 1 ? 1 : 0}
                cornerRadius={4}
                labelComponent={<VictoryLabel text={""} />}
                events={[{
                  target: "data",
                  eventHandlers: {
                    onClick: () => [{
                      target: "data",
                      mutation: (props) => {
                        const segment = sortedChartData[props.index];
                        const isCurrentlySelected = selectedSegment?.x === segment.x;
                        setSelectedSegment(isCurrentlySelected ? null : segment);
                        return null;
                      }
                    }]
                  }
                }]}
                animate={{
                  duration: 800,
                  easing: "cubicInOut",
                  data: { duration: 0 },
                  onLoad: { duration: 0 },
                  onExit: { duration: 0 },
                  onEnter: { duration: 0 },
                  transitionNonData: chartType ? {
                    innerRadius: { 
                      duration: 800, 
                      easing: "cubicInOut",
                      before: () => ({ 
                        scale: 0.95,
                        startAngle: chartType === 'donut' ? 0 : -30,
                        endAngle: chartType === 'donut' ? 360 : 330
                      }),
                      after: () => ({ 
                        scale: 1,
                        startAngle: chartType === 'donut' ? -30 : 0,
                        endAngle: chartType === 'donut' ? 330 : 360
                      })
                    }
                  } : { duration: 0 }
                }}
                startAngle={chartType === 'donut' ? -30 : 0}
                endAngle={chartType === 'donut' ? 330 : 360}
                height={300}
                width={300}
                padding={30}
                style={{
                  parent: { transform: [{ scale: 1 }] },
                  data: {
                    stroke: colors.background,
                    strokeWidth: 2
                  }
                }}
              />
            </View>
            {renderSummary()}
          </>
        ) : renderEmptyState()}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Adjusted padding for new navbar heights
    alignItems: 'center',
    width: '100%',
  },
  title: {
    marginBottom: 16,
    width: '100%',
  },
  chartContainer: {
    padding: 16,
    borderRadius: 8,
  },
  totalAmount: {
    marginBottom: 16,
    textAlign: 'center',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  summaryContainer: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  summaryTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  summaryList: {
    width: '100%',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 180,
    justifyContent: 'flex-end',
  },
  summaryCategory: {
    fontSize: 16,
    marginLeft: 8,
    flex: 1,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '500',
    minWidth: 100,
    textAlign: 'right',
  },
  summaryPercentage: {
    fontSize: 14,
    minWidth: 60,
    textAlign: 'right',
    marginRight: 8,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 260,
    overflow: 'hidden'
  },
  chartTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSegmentInfo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -30 }],
    width: 150,
    padding: 8,
    borderRadius: 8,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  selectedSegmentText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  filterButton: {
    marginLeft: 8,
  },
});
