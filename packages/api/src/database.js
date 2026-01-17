import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./database.sqlite');

const run = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(error) {
      if (error) {
        reject(error);
      } else {
        resolve({
          lastID: this.lastID,
          changes: this.changes
        });
      }
    });
  });
};

const get = promisify(db.get.bind(db));
const all = promisify(db.all.bind(db));

export const initDatabase = async () => {
  console.log('Initializing database...');

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Users table created/verified');

  await run(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      currency TEXT NOT NULL,
      balance REAL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, currency)
    )
  `);
  console.log('Wallets table created/verified');

  await run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      currency_from TEXT NOT NULL,
      currency_to TEXT NOT NULL,
      amount_from REAL NOT NULL,
      amount_to REAL NOT NULL,
      exchange_rate REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('Transactions table created/verified');

  await run(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      currency TEXT NOT NULL,
      rate REAL NOT NULL,
      bid REAL,
      ask REAL,
      date DATE NOT NULL,
      UNIQUE(currency, date)
    )
  `);
  
  try {
    await run(`ALTER TABLE exchange_rates ADD COLUMN bid REAL`);
  } catch (error) {

  }

  try {
    await run(`ALTER TABLE exchange_rates ADD COLUMN ask REAL`);
  } catch (error) {

  }
  console.log('Exchange rates table created/verified');
  console.log('Database initialization complete');
};

export { db, run, get, all };
