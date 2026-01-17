import express from 'express';
import { run, get, all } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const wallets = await all(
      'SELECT * FROM wallets WHERE user_id = ?',
      [req.userId]
    );
    res.json(wallets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

router.post('/deposit', async (req, res) => {
  const { amount } = req.body;

  try {
    const wallet = await get(
      'SELECT * FROM wallets WHERE user_id = ? AND currency = ?',
      [req.userId, 'PLN']
    );

    if (wallet) {
      await run(
        'UPDATE wallets SET balance = balance + ? WHERE id = ?',
        [amount, wallet.id]
      );
    } else {
      await run(
        'INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?)',
        [req.userId, 'PLN', amount]
      );
    }

    await run(
      'INSERT INTO transactions (user_id, type, currency_from, currency_to, amount_from, amount_to, exchange_rate) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.userId, 'DEPOSIT', 'PLN', 'PLN', amount, amount, 1]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Deposit failed' });
  }
});

router.post('/exchange', async (req, res) => {
  const { currencyFrom, currencyTo, amount, rate } = req.body;

  try {
    const walletFrom = await get(
      'SELECT * FROM wallets WHERE user_id = ? AND currency = ?',
      [req.userId, currencyFrom]
    );

    if (!walletFrom || walletFrom.balance < amount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    const amountTo = currencyFrom === 'PLN' ? amount / rate : amount * rate;

    await run(
      'UPDATE wallets SET balance = balance - ? WHERE id = ?',
      [amount, walletFrom.id]
    );

    const walletTo = await get(
      'SELECT * FROM wallets WHERE user_id = ? AND currency = ?',
      [req.userId, currencyTo]
    );

    if (walletTo) {
      await run(
        'UPDATE wallets SET balance = balance + ? WHERE id = ?',
        [amountTo, walletTo.id]
      );
    } else {
      await run(
        'INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?)',
        [req.userId, currencyTo, amountTo]
      );
    }

    await run(
      'INSERT INTO transactions (user_id, type, currency_from, currency_to, amount_from, amount_to, exchange_rate) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.userId, 'EXCHANGE', currencyFrom, currencyTo, amount, amountTo, rate]
    );

    res.json({ success: true, amountTo });
  } catch (error) {
    res.status(500).json({ error: 'Exchange failed' });
  }
});

export default router;
