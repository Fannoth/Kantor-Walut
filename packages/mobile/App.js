import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import DepositScreen from './screens/DepositScreen';
import ExchangeScreen from './screens/ExchangeScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import RatesScreen from './screens/RatesScreen';
import HistoricalRatesScreen from './screens/HistoricalRatesScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Logowanie' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Rejestracja' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Kantor', headerBackVisible: false }} />
        <Stack.Screen name="Deposit" component={DepositScreen} options={{ title: 'Zasilenie konta' }} />
        <Stack.Screen name="Exchange" component={ExchangeScreen} options={{ title: 'Wymiana walut' }} />
        <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ title: 'Historia transakcji' }} />
        <Stack.Screen name="Rates" component={RatesScreen} options={{ title: 'Kursy walut' }} />
        <Stack.Screen name="HistoricalRates" component={HistoricalRatesScreen} options={{ title: 'Kursy archiwalne' }} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analiza portfela' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
