import  { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { transactionService } from '../services/api';

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await transactionService.getTransactions();
      setTransactions(data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.type}>{item.type || ''}</Text>
            <Text style={styles.details}>
              {item.currency_from || ''} → {item.currency_to || ''}
            </Text>
            <Text style={styles.amount}>
              {Number(item.amount_from || 0).toFixed(2)} → {Number(item.amount_to || 0).toFixed(2)}
            </Text>
            <Text style={styles.date}>
              {new Date(item.created_at || Date.now()).toLocaleString('pl-PL')}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Brak transakcji</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
  },
  type: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  details: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  amount: {
    fontSize: 14,
    marginBottom: 5,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#666',
  },
});
