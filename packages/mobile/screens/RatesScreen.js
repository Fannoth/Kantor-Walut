import  { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ratesService } from '../services/api';

export default function RatesScreen({ navigation }) {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      const data = await ratesService.getCurrentRates();
      setRates(data);
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
      <TouchableOpacity
        style={styles.historicalButton}
        onPress={() => navigation.navigate('HistoricalRates')}
      >
        <Text style={styles.historicalButtonText}>Zobacz kursy archiwalne</Text>
      </TouchableOpacity>

      <FlatList
        data={rates}
        keyExtractor={(item) => String(item.code)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.code}>{item.code || ''}</Text>
              <Text style={styles.currency}>{item.currency || ''}</Text>
            </View>
            <Text style={styles.rate}>{Number(item.mid || 0).toFixed(4)} PLN</Text>
          </View>
        )}
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
  historicalButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    margin: 20,
    borderRadius: 8,
  },
  historicalButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  code: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  currency: {
    fontSize: 14,
    color: '#666',
  },
  rate: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
