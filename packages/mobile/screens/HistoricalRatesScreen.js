import  { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ratesService } from '../services/api';

export default function HistoricalRatesScreen() {
  const [currency, setCurrency] = useState('USD');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rates, setRates] = useState([]);

  const endDateRef = useRef();

  const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CZK'];

  const formatDate = (text) => {
    const numbers = text.replace(/\D/g, '');

    if (numbers.length <= 4) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    } else {
      return `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 8)}`;
    }
  };

  const validateDate = (dateString) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  };

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Błąd', 'Podaj obie daty w formacie RRRR-MM-DD');
      return;
    }

    if (!validateDate(startDate) || !validateDate(endDate)) {
      Alert.alert('Błąd', 'Podaj prawidłowe daty w formacie RRRR-MM-DD');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      Alert.alert('Błąd', 'Data początkowa musi być wcześniejsza niż końcowa');
      return;
    }

    try {
      const data = await ratesService.getRatesForPeriod(currency, startDate, endDate);
      setRates(data);
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się pobrać danych');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Historia kursów walut</Text>
          <Text style={styles.subtitle}>Przeglądaj kursy z wybranego okresu</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Parametry wyszukiwania</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Waluta</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={currency} onValueChange={setCurrency}>
                {currencies.map((c) => (
                  <Picker.Item key={c} label={c} value={c} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data początkowa</Text>
            <TextInput
              style={[styles.input, !validateDate(startDate) && startDate && styles.inputError]}
              placeholder="2024-01-01"
              value={startDate}
              onChangeText={(text) => setStartDate(formatDate(text))}
              maxLength={10}
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => endDateRef.current?.focus()}
            />
            <Text style={styles.helperText}>Format: RRRR-MM-DD</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data końcowa</Text>
            <TextInput
              ref={endDateRef}
              style={[styles.input, !validateDate(endDate) && endDate && styles.inputError]}
              placeholder="2024-01-31"
              value={endDate}
              onChangeText={(text) => setEndDate(formatDate(text))}
              maxLength={10}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <Text style={styles.helperText}>Format: RRRR-MM-DD</Text>
          </View>

          <TouchableOpacity 
            style={[
              styles.searchButton, 
              (!startDate || !endDate || !validateDate(startDate) || !validateDate(endDate)) && styles.buttonDisabled
            ]} 
            onPress={handleSearch}
            disabled={!startDate || !endDate || !validateDate(startDate) || !validateDate(endDate)}
          >
            <Text style={styles.searchButtonText}>Wyszukaj kursy</Text>
          </TouchableOpacity>
        </View>

        {rates.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Wyniki wyszukiwania ({rates.length})</Text>
            <FlatList
              data={rates}
              keyExtractor={(item, index) => String(index)}
              renderItem={({ item }) => (
                <View style={styles.rateCard}>
                  <View style={styles.rateHeader}>
                    <Text style={styles.dateText}>{item.effectiveDate || ''}</Text>
                    <Text style={styles.currencyCode}>{currency}</Text>
                  </View>
                  <Text style={styles.rateValue}>
                    {Number(item.mid || 0).toFixed(4)} PLN
                  </Text>
                </View>
              )}
              scrollEnabled={false}
            />
          </View>
        )}

        {rates.length === 0 && startDate && endDate && validateDate(startDate) && validateDate(endDate) && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Brak danych dla wybranego okresu</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  formSection: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  input: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    fontSize: 16,
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginLeft: 4,
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
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
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsSection: {
    margin: 20,
    marginTop: 0,
  },
  rateCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  currencyCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rateValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});
