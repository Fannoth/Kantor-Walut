import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  ScrollView,
  Alert
} from 'react-native';
import { walletService, authService, ratesService } from '../services/api';

export default function HomeScreen({ navigation }) {
  const [wallets, setWallets] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState('PLN');
  const [rates, setRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);

  const loadWallets = async () => {
    try {
      const data = await walletService.getWallets();
      setWallets(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadRates = async () => {
    if (loadingRates) return;
    setLoadingRates(true);
    try {
      const data = await ratesService.getCurrentRates();
      setRates(data);
    } catch (error) {
      console.error('Error loading rates:', error);
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    loadWallets();
    loadRates();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadWallets();
      loadRates();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadWallets(), loadRates()]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await authService.logout();
    navigation.replace('Login');
  };

  const convertToDisplayCurrency = (amount, fromCurrency) => {
    if (fromCurrency === displayCurrency) {
      return amount;
    }

    if (fromCurrency === 'PLN' && displayCurrency !== 'PLN') {
      const rate = rates.find(r => r.code === displayCurrency);
      return rate ? amount / rate.mid : amount;
    }

    if (fromCurrency !== 'PLN' && displayCurrency === 'PLN') {
      const rate = rates.find(r => r.code === fromCurrency);
      return rate ? amount * rate.mid : amount;
    }

    if (fromCurrency !== 'PLN' && displayCurrency !== 'PLN') {
      const fromRate = rates.find(r => r.code === fromCurrency);
      const toRate = rates.find(r => r.code === displayCurrency);
      if (fromRate && toRate) {
        const plnAmount = amount * fromRate.mid;
        return plnAmount / toRate.mid;
      }
    }

    return amount;
  };

  const getTotalBalance = () => {
    return wallets.reduce((total, wallet) => {
      const convertedAmount = convertToDisplayCurrency(wallet.balance, wallet.currency);
      return total + convertedAmount;
    }, 0);
  };

  const availableCurrencies = ['PLN', ...rates.map(r => r.code).filter(Boolean)];

  const renderCurrencyOption = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.currencyOption,
        displayCurrency === item && styles.selectedCurrencyOption
      ]}
      onPress={() => setDisplayCurrency(item)}
    >
      <Text style={[
        styles.currencyOptionText,
        displayCurrency === item && styles.selectedCurrencyOptionText
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const menuItems = [
    {
      id: 1,
      title: 'Zasilenie konta',
      subtitle: 'Dodaj środki',
      icon: '💰',
      color: '#10b981',
      screen: 'Deposit'
    },
    {
      id: 2,
      title: 'Wymiana walut',
      subtitle: 'Kupuj i sprzedawaj',
      icon: '💱',
      color: '#3b82f6',
      screen: 'Exchange'
    },
    {
      id: 3,
      title: 'Kursy walut',
      subtitle: 'Aktualne notowania',
      icon: '�',
      color: '#10b981',
      screen: 'Rates'
    },
    {
      id: 4,
      title: 'Historia transakcji',
      subtitle: 'Przegląd operacji',
      icon: '📋',
      color: '#f59e0b',
      screen: 'Transactions'
    },
    {
      id: 5,
      title: 'Analiza portfela',
      subtitle: 'Zyski i wykresy',
      icon: '📊',
      color: '#8b5cf6',
      screen: 'Analytics'
    }
  ];

  const renderWallet = ({ item }) => {
    const convertedBalance = convertToDisplayCurrency(item.balance, item.currency);
    const isOriginalCurrency = item.currency === displayCurrency;
    
    return (
      <View style={styles.walletCard}>
        <Text style={styles.currency}>{item.currency || ''}</Text>
        <Text style={[styles.balance, item.currency === 'PLN' && styles.balancePrimary]}>
          {Number(item.balance || 0).toFixed(2)}
        </Text>
        <Text style={styles.walletLabel}>
          {item.currency === 'PLN' ? 'Złoty polski' : `Saldo ${item.currency}`}
        </Text>
        {!isOriginalCurrency && (
          <Text style={styles.convertedBalance}>
            ≈ {convertedBalance.toFixed(2)} {displayCurrency}
          </Text>
        )}
      </View>
    );
  };

  const renderMenuItem = ({ item }) => (
    <TouchableOpacity
      style={styles.menuCard}
      onPress={() => navigation.navigate(item.screen)}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
      </View>
      <View style={styles.arrowContainer}>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Witaj w</Text>
          <Text style={styles.title}>Kantor Walut</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Wyloguj</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>Całkowite saldo</Text>
        <Text style={styles.totalBalance}>
          {getTotalBalance().toFixed(2)} {displayCurrency}
        </Text>
      </View>

      <View style={styles.currencySelector}>
        <Text style={styles.currencySelectorLabel}>Waluta wyświetlania:</Text>
        <FlatList
          data={availableCurrencies}
          keyExtractor={(item) => `currency-${item}`}
          renderItem={renderCurrencyOption}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.currencyOptionsContainer}
        />
      </View>

      {wallets.length > 0 ? (
        <View style={styles.walletsSection}>
          <Text style={styles.sectionTitle}>Twoje portfele</Text>
          <FlatList
            data={wallets}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderWallet}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.walletsContainer}
          />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Rozpocznij od zasilenia konta</Text>
        </View>
      )}

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Szybkie akcje</Text>
        <FlatList
          data={menuItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMenuItem}
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  greeting: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '400',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 4,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceSection: {
    backgroundColor: '#1e293b',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  totalBalance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  currencySelector: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  currencySelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  currencyOptionsContainer: {
    paddingHorizontal: 4,
  },
  currencyOption: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCurrencyOption: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  currencyOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  selectedCurrencyOptionText: {
    color: '#3b82f6',
  },
  walletsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  walletsContainer: {
    paddingHorizontal: 20,
  },
  walletCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  currency: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  balance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  balancePrimary: {
    color: '#10b981',
  },
  walletLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  convertedBalance: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 4,
    fontWeight: '500',
  },
  menuSection: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  icon: {
    fontSize: 24,
    color: '#fff',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '400',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});
