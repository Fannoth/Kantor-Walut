import  { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
import { transactionService, ratesService, walletService } from '../services/api';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [rates, setRates] = useState([]);
  const [trends, setTrends] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      const [transactionsData, walletsData, ratesData] = await Promise.all([
        transactionService.getTransactions(),
        walletService.getWallets(),
        ratesService.getCurrentRates(),
      ]);

      setTransactions(transactionsData);
      setWallets(walletsData);
      setRates(ratesData);

      const currencies = ['USD', 'EUR', 'GBP', 'CHF'];
      const trendsData = {};

      for (const currency of currencies) {
        try {
          const weeklyData = await ratesService.getWeeklyTrend(currency);
          trendsData[currency] = weeklyData;
        } catch (error) {
          trendsData[currency] = [];
        }
      }

      setTrends(trendsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfitLoss = (currency) => {
    const currencyTransactions = transactions.filter(
      t => t.currency_to === currency && t.type === 'EXCHANGE'
    );

    if (currencyTransactions.length === 0) return null;

    const totalInvested = currencyTransactions.reduce((sum, t) => sum + t.amount_from, 0);
    const totalReceived = currencyTransactions.reduce((sum, t) => sum + t.amount_to, 0);
    const averageBuyRate = totalInvested / totalReceived;

    const currentRate = rates.find(r => r.code === currency)?.mid || 0;
    const currentValue = totalReceived * currentRate;
    const profitLoss = currentValue - totalInvested;
    const profitLossPercent = ((profitLoss / totalInvested) * 100);

    return {
      currency,
      invested: totalInvested,
      received: totalReceived,
      averageBuyRate,
      currentRate,
      currentValue,
      profitLoss,
      profitLossPercent,
    };
  };

  const getTrendDirection = (currency) => {
    const trend = trends[currency];
    if (!trend || trend.length < 2) return 'neutral';

    const latest = trend[trend.length - 1]?.mid || 0;
    const previous = trend[trend.length - 2]?.mid || 0;

    if (latest > previous) return 'up';
    if (latest < previous) return 'down';
    return 'neutral';
  };

  const getTrendIcon = (direction) => {
    switch (direction) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (direction) => {
    switch (direction) {
      case 'up': return '#10b981';
      case 'down': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const renderMiniChart = (currency, data) => {
    if (!data || data.length < 2) {
      return <Text style={styles.noDataText}>Brak danych</Text>;
    }

    const maxRate = Math.max(...data.map(d => d.mid));
    const minRate = Math.min(...data.map(d => d.mid));
    const range = maxRate - minRate;
    const chartWidth = width * 0.3;
    const pointSpacing = chartWidth / Math.max(data.length - 1, 1);

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartArea}>
          {data.map((point, index) => {
            const height = range > 0 ? ((point.mid - minRate) / range) * 40 + 5 : 25;
            const leftPosition = index * pointSpacing;

            return (
              <View
                key={index}
                style={[
                  styles.chartPoint,
                  {
                    left: leftPosition,
                    bottom: height,
                    backgroundColor: getTrendColor(getTrendDirection(currency)),
                  },
                ]}
              />
            );
          })}
        </View>
        <Text style={styles.chartLabel}>
          {data[data.length - 1]?.mid?.toFixed(4)} PLN
        </Text>
      </View>
    );
  };

  const renderProfitLossCard = ({ item }) => {
    const profitData = calculateProfitLoss(item);
    if (!profitData) return null;

    const isProfit = profitData.profitLoss >= 0;

    return (
      <View style={styles.profitCard}>
        <View style={styles.profitHeader}>
          <Text style={styles.profitCurrency}>{profitData.currency}</Text>
          <Text style={[
            styles.profitPercent,
            { color: isProfit ? '#10b981' : '#ef4444' }
          ]}>
            {isProfit ? '+' : ''}{profitData.profitLossPercent.toFixed(2)}%
          </Text>
        </View>

        <View style={styles.profitDetails}>
          <View style={styles.profitRow}>
            <Text style={styles.profitLabel}>Zainwestowano:</Text>
            <Text style={styles.profitValue}>{profitData.invested.toFixed(2)} PLN</Text>
          </View>
          <View style={styles.profitRow}>
            <Text style={styles.profitLabel}>Obecna wartość:</Text>
            <Text style={styles.profitValue}>{profitData.currentValue.toFixed(2)} PLN</Text>
          </View>
          <View style={styles.profitRow}>
            <Text style={styles.profitLabel}>Zysk/Strata:</Text>
            <Text style={[
              styles.profitValue,
              { color: isProfit ? '#10b981' : '#ef4444', fontWeight: 'bold' }
            ]}>
              {isProfit ? '+' : ''}{profitData.profitLoss.toFixed(2)} PLN
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTrendCard = ({ item }) => {
    const trend = trends[item];
    const direction = getTrendDirection(item);
    const currentRate = rates.find(r => r.code === item)?.mid || 0;

    return (
      <View style={styles.trendCard}>
        <View style={styles.trendHeader}>
          <View>
            <Text style={styles.trendCurrency}>{item}</Text>
            <Text style={styles.trendRate}>{currentRate.toFixed(4)} PLN</Text>
          </View>
          <View style={styles.trendIndicator}>
            <Text style={styles.trendIcon}>{getTrendIcon(direction)}</Text>
          </View>
        </View>

        {renderMiniChart(item, trend)}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Ładowanie analiz...</Text>
      </View>
    );
  }

  const exchangeTransactions = transactions.filter(t => t.type === 'EXCHANGE');
  const currenciesWithTransactions = [...new Set(exchangeTransactions.map(t => t.currency_to))];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Analiza portfela</Text>
        <Text style={styles.subtitle}>Twoje zyski i trendy walutowe</Text>
      </View>

      {/* Trendy walut */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Trendy walutowe (7 dni)</Text>
        <FlatList
          data={Object.keys(trends)}
          keyExtractor={(item) => item}
          renderItem={renderTrendCard}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💎 Analiza zysków i strat</Text>
        {currenciesWithTransactions.length > 0 ? (
          <FlatList
            data={currenciesWithTransactions}
            keyExtractor={(item) => item}
            renderItem={renderProfitLossCard}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Brak transakcji wymiany walut.{'\n'}
              Wykonaj pierwszą wymianę, aby zobaczyć analizę zysków.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Statystyki</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{transactions.length}</Text>
            <Text style={styles.statLabel}>Transakcji</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{exchangeTransactions.length}</Text>
            <Text style={styles.statLabel}>Wymian</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{wallets.length}</Text>
            <Text style={styles.statLabel}>Walut</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    margin: 20,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  horizontalList: {
    paddingHorizontal: 4,
  },
  trendCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: width * 0.4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendCurrency: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  trendRate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  trendIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendIcon: {
    fontSize: 16,
  },
  chartContainer: {
    height: 60,
    position: 'relative',
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  chartPoint: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  chartLabel: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  noDataText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
  },
  profitCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  profitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profitCurrency: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  profitPercent: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  profitDetails: {
    gap: 8,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  profitValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
