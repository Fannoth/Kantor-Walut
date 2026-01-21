import  { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { walletService, ratesService, favoritesService } from '../services/api';

export default function ExchangeScreen() {
  const [currencyFrom, setCurrencyFrom] = useState('PLN');
  const [currencyTo, setCurrencyTo] = useState('USD');
  const [amount, setAmount] = useState('');
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [selectedRate, setSelectedRate] = useState(null);
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [wallets, setWallets] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);

  const amountRef = useRef();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ratesData, walletsData, favoritesData] = await Promise.all([
        ratesService.getCurrentRates(),
        walletService.getWallets(),
        favoritesService.getFavorites()
      ]);
      setRates(ratesData);
      setWallets(walletsData);
      setFavorites(favoritesData);
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się pobrać danych');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkFavorite = async () => {
      const favorite = await favoritesService.isFavorite(currencyFrom, currencyTo);
      setIsFavorite(favorite);
    };
    checkFavorite();
  }, [currencyFrom, currencyTo]);

  useEffect(() => {
    if (currencyTo !== 'PLN') {
      const rate = rates.find((r) => r.code === currencyTo);
      setSelectedRate(rate?.mid);
    } else {
      const rate = rates.find((r) => r.code === currencyFrom);
      setSelectedRate(rate?.mid);
    }
  }, [currencyFrom, currencyTo, rates]);

  useEffect(() => {
    if (amount && selectedRate) {
      const inputAmount = parseFloat(amount);
      if (!isNaN(inputAmount)) {
        if (currencyFrom === 'PLN') {
          setConvertedAmount(inputAmount / selectedRate);
        } else if (currencyTo === 'PLN') {
          setConvertedAmount(inputAmount * selectedRate);
        } else {
          const plnAmount = inputAmount * rates.find(r => r.code === currencyFrom)?.mid;
          setConvertedAmount(plnAmount / selectedRate);
        }
      } else {
        setConvertedAmount(0);
      }
    } else {
      setConvertedAmount(0);
    }
  }, [amount, selectedRate, currencyFrom, currencyTo, rates]);

  const getWalletBalance = (currency) => {
    const wallet = wallets.find(w => w.currency === currency);
    return wallet ? parseFloat(wallet.balance) : 0;
  };

  const hasInsufficientFunds = () => {
    const balance = getWalletBalance(currencyFrom);
    return parseFloat(amount) > balance;
  };

  const handleFavoriteToggle = async () => {
    if (isFavorite) {
      await favoritesService.removeFavorite(currencyFrom, currencyTo);
      setIsFavorite(false);
    } else {
      await favoritesService.addFavorite(currencyFrom, currencyTo);
      setIsFavorite(true);
    }
    const updated = await favoritesService.getFavorites();
    setFavorites(updated);
  };

  const handleExchange = async () => {
    const exchangeAmount = parseFloat(amount);
    if (isNaN(exchangeAmount) || exchangeAmount <= 0) {
      Alert.alert('Błąd', 'Podaj prawidłową kwotę');
      return;
    }

    if (hasInsufficientFunds()) {
      Alert.alert('Błąd', 'Niewystarczające środki');
      return;
    }

    if (!selectedRate) {
      Alert.alert('Błąd', 'Nie można pobrać kursu');
      return;
    }

    if (currencyFrom === currencyTo) {
      Alert.alert('Błąd', 'Wybierz różne waluty');
      return;
    }

    setExchangeLoading(true);
    try {
      await walletService.exchange(currencyFrom, currencyTo, exchangeAmount, selectedRate);
      Alert.alert('Sukces', 'Wymiana została zrealizowana', [
        { text: 'OK', onPress: () => {
          setAmount('');
          setConvertedAmount(0);
          loadData();
        }}
      ]);
    } catch (error) {
      Alert.alert('Błąd', error.response?.data?.error || 'Wymiana nie powiodła się');
    } finally {
      setExchangeLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const currencies = ['PLN', ...rates.map((r) => r.code).filter(Boolean)];

  const renderCurrencyOption = (currency, selectedCurrency, onSelect) => (
    <TouchableOpacity
      style={[
        styles.currencyOption,
        selectedCurrency === currency && styles.selectedCurrency
      ]}
      onPress={() => onSelect(currency)}
    >
      <Text style={[
        styles.currencyText,
        selectedCurrency === currency && styles.selectedCurrencyText
      ]}>
        {currency}
      </Text>
      <Text style={styles.balanceText}>
        {getWalletBalance(currency).toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Wymiana walut</Text>
          <View style={styles.headerActions}>
            <Text style={styles.subtitle}>Kupuj i sprzedawaj waluty w czasie rzeczywistym</Text>
            <TouchableOpacity 
              onPress={handleFavoriteToggle} 
              style={styles.favoriteButton}
            >
              <Text style={[styles.favoriteIcon, { color: isFavorite ? '#ef4444' : '#94a3b8' }]}>
                {isFavorite ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {favorites.length > 0 && (
          <View style={styles.favoritesSection}>
            <Text style={styles.sectionTitle}>⚡ Ulubione pary</Text>
            <FlatList
              data={favorites}
              keyExtractor={(item) => `${item.from}-${item.to}-${item.id}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.favoriteCard}
                  onPress={() => {
                    setCurrencyFrom(item.from);
                    setCurrencyTo(item.to);
                  }}
                >
                  <Text style={styles.favoritePair}>
                    {item.from} → {item.to}
                  </Text>
                </TouchableOpacity>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.favoritesContainer}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sprzedajesz</Text>
          <FlatList
            data={currencies}
            keyExtractor={(item) => `from-${item}`}
            renderItem={({ item }) => renderCurrencyOption(item, currencyFrom, setCurrencyFrom)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.currencyContainer}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kupujesz</Text>
          <FlatList
            data={currencies}
            keyExtractor={(item) => `to-${item}`}
            renderItem={({ item }) => renderCurrencyOption(item, currencyTo, setCurrencyTo)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.currencyContainer}
          />
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.sectionTitle}>Kwota do wymiany</Text>
          <View style={[styles.inputContainer, hasInsufficientFunds() && styles.inputError]}>
            <TextInput
              ref={amountRef}
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <Text style={styles.currencyLabel}>{currencyFrom}</Text>
          </View>

          <View style={styles.amountActions}>
            <TouchableOpacity 
              style={styles.maxAmountButton}
              onPress={() => setAmount(getWalletBalance(currencyFrom).toString())}
              disabled={getWalletBalance(currencyFrom) === 0}
            >
              <Text style={styles.maxAmountText}>💰 Wszystkie środki</Text>
              <Text style={styles.maxAmountValue}>
                {getWalletBalance(currencyFrom).toFixed(2)} {currencyFrom}
              </Text>
            </TouchableOpacity>
          </View>

          {hasInsufficientFunds() && amount && (
            <Text style={styles.errorText}>
              Niewystarczające środki. Dostępne: {getWalletBalance(currencyFrom).toFixed(2)} {currencyFrom}
            </Text>
          )}
          <Text style={styles.balanceInfo}>
            Dostępne: {getWalletBalance(currencyFrom).toFixed(2)} {currencyFrom}
          </Text>
        </View>

        {selectedRate && amount && (
          <View style={styles.rateSection}>
            <Text style={styles.rateTitle}>Podgląd wymiany</Text>
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>Kurs wymiany:</Text>
              <Text style={styles.rateValue}>
                1 {currencyFrom === 'PLN' ? currencyTo : currencyFrom} = {selectedRate.toFixed(4)} {currencyFrom === 'PLN' ? 'PLN' : currencyTo}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.conversionRow}>
              <Text style={styles.youPay}>Płacisz: {amount} {currencyFrom}</Text>
              <Text style={styles.youGet}>Otrzymujesz: {convertedAmount.toFixed(2)} {currencyTo}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.exchangeButton,
            (exchangeLoading || !amount || currencyFrom === currencyTo || hasInsufficientFunds()) && styles.buttonDisabled
          ]}
          onPress={handleExchange}
          disabled={exchangeLoading || !amount || currencyFrom === currencyTo || hasInsufficientFunds()}
        >
          {exchangeLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.exchangeButtonText}>Wykonaj wymianę</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContainer: {
    flex: 1,
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
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  favoriteButton: {
    padding: 8,
    marginLeft: 12,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  favoritesSection: {
    margin: 20,
    marginBottom: 10,
  },
  favoritesContainer: {
    paddingHorizontal: 4,
  },
  favoriteCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  favoritePair: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  section: {
    margin: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  currencyContainer: {
    paddingHorizontal: 4,
  },
  currencyOption: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    minWidth: 80,
  },
  selectedCurrency: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  selectedCurrencyText: {
    color: '#3b82f6',
  },
  balanceText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  amountSection: {
    margin: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    paddingVertical: 16,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  amountActions: {
    marginTop: 12,
    marginBottom: 8,
  },
  maxAmountButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  maxAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  maxAmountValue: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  balanceInfo: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 8,
  },
  rateSection: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  rateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  rateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  conversionRow: {
    gap: 8,
  },
  youPay: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  youGet: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  exchangeButton: {
    backgroundColor: '#3b82f6',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  exchangeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
