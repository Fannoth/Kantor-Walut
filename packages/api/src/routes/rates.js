import express from 'express';
import { getCurrentRates, getHistoricalRates, getRatesForPeriod } from '../services/nbpService.js';
import { authMiddleware } from '../middleware/auth.js';
import { all } from '../database.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/current', async (req, res) => {
  try {
    const rates = await getCurrentRates();
    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current rates' });
  }
});

router.get('/database-status', async (_, res) => {
  try {
    const ratesCount = await all('SELECT COUNT(*) as count FROM exchange_rates');
    const latestRates = await all('SELECT * FROM exchange_rates ORDER BY date DESC LIMIT 10');

    res.json({
      totalRates: ratesCount[0].count,
      latestRates: latestRates,
      message: 'Database status check'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check database status' });
  }
});

router.get('/historical/:currency/:date', async (req, res) => {
  try {
    const { currency, date } = req.params;
    const rate = await getHistoricalRates(currency, date);
    res.json(rate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch historical rate' });
  }
});

router.get('/period/:currency/:startDate/:endDate', async (req, res) => {
  try {
    const { currency, startDate, endDate } = req.params;
    const rates = await getRatesForPeriod(currency, startDate, endDate);
    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rates for period' });
  }
});

// Endpoint do ręcznego odświeżania kursów
router.post('/refresh', async (req, res) => {
  try {
    console.log('🔄 Ręczne odświeżanie kursów...');
    const rates = await getCurrentRates(true); // Wymuś odświeżenie
    res.json({
      message: 'Kursy zostały odświeżone',
      count: rates.length,
      rates: rates
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh rates' });
  }
});

export default router;
