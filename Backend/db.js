import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new sqlite3.Database(path.join(__dirname, 'storage.db'));

export const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err); else resolve(this);
    });
  });

export const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });

export const initializeDatabase = async () => {
  await run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT,
    category TEXT,
    shelf TEXT,
    quantity INTEGER DEFAULT 0,
    initial_quantity INTEGER DEFAULT 0,
    price REAL DEFAULT 0,
    unit TEXT DEFAULT 'ชิ้น',
    description TEXT,
    min_qty INTEGER DEFAULT 10,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    action TEXT,
    time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT DEFAULT '',
    email_verified INTEGER NOT NULL DEFAULT 0,
    email_verification_code TEXT DEFAULT '',
    profile_image TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const userColumns = await all("PRAGMA table_info(users)");
  const missingUserColumns = [
    ["email", "TEXT DEFAULT ''"],
    ["email_verified", "INTEGER NOT NULL DEFAULT 0"],
    ["email_verification_code", "TEXT DEFAULT ''"],
    ["profile_image", "TEXT DEFAULT ''"],
    ["face_descriptor", "TEXT"],
  ];
  for (const [name, definition] of missingUserColumns) {
    if (!userColumns.some((column) => column.name === name)) {
      await run(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
    }
  }

  await run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    user TEXT NOT NULL,
    note TEXT DEFAULT '',
    items TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS access_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    order_id INTEGER NOT NULL,
    mode TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  )`);

  const orderColumns = await all("PRAGMA table_info(orders)");
  if (!orderColumns.some((column) => column.name === "stock_restored")) {
    await run("ALTER TABLE orders ADD COLUMN stock_restored INTEGER NOT NULL DEFAULT 0");
  }

  const columns = await all("PRAGMA table_info(inventory)");
  const existingColumns = new Set(columns.map((column) => column.name));
  const missingColumns = [
    ["sku", "TEXT"],
    ["category", "TEXT"],
    ["shelf", "TEXT DEFAULT '-'"],
    ["unit", "TEXT DEFAULT 'ชิ้น'"],
    ["initial_quantity", "INTEGER DEFAULT 0"],
    ["price", "REAL DEFAULT 0"],
    ["description", "TEXT DEFAULT ''"],
    ["min_qty", "INTEGER DEFAULT 10"],
    ["image_url", "TEXT DEFAULT ''"],
    ["created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"],
  ];

  for (const [name, definition] of missingColumns) {
    if (!existingColumns.has(name)) {
      await run(`ALTER TABLE inventory ADD COLUMN ${name} ${definition}`);
    }
  }

  await run("UPDATE inventory SET initial_quantity = quantity WHERE initial_quantity IS NULL OR initial_quantity = 0");
  await run("UPDATE inventory SET min_qty = initial_quantity * 0.5");
};