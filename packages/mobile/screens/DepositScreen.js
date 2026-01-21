import  { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { walletService } from '../services/api';

export default function DepositScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (text) => {
    const numericValue = text.replace(/[^0-9.,]/g, '').replace(',', '.');

    const parsed = parseFloat(numericValue);
    if (isNaN(parsed)) return numericValue;

    const parts = numericValue.split('.');
    if (parts.length > 1) {
      return `${parts[0]}.${parts[1].slice(0, 2)}`;
    }

    return numericValue;
  };

  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      Alert.alert('Błąd', 'Podaj prawidłową kwotę');
      return;
    }

    if (depositAmount > 100000) {
      Alert.alert('Błąd', 'Maksymalna kwota zasilenia to 100,000 PLN');
      return;
    }

    setLoading(true);
    try {
      await walletService.deposit(depositAmount);
      Alert.alert('Sukces', `Konto zostało zasilone kwotą ${depositAmount.toFixed(2)} PLN`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Błąd', 'Zasilenie nie powiodło się');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [100, 500, 1000, 5000];

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Zasilenie konta</Text>
          <Text style={styles.subtitle}>Dodaj środki do swojego portfela</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Kwota (PLN)</Text>
            <TextInput
              style={[styles.input, !amount.trim() && styles.inputError]}
              placeholder="0.00"
              value={amount}
              onChangeText={(text) => setAmount(formatCurrency(text))}
              keyboardType="decimal-pad"
              returnKeyType="done"
              editable={!loading}
            />
          </View>

          <View style={styles.quickAmountsContainer}>
            <Text style={styles.quickAmountsLabel}>Szybki wybór:</Text>
            <View style={styles.quickAmountsRow}>
              {quickAmounts.map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  style={[
                    styles.quickAmountButton,
                    parseFloat(amount) === quickAmount && styles.quickAmountButtonActive
                  ]}
                  onPress={() => setAmount(quickAmount.toString())}
                  disabled={loading}
                >
                  <Text style={[
                    styles.quickAmountText,
                    parseFloat(amount) === quickAmount && styles.quickAmountTextActive
                  ]}>
                    {quickAmount} zł
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={styles.maxDepositButton}
              onPress={() => setAmount('100000')}
              disabled={loading}
            >
              <Text style={styles.maxDepositText}>💎 Maksymalne zasilenie</Text>
              <Text style={styles.maxDepositValue}>100,000.00 PLN</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, (loading || !amount.trim()) && styles.buttonDisabled]} 
            onPress={handleDeposit}
            disabled={loading || !amount.trim()}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Zasil konto</Text>
                {amount && (
                  <Text style={styles.buttonSubtext}>
                    {parseFloat(amount).toLocaleString('pl-PL', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} PLN
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              💡 Zasilenie konta jest natychmiastowe i bezpłatne
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 20,
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    minHeight: 60,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  quickAmountsContainer: {
    marginBottom: 32,
  },
  quickAmountsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  quickAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  quickAmountButtonActive: {
    backgroundColor: '#3b82f6',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  quickAmountTextActive: {
    color: 'white',
  },
  maxDepositButton: {
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  maxDepositText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  maxDepositValue: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
  },
  buttonContent: {
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSubtext: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
    opacity: 0.9,
  },
  infoContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  infoText: {
    fontSize: 14,
    color: '#0369a1',
    textAlign: 'center',
  },
});
