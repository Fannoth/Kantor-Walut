import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import os from 'os';
import { initDatabase } from './database.js';
import { getCurrentRates } from './services/nbpService.js';
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import transactionsRoutes from './routes/transactions.js';
import ratesRoutes from './routes/rates.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/rates', ratesRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const initializeCurrencyRates = async () => {
  try {
    console.log('Inicjalizacja kursów walut...');
    await getCurrentRates(); 
    console.log('Kursy walut zainicjalizowane');
  } catch (error) {
    console.warn('Nie udało się pobrać kursów przy starcie:', error.message);
  }
};

const scheduleDailyRatesUpdate = () => {
  const checkAndUpdate = async () => {
    const now = new Date();
    const hour = now.getHours();

    const dayOfWeek = now.getDay();
    const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;

    if (isWorkday && hour === 12) {
      try {
        console.log('Automatyczne odświeżanie kursów...');
        await getCurrentRates(true);
      } catch (error) {
        console.warn('Automatyczne odświeżenie nie powiodło się:', error.message);
      }
    }
  };

  setInterval(checkAndUpdate, 60 * 60 * 1000);
  console.log('Zaplanowano automatyczne odświeżanie kursów (dni robocze, 12:00)');
};

initDatabase().then(async () => {
  await initializeCurrencyRates();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);

    const networkInterfaces = os.networkInterfaces();

    Object.keys(networkInterfaces).forEach(interfaceName => {
      const addresses = networkInterfaces[interfaceName];
      addresses.forEach(address => {
        if (address.family === 'IPv4' && !address.internal) {
          console.log(`Network: http://${address.address}:${PORT}`);
        }
      });
    });

    scheduleDailyRatesUpdate();
  });
});
