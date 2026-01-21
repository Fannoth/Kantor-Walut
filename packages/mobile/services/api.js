import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000/api';
    }

    console.log('Constants.manifest:', Constants.manifest);
    console.log('Constants.expoConfig:', Constants.expoConfig);
    console.log('Constants.executionEnvironment:', Constants.executionEnvironment);

    let hostIP = null;

    if (Constants.manifest?.debuggerHost) {
      hostIP = Constants.manifest.debuggerHost.split(':')[0];
      console.log('📍 IP z manifest.debuggerHost:', hostIP);
    }
    if (!hostIP && Constants.expoConfig?.hostUri) {
      hostIP = Constants.expoConfig.hostUri.split(':')[0];
      console.log('📍 IP z expoConfig.hostUri:', hostIP);
    }

    if (!hostIP && Constants.manifest2?.extra?.expoClient?.hostUri) {
      hostIP = Constants.manifest2.extra.expoClient.hostUri.split(':')[0];
      console.log('📍 IP z manifest2.hostUri:', hostIP);
    }

    if (hostIP && hostIP !== 'localhost') {
      return `http://${hostIP}:3000/api`;
    }

    return 'http://localhost:3000/api';
  }
};

const API_URL = getApiUrl();

console.log('🔗 Wykryty API URL:', API_URL);
console.log('📱 Platform:', Platform.OS);
console.log('🔧 Dev mode:', __DEV__);

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, 
});

const checkBackendConnection = async () => {
  try {
    await api.get('/health');
    console.log('Backend połączony pomyślnie');
  } catch (error) {
    console.warn('Nie można połączyć się z backendem:', API_URL);
    console.warn('Sprawdź czy backend jest uruchomiony na porcie 3000');
  }
};

if (__DEV__) {
  checkBackendConnection();
}

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  register: async (email, password, name) => {
    const response = await api.post('/auth/register', { email, password, name });
    await AsyncStorage.setItem('token', response.data.token);
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('token', response.data.token);
    return response.data;
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
  },
};

export const walletService = {
  getWallets: async () => {
    const response = await api.get('/wallet');
    return response.data;
  },

  deposit: async (amount) => {
    const response = await api.post('/wallet/deposit', { amount });
    return response.data;
  },

  exchange: async (currencyFrom, currencyTo, amount, rate) => {
    const response = await api.post('/wallet/exchange', {
      currencyFrom,
      currencyTo,
      amount,
      rate,
    });
    return response.data;
  },
};

export const transactionService = {
  getTransactions: async () => {
    const response = await api.get('/transactions');
    return response.data;
  },
};

export const ratesService = {
  getCurrentRates: async () => {
    const response = await api.get('/rates/current');
    return response.data;
  },

  getHistoricalRates: async (currency, date) => {
    const response = await api.get(`/rates/historical/${currency}/${date}`);
    return response.data;
  },

  getRatesForPeriod: async (currency, startDate, endDate) => {
    const response = await api.get(`/rates/period/${currency}/${startDate}/${endDate}`);
    return response.data;
  },

  getWeeklyTrend: async (currency) => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const response = await api.get(`/rates/period/${currency}/${startDate}/${endDate}`);
    return response.data;
  },
};

export const favoritesService = {
  getFavorites: async () => {
    try {
      const favorites = await AsyncStorage.getItem('favoritePairs');
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      return [];
    }
  },

  addFavorite: async (fromCurrency, toCurrency) => {
    try {
      const favorites = await favoritesService.getFavorites();
      const newFavorite = { from: fromCurrency, to: toCurrency, id: Date.now() };
      const exists = favorites.some(f => f.from === fromCurrency && f.to === toCurrency);
      
      if (!exists) {
        const updated = [...favorites, newFavorite];
        await AsyncStorage.setItem('favoritePairs', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
    }
  },

  removeFavorite: async (fromCurrency, toCurrency) => {
    try {
      const favorites = await favoritesService.getFavorites();
      const updated = favorites.filter(f => !(f.from === fromCurrency && f.to === toCurrency));
      await AsyncStorage.setItem('favoritePairs', JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  },

  isFavorite: async (fromCurrency, toCurrency) => {
    try {
      const favorites = await favoritesService.getFavorites();
      return favorites.some(f => f.from === fromCurrency && f.to === toCurrency);
    } catch (error) {
      return false;
    }
  },
};
