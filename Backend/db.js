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
    ["student_id", "TEXT DEFAULT ''"],
    ["email", "TEXT DEFAULT ''"],
    ["email_verified", "INTEGER NOT NULL DEFAULT 0"],
    ["email_verification_code", "TEXT DEFAULT ''"],
    ["profile_image", "TEXT DEFAULT ''"],
    ["face_descriptor", "TEXT"],
    ["role", "TEXT NOT NULL DEFAULT 'student'"],
  ];
  for (const [name, definition] of missingUserColumns) {
    if (!userColumns.some((column) => column.name === name)) {
      await run(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
    }
  }
  await run("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id) WHERE student_id != ''");
  await run(`CREATE TABLE IF NOT EXISTS roles (
    role_key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '[]',
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS role_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    actor_user_id INTEGER,
    actor_username TEXT NOT NULL,
    role_key TEXT,
    role_name TEXT NOT NULL,
    target_user_id INTEGER,
    target_username TEXT,
    before_state TEXT,
    after_state TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await run('CREATE INDEX IF NOT EXISTS idx_role_audit_logs_created_at ON role_audit_logs(created_at)');
  const defaultRoles = [
    ['admin', 'ผู้ดูแล', ['dashboard', 'access', 'inventory', 'withdraw', 'orders', 'kiosk', 'room-camera', 'users', 'access-history', 'roles', 'role-audit'], 1],
    ['teacher', 'อาจารย์', ['dashboard', 'access', 'inventory', 'withdraw', 'orders', 'kiosk', 'room-camera'], 1],
    ['student', 'นักเรียน', ['dashboard', 'access', 'inventory', 'withdraw', 'orders', 'kiosk', 'room-camera'], 1],
  ];
  for (const [roleKey, name, permissions, isSystem] of defaultRoles) {
    await run(
      'INSERT OR IGNORE INTO roles (role_key, name, permissions, is_system) VALUES (?, ?, ?, ?)',
      [roleKey, name, JSON.stringify(permissions), isSystem],
    );
  }
  await run('UPDATE roles SET permissions = ? WHERE role_key = ?', [JSON.stringify(defaultRoles[0][2]), 'admin']);
  await run(`CREATE TABLE IF NOT EXISTS auth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  const administrators = await all("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (!administrators.length) {
    await run("UPDATE users SET role = 'admin' WHERE username = 'dev'");
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

  await run(`CREATE TABLE IF NOT EXISTS face_access_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('room_entry', 'room_exit', 'borrow', 'return')),
    order_id INTEGER NOT NULL,
    image_file TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const faceAccessTable = await all("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'face_access_records'");
  if (faceAccessTable[0] && !faceAccessTable[0].sql.includes("'room_exit'")) {
    await run("ALTER TABLE face_access_records RENAME TO face_access_records_previous");
    await run(`CREATE TABLE face_access_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK (event_type IN ('room_entry', 'room_exit', 'borrow', 'return')),
      order_id INTEGER NOT NULL,
      image_file TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await run(`INSERT INTO face_access_records (id, user_id, username, event_type, order_id, image_file, created_at)
      SELECT id, user_id, username, event_type, order_id, image_file, created_at FROM face_access_records_previous`);
    await run("DROP TABLE face_access_records_previous");
  }
  await run("CREATE INDEX IF NOT EXISTS idx_face_access_records_created_at ON face_access_records(created_at)");

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