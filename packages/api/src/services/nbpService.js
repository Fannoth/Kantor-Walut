import fetch from 'node-fetch';
import { run, get, all } from '../database.js';

const NBP_API = 'https://api.nbp.pl/api/exchangerates';

const areTodayRatesInDatabase = async () => {
  const today = new Date().toISOString().split('T')[0];
  const todayRates = await all(
    'SELECT COUNT(*) as count FROM exchange_rates WHERE date = ?',
    [today]
  );
  return todayRates[0].count > 0;
};

const getLatestAvailableDate = async () => {
  try {
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      try {
        const response = await fetch(`${NBP_API}/tables/A/${dateStr}?format=json`);
        if (response.ok) {
          const data = await response.json();
          console.log(`Najnowsze dostępne kursy z: ${dateStr}`);
          return { date: dateStr, rates: data[0].rates };
        }
      } catch (error) {
        continue; 
      }
    }
    
    throw new Error('No recent rates available');
  } catch (error) {
    throw error;
  }
};

const saveRatesToDatabase = async (rates, date = new Date().toISOString().split('T')[0]) => {
  try {
    for (const rate of rates) {
      const existing = await get(
        'SELECT id FROM exchange_rates WHERE currency = ? AND date = ?',
        [rate.code, date]
      );

      if (!existing) {
        await run(
          'INSERT INTO exchange_rates (currency, rate, bid, ask, date) VALUES (?, ?, ?, ?, ?)',
          [rate.code, rate.mid, rate.bid || rate.mid, rate.ask || rate.mid, date]
        );
        console.log(`Zapisano kurs ${rate.code}: ${rate.mid}`);
      }
    }
  } catch (error) {
    console.error('Error saving rates to database:', error);
  }
};

export const getCurrentRates = async (forceRefresh = false) => {
  try {
    if (!forceRefresh) {
      const hasToday = await areTodayRatesInDatabase();
      if (hasToday) {
        console.log('Używam dzisiejszych kursów z cache');
        const cachedRates = await all(
          'SELECT * FROM exchange_rates WHERE date = (SELECT MAX(date) FROM exchange_rates) ORDER BY currency'
        );
        return cachedRates.map(rate => ({
          code: rate.currency,
          currency: rate.currency,
          mid: rate.rate,
          bid: rate.bid,
          ask: rate.ask
        }));
      }
    }

    console.log('Pobieranie nowych kursów z NBP...');

    const { date, rates } = await getLatestAvailableDate();

    await saveRatesToDatabase(rates, date);

    console.log(`Pobrano ${rates.length} kursów z dnia ${date}`);
    return rates;

  } catch (error) {
    console.error('❌ Error fetching current rates:', error);

    try {
      const cachedRates = await all(
        'SELECT * FROM exchange_rates WHERE date = (SELECT MAX(date) FROM exchange_rates) ORDER BY currency'
      );

      if (cachedRates.length > 0) {
        const latestDate = cachedRates[0].date;
        console.log(`Używam najnowszych kursów z cache (${latestDate})`);
        return cachedRates.map(rate => ({
          code: rate.currency,
          currency: rate.currency,
          mid: rate.rate,
          bid: rate.bid,
          ask: rate.ask
        }));
      }
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
    }
    
    throw new Error('Failed to fetch rates from NBP and database');
  }
};

export const getHistoricalRates = async (currency, date) => {
  try {
    const cachedRate = await get(
      'SELECT * FROM exchange_rates WHERE currency = ? AND date = ?',
      [currency, date]
    );

    if (cachedRate) {
      console.log(`Pobrano kurs ${currency} z cache`);
      return {
        mid: cachedRate.rate,
        effectiveDate: cachedRate.date
      };
    }

    const response = await fetch(`${NBP_API}/rates/A/${currency}/${date}?format=json`);
    const data = await response.json();
    const rateData = data.rates[0];

    await saveRatesToDatabase([{
      code: currency,
      mid: rateData.mid,
      bid: rateData.mid,
      ask: rateData.mid
    }], date);

    return rateData;
  } catch (error) {
    console.error('Error fetching historical rates:', error);
    throw new Error('Failed to fetch historical rates');
  }
};

export const getRatesForPeriod = async (currency, startDate, endDate) => {
  try {
    const cachedRates = await all(
      'SELECT * FROM exchange_rates WHERE currency = ? AND date BETWEEN ? AND ? ORDER BY date',
      [currency, startDate, endDate]
    );

    if (cachedRates && cachedRates.length > 0) {
      console.log(`📋 Pobrano ${cachedRates.length} kursów ${currency} z cache`);
      return cachedRates.map(rate => ({
        mid: rate.rate,
        effectiveDate: rate.date
      }));
    }

    const response = await fetch(`${NBP_API}/rates/A/${currency}/${startDate}/${endDate}?format=json`);
    const data = await response.json();
    const rates = data.rates;

    for (const rate of rates) {
      await saveRatesToDatabase([{
        code: currency,
        mid: rate.mid,
        bid: rate.mid,
        ask: rate.mid
      }], rate.effectiveDate);
    }

    return rates;
  } catch (error) {
    console.error('Error fetching rates for period:', error);
    throw new Error('Failed to fetch rates for period');
  }
};
