import express from 'express';
import { all } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const transactions = await all(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
