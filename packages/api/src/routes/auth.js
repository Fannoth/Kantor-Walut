import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { run, get } from '../database.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    console.log('Registration attempt:', { email, name });

    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email]);

    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name]
    );

    console.log('User created with ID:', result.lastID);

    await run(
      'INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?)',
      [result.lastID, 'PLN', 0]
    );

    const token = jwt.sign({ userId: result.lastID }, process.env.JWT_SECRET);

    console.log('Registration successful for:', email);
    res.json({ token, userId: result.lastID });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

    res.json({ token, userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
