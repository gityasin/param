import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, FAB, Surface, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTransactions } from '../../context/TransactionsContext';
import TransactionItem from '../../components/TransactionItem';
import { formatCurrency } from '../../services/format';
import { useLanguage } from '../../context/LanguageContext';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { state, selectedCurrency } = useTransactions();
  const theme = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  // Calculate totals in the selected currency
  const total = state.transactions.reduce((acc, tx) => acc + tx.amount, 0);
  const income = state.transactions
    .filter(tx => tx.amount > 0)
    .reduce((acc, tx) => acc + tx.amount, 0);
  const expenses = state.transactions
    .filter(tx => tx.amount < 0)
    .reduce((acc, tx) => acc + tx.amount, 0);

  const renderHeader = () => (
    <>
      <Surface style={[styles.summaryContainer, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.text }]}>
          {t('myBudget')}
        </Text>
        
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
        data={[...state.transactions].reverse()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem 
            transaction={item}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={styles.listContent}
      />

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
    paddingBottom: 80,
    flexGrow: 1,
    minHeight: '100%',
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
    bottom: 0,
  },
});
