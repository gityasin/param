import React, { useState } from 'react';
import { StyleSheet, View, FlatList, Pressable, Platform } from 'react-native';
import { Text, Surface, FAB, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTransactions } from '../../context/TransactionsContext';
import { formatCurrency } from '../../services/format';
import { useLanguage } from '../../context/LanguageContext';
import { useRouter } from 'expo-router';
import { VictoryLine, VictoryChart, VictoryTheme, VictoryAxis } from 'victory-native';

export default function InvestmentsScreen() {
  const { getInvestments, calculateInvestmentGainLoss, selectedCurrency } = useTransactions();
  const { t } = useLanguage();
  const theme = useTheme();
  const router = useRouter();
  
  // Get all investments
  const investments = getInvestments();
  
  // Calculate total investment value
  const totalInvestmentValue = investments.reduce((sum, investment) => sum + investment.currentValue, 0);
  
  // Calculate total gain/loss
  const totalGainLoss = investments.reduce((sum, investment) => sum + calculateInvestmentGainLoss(investment), 0);
  
  // Dummy chart data - This would be replaced with real data in the future
  const chartData = [
    { x: 1, y: 1000 },
    { x: 2, y: 1200 },
    { x: 3, y: 1100 },
    { x: 4, y: 1400 },
    { x: 5, y: 1300 },
    { x: 6, y: 1500 },
    { x: 7, y: totalInvestmentValue || 2000 },
  ];
  
  const handleAddInvestment = () => {
    router.push({
      pathname: '/add-transaction',
      params: {
        type: 'investment',
      },
    });
  };
  
  const renderInvestmentItem = ({ item }) => {
    const gainLoss = calculateInvestmentGainLoss(item);
    const gainLossPercentage = item.purchasePrice > 0 
      ? (gainLoss / (item.purchasePrice * item.quantity + (item.fees || 0))) * 100 
      : 0;
    
    return (
      <Pressable
        onPress={() => {
          router.push({
            pathname: '/add-transaction',
            params: {
              isEditing: true,
              transaction: JSON.stringify(item),
            },
          });
        }}
        style={({ hovered }) => [
          styles.investmentItem,
          hovered && Platform.OS === 'web' && styles.investmentItemHovered,
          { backgroundColor: theme.colors.surface }
        ]}
      >
        <View style={styles.investmentContent}>
          <View style={styles.investmentHeader}>
            <View style={styles.assetIconContainer}>
              <MaterialCommunityIcons
                name={
                  item.assetType === 'Stock' ? 'chart-line' : 
                  item.assetType === 'Cryptocurrency' ? 'bitcoin' : 
                  item.assetType === 'Bond' ? 'file-document' : 
                  item.assetType === 'Mutual Fund' ? 'chart-box' : 
                  item.assetType === 'ETF' ? 'chart-line-variant' : 
                  item.assetType === 'Real Estate' ? 'home' : 
                  item.assetType === 'Gold' ? 'gold' : 
                  item.assetType === 'Foreign Currency' ? 'currency-usd' : 
                  'finance'
                }
                size={24}
                color={theme.colors.tertiary}
              />
            </View>
            <View style={styles.assetInfo}>
              <Text variant="titleMedium" style={{ color: theme.colors.text }}>
                {item.name || item.symbol || item.description}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.textSecondary }}>
                {item.symbol && `${item.symbol} • `}{item.assetType}
              </Text>
            </View>
          </View>
          
          <View style={styles.investmentDetails}>
            <View style={styles.detailRow}>
              <Text variant="bodySmall" style={{ color: theme.colors.textSecondary }}>
                {t('quantity')}:
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.text }}>
                {item.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text variant="bodySmall" style={{ color: theme.colors.textSecondary }}>
                {t('purchasePrice')}:
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.text }}>
                {formatCurrency(item.purchasePrice, selectedCurrency)}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text variant="bodySmall" style={{ color: theme.colors.textSecondary }}>
                {t('currentValue')}:
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.text }}>
                {formatCurrency(item.currentValue, selectedCurrency)}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text variant="bodySmall" style={{ color: theme.colors.textSecondary }}>
                {t('gainLoss')}:
              </Text>
              <View style={styles.gainLossContainer}>
                <Text
                  variant="bodyMedium"
                  style={{ color: gainLoss >= 0 ? theme.colors.success : theme.colors.error }}
                >
                  {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss, selectedCurrency)}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ 
                    color: gainLoss >= 0 ? theme.colors.success : theme.colors.error,
                    marginLeft: 4 
                  }}
                >
                  ({gainLoss >= 0 ? '+' : ''}{gainLossPercentage.toFixed(2)}%)
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };
  
  const renderEmptyInvestments = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="chart-line"
        size={64}
        color={theme.colors.textSecondary}
        style={{ marginBottom: 16 }}
      />
      <Text
        variant="headlineSmall"
        style={{ color: theme.colors.text, textAlign: 'center', marginBottom: 8 }}
      >
        {t('noTransactions')}
      </Text>
      <Text
        variant="bodyMedium"
        style={{ color: theme.colors.textSecondary, textAlign: 'center' }}
      >
        {t('addFirstTransaction')}
      </Text>
    </View>
  );
  
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
        <Text variant="titleLarge" style={styles.summaryTitle}>{t('portfolio')}</Text>
        
        <View style={styles.chartContainer}>
          {investments.length > 0 ? (
            <VictoryChart
              theme={VictoryTheme.material}
              height={180}
              padding={{ top: 10, bottom: 30, left: 40, right: 10 }}
            >
              <VictoryLine
                style={{
                  data: { stroke: theme.colors.tertiary, strokeWidth: 2 },
                }}
                data={chartData}
                animate={{ duration: 500 }}
              />
              <VictoryAxis
                dependentAxis
                style={{
                  axis: { stroke: 'transparent' },
                  grid: { stroke: 'rgba(0,0,0,0.1)' },
                  tickLabels: { fill: theme.colors.textSecondary, fontSize: 10 }
                }}
              />
              <VictoryAxis
                style={{
                  axis: { stroke: 'transparent' },
                  grid: { stroke: 'transparent' },
                  tickLabels: { fill: 'transparent' }
                }}
              />
            </VictoryChart>
          ) : (
            <View style={styles.emptyChartContainer}>
              <Text variant="bodyMedium" style={{ color: theme.colors.textSecondary }}>
                {t('noTransactions')}
              </Text>
            </View>
          )}
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.totalValueContainer}>
          <View style={styles.totalValue}>
            <Text variant="bodyMedium" style={{ color: theme.colors.textSecondary }}>
              {t('investmentValue')}
            </Text>
            <Text variant="headlineSmall" style={{ color: theme.colors.text }}>
              {formatCurrency(totalInvestmentValue, selectedCurrency)}
            </Text>
          </View>
          
          <View style={styles.totalGainLoss}>
            <Text variant="bodyMedium" style={{ color: theme.colors.textSecondary }}>
              {t('gainLoss')}
            </Text>
            <Text
              variant="headlineSmall"
              style={{ color: totalGainLoss >= 0 ? theme.colors.success : theme.colors.error }}
            >
              {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss, selectedCurrency)}
            </Text>
          </View>
        </View>
      </Surface>
      
      <Text variant="titleLarge" style={styles.sectionTitle}>{t('myInvestments')}</Text>
    </View>
  );
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={investments}
        renderItem={renderInvestmentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyInvestments}
      />
      
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="white"
        onPress={handleAddInvestment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: 16,
  },
  summaryCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    marginBottom: 16,
  },
  chartContainer: {
    height: 180,
    marginBottom: 8,
  },
  emptyChartContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  totalValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalValue: {
    alignItems: 'flex-start',
  },
  totalGainLoss: {
    alignItems: 'flex-end',
  },
  sectionTitle: {
    marginBottom: 16,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  investmentItem: {
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 1, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  investmentItemHovered: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
    transform: [{ translateY: -1 }],
  },
  investmentContent: {
    padding: 16,
  },
  investmentHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  assetIconContainer: {
    marginRight: 16,
    justifyContent: 'center',
  },
  assetInfo: {
    flex: 1,
  },
  investmentDetails: {
    marginLeft: 40,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  gainLossContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 16,
  },
}); 