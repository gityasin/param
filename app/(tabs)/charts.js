import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { Text, Surface, useTheme, SegmentedButtons } from 'react-native-paper';
import { VictoryPie } from 'victory-native';
import { useTransactions } from '../../context/TransactionsContext';
import { formatCurrency } from '../../services/format';
import { useLanguage } from '../../context/LanguageContext';
import { useCategories } from '../../context/CategoriesContext';

const CHART_TYPES = [
  { value: 'pie', label: 'pieChart' },
  { value: 'donut', label: 'donutChart' },
];

export default function ChartScreen() {
  const { state, selectedCurrency } = useTransactions();
  const theme = useTheme();
  const { colors } = theme;
  const { t } = useLanguage();
  const { getCategoryColor } = useCategories();
  const [chartType, setChartType] = useState('pie');

  // Calculate total expenses and group by category
  const expensesByCategory = state.transactions
    .filter(tx => tx.amount < 0)
    .reduce((acc, tx) => {
      const category = tx.category || 'Other';
      acc[category] = (acc[category] || 0) + Math.abs(tx.amount);
      return acc;
    }, {});

  const sortedChartData = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({
      x: category,
      y: amount,
      originalAmount: amount,
      color: getCategoryColor(category)
    }));

  // Use originalAmount for total and percentage calculations
  const total = sortedChartData.reduce((sum, item) => sum + item.originalAmount, 0);

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

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text variant="headlineMedium" style={[styles.title, { color: colors.text, textAlign: 'center', width: '100%' }]}>
        {t('expenseBreakdown')}
      </Text>
      
      <Surface style={[styles.chartContainer, { backgroundColor: colors.surface, width: '100%' }]} elevation={2}>
        <Text variant="titleLarge" style={[styles.totalAmount, { color: colors.error, textAlign: 'center', width: '100%' }]}>
          {t('totalSpent')}: {formatCurrency(total, selectedCurrency)}
        </Text>

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
              <VictoryPie
                data={sortedChartData}
                colorScale={sortedChartData.map(item => item.color)}
                innerRadius={chartType === 'donut' ? 65 : 0}
                radius={120}
                padAngle={sortedChartData.length > 1 ? 1 : 0}
                cornerRadius={0}
                labels={() => null}
                animate={{
                  duration: 400,
                  easing: "quadInOut",
                  onLoad: { duration: 400 }
                }}
                height={260}
                width={260}
                style={{
                  data: {
                    stroke: colors.background,
                    strokeWidth: 2,
                    fillOpacity: 1
                  },
                }}
              />
            </View>
          </>
        ) : (
          renderEmptyState()
        )}
      </Surface>
      {renderSummary()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
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
});
