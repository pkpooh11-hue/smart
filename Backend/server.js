import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import 'dotenv/config';
import { initializeDatabase, run, all } from './db.js';

const app = express();
const ORDER_PICKUP_TIMEOUT_MINUTES = 15;
const ORDER_PICKUP_TIMEOUT_MS = ORDER_PICKUP_TIMEOUT_MINUTES * 60 * 1000;

const restoreOrderStock = async (order) => {
  const result = await run(
    "UPDATE orders SET stock_restored = 1 WHERE id = ? AND stock_restored = 0",
    [order.id],
  );
  if (result.changes !== 1) return;

  const items = JSON.parse(order.items);
  for (const item of items) {
    await run('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [
      Number(item.requested_quantity),
      item.id,
    ]);
  }
};

// ตั้งค่าให้รองรับการส่งข้อมูลขนาดใหญ่ (เช่น รูปภาพ)
app.use(cors());
app.use(express.json({ limit: '10mb' })); 

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${passwordHash}`;
};

const verifyPassword = (password, storedHash) => {
  const [salt, passwordHash] = storedHash.split(':');
  const derivedHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(
    Buffer.from(passwordHash, 'hex'),
    Buffer.from(derivedHash, 'hex'),
  );
};

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  fullName: user.full_name,
  email: user.email || "",
  emailVerified: Boolean(user.email_verified),
  profileImage: user.profile_image || "",
});

const sendVerificationEmail = async (email, code) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    throw new Error('ยังไม่ได้ตั้งค่า SMTP สำหรับส่งอีเมล กรุณาตั้งค่าในไฟล์ .env');
  }
  let nodemailer;
  try {
    ({ default: nodemailer } = await import('nodemailer'));
  } catch {
    throw new Error('ยังไม่ได้ติดตั้ง nodemailer กรุณารัน npm.cmd install nodemailer');
  }
  const mailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await mailTransport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'รหัสยืนยันอีเมล Smart Storage',
    text: `รหัสยืนยันอีเมลของคุณคือ ${code}\nรหัสนี้ใช้สำหรับยืนยันบัญชี Smart Storage เท่านั้น`,
    html: `<div style="font-family:Arial,sans-serif"><h2>ยืนยันอีเมล Smart Storage</h2><p>รหัสยืนยันของคุณคือ</p><p style="font-size:30px;font-weight:bold;letter-spacing:8px">${code}</p><p>หากคุณไม่ได้เป็นผู้ขอรหัสนี้ ให้ละเว้นอีเมลฉบับนี้</p></div>`,
  });
};

app.post('/api/auth/register', async (req, res) => {
  const { username, fullName, email, password } = req.body;
  if (!username || !fullName || !email || !password) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
  }
  if (username.trim().length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร และรหัสผ่านอย่างน้อย 6 ตัว' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    return res.status(400).json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' });
  }

  try {
    const existingUsers = await all('SELECT id FROM users WHERE username = ? OR email = ?', [username.trim(), email.trim().toLowerCase()]);
    if (existingUsers[0]) return res.status(409).json({ error: 'ชื่อผู้ใช้หรืออีเมลนี้มีอยู่แล้ว' });
    const verificationCode = String(crypto.randomInt(100000, 1000000));
    const result = await run(
      'INSERT INTO users (username, full_name, email, password_hash, email_verification_code) VALUES (?, ?, ?, ?, ?)',
      [username.trim(), fullName.trim(), email.trim().toLowerCase(), hashPassword(password), verificationCode],
    );
    try {
      await sendVerificationEmail(email.trim().toLowerCase(), verificationCode);
    } catch (mailError) {
      await run('DELETE FROM users WHERE id = ?', [result.lastID]);
      return res.status(503).json({ error: mailError.message });
    }
    res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมล', user: { id: result.lastID, username: username.trim(), fullName: fullName.trim(), email: email.trim().toLowerCase(), emailVerified: false, profileImage: '' } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  try {
    const users = await all('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (!users[0] || !verifyPassword(password, users[0].password_hash)) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    res.json({ user: publicUser(users[0]) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/auth/users/:id/profile', async (req, res) => {
  const { username, fullName, email, profileImage } = req.body;
  if (!username?.trim() || username.trim().length < 3) return res.status(400).json({ error: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร' });
  if (!fullName?.trim()) return res.status(400).json({ error: 'กรุณากรอกชื่อ-นามสกุล' });
  if (email?.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return res.status(400).json({ error: 'กรุณากรอกอีเมลให้ถูกต้อง' });
  if (profileImage && profileImage.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'รูปโปรไฟล์มีขนาดใหญ่เกินไป' });
  try {
    const normalizedEmail = email?.trim().toLowerCase() || '';
    const duplicate = await all('SELECT id, username, email FROM users WHERE (username = ? OR (email != ? AND email = ?)) AND id != ?', [username.trim(), '', normalizedEmail, req.params.id]);
    if (duplicate[0]?.username === username.trim()) return res.status(409).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
    if (duplicate[0]) return res.status(409).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
    const currentUsers = await all('SELECT email FROM users WHERE id = ?', [req.params.id]);
    const emailChanged = currentUsers[0]?.email !== normalizedEmail;
    const verificationCode = emailChanged ? String(crypto.randomInt(100000, 1000000)) : '';
    await run(
      'UPDATE users SET username = ?, full_name = ?, email = ?, email_verified = ?, email_verification_code = ?, profile_image = ? WHERE id = ?',
      [username.trim(), fullName.trim(), normalizedEmail, emailChanged ? 0 : 1, verificationCode, profileImage || '', req.params.id],
    );
    if (emailChanged) {
      try {
        await sendVerificationEmail(email.trim().toLowerCase(), verificationCode);
      } catch (mailError) {
        return res.status(503).json({ error: mailError.message });
      }
    }
    const users = await all('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!users[0]) return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้' });
    res.json({ user: publicUser(users[0]), verificationCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/users/:id/resend-email', async (req, res) => {
  try {
    const users = await all('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!users[0]) return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้' });
    if (users[0].email_verified) return res.status(400).json({ error: 'อีเมลนี้ยืนยันแล้ว' });
    const verificationCode = String(crypto.randomInt(100000, 1000000));
    await run('UPDATE users SET email_verification_code = ? WHERE id = ?', [verificationCode, req.params.id]);
    await sendVerificationEmail(users[0].email, verificationCode);
    res.json({ message: 'ส่งรหัสยืนยันไปที่อีเมลแล้ว' });
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.post('/api/auth/users/:id/verify-email', async (req, res) => {
  const { code } = req.body;
  try {
    const users = await all('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!users[0]) return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้' });
    if (users[0].email_verification_code !== String(code || '').trim()) return res.status(400).json({ error: 'รหัสยืนยันอีเมลไม่ถูกต้อง' });
    await run('UPDATE users SET email_verified = 1, email_verification_code = ? WHERE id = ?', ['', req.params.id]);
    const updatedUsers = await all('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json({ user: publicUser(updatedUsers[0]) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/auth/users/:id/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
  try {
    const users = await all('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!users[0] || !verifyPassword(currentPassword, users[0].password_hash)) return res.status(401).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' });
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(newPassword), req.params.id]);
    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const expirePendingOrders = async () => {
  const expiredOrders = await all(
    `SELECT id, order_no, user, items, created_at
     FROM orders
     WHERE status = 'Pending'`,
  );

  for (const order of expiredOrders) {
    const createdAtValue = order.created_at?.includes("Z")
      ? order.created_at
      : `${order.created_at?.replace(" ", "T")}Z`;
    const createdAt = Date.parse(createdAtValue);
    if (!Number.isFinite(createdAt) || Date.now() - createdAt < ORDER_PICKUP_TIMEOUT_MS) {
      continue;
    }

    const result = await run(
      "UPDATE orders SET status = 'Cancelled' WHERE id = ? AND status = 'Pending'",
      [order.id],
    );
    if (result.changes !== 1) continue;

    await restoreOrderStock(order);

    await run('INSERT INTO logs (user, action) VALUES (?, ?)', [
      order.user,
      `ยกเลิกออเดอร์ ${order.order_no} เนื่องจากเกินเวลา ${ORDER_PICKUP_TIMEOUT_MINUTES} นาที`,
    ]);
  }
};

const restoreCancelledOrderStock = async () => {
  const cancelledOrders = await all(
    "SELECT id, items FROM orders WHERE status = 'Cancelled' AND stock_restored = 0",
  );
  for (const order of cancelledOrders) {
    await restoreOrderStock(order);
  }
};

// ดึงรายการทั้งหมด
app.get('/api/inventory', async (req, res) => {
  try {
    const data = await all("SELECT * FROM inventory ORDER BY id DESC");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// เพิ่มรายการใหม่
app.post('/api/inventory', async (req, res) => {
  const { name, sku, category, shelf, quantity, unit, description, min_qty, image_url, price } = req.body;
  
  if (!name || !category) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ' });
  }

  try {
        const sql = `INSERT INTO inventory (name, sku, category, shelf, quantity, initial_quantity, price, unit, description, min_qty, image_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const result = await run(sql, [
      name, sku, category, shelf || '-', quantity || 0, quantity || 0,
      Number(price) || 0, unit || 'ชิ้น', description || '', (Number(quantity) || 0) * 0.5, image_url || ''
    ]);
    
    res.status(201).json({ id: result.lastID, message: 'บันทึกสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// แก้ไขรายการสินค้า
app.put('/api/inventory/:id', async (req, res) => {
  const { name, sku, category, shelf, quantity, unit, description, min_qty, image_url, price } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ' });
  }

  try {
    await run(`UPDATE inventory
      SET name = ?, sku = ?, category = ?, shelf = ?, quantity = ?, unit = ?,
          description = ?, price = ?, min_qty = initial_quantity * 0.5, image_url = ?
      WHERE id = ?`, [
      name, sku, category, shelf || '-', quantity || 0, unit || 'ชิ้น',
      description || '', Number(price) || 0, image_url || '', req.params.id,
    ]);
    res.json({ message: 'แก้ไขสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// เบิกสินค้าหลายรายการในครั้งเดียว
app.post('/api/inventory/withdraw', async (req, res) => {
  const { items = [], user = 'MONMON', note = '' } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'กรุณาเลือกสินค้าที่ต้องการเบิก' });
  }

  try {
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ error: 'จำนวนสินค้าที่เบิกไม่ถูกต้อง' });
      }

      const rows = await all('SELECT quantity, name FROM inventory WHERE id = ?', [item.id]);
      if (!rows[0]) return res.status(404).json({ error: `ไม่พบสินค้า ID ${item.id}` });
      if (Number(rows[0].quantity) < quantity) {
        return res.status(400).json({ error: `${rows[0].name} มีสินค้าไม่พอ` });
      }

      await run('UPDATE inventory SET quantity = quantity - ? WHERE id = ?', [quantity, item.id]);
    }

    const orderNo = `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const orderItems = await all(`SELECT id, name, sku, quantity, unit, image_url FROM inventory WHERE id IN (${items.map(() => '?').join(',')})`, items.map((item) => item.id));
    const itemsWithRequestedQuantity = orderItems.map((item) => ({ ...item, requested_quantity: items.find((selected) => selected.id === item.id).quantity }));
    await run(
      "INSERT INTO orders (order_no, user, note, items, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
      [orderNo, user, note, JSON.stringify(itemsWithRequestedQuantity)],
    );
    await run('INSERT INTO logs (user, action) VALUES (?, ?)', [user, `เบิกสินค้า ${items.length} รายการ (${orderNo})${note ? `: ${note}` : ''}`]);
    res.json({ message: 'เบิกสินค้าสำเร็จ', orderNo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    await expirePendingOrders();
    const orders = await all('SELECT * FROM orders ORDER BY id DESC');
    res.json(orders.map((order) => ({ ...order, items: JSON.parse(order.items) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  const allowed = ['Pending', 'In-Progress', 'Completed', 'Cancelled'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
  try {
    await expirePendingOrders();
    const orders = await all('SELECT status, items, order_no, user, stock_restored FROM orders WHERE id = ?', [req.params.id]);
    if (!orders[0]) return res.status(404).json({ error: 'ไม่พบออเดอร์' });
    if (orders[0].status === 'Cancelled' && req.body.status !== 'Cancelled') {
      return res.status(400).json({ error: 'ออเดอร์นี้ถูกยกเลิกแล้วเนื่องจากเกินเวลา' });
    }

    if (orders[0].status === 'Pending' && req.body.status === 'Cancelled') {
      await restoreOrderStock({ id: req.params.id, items: orders[0].items });
      await run('INSERT INTO logs (user, action) VALUES (?, ?)', [
        orders[0].user,
        `ยกเลิกออเดอร์ ${orders[0].order_no} และคืนสินค้าเข้าสต็อก`,
      ]);
    }

    await run('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
    res.json({ message: 'อัปเดตสถานะสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ลบรายการ
app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await run("DELETE FROM inventory WHERE id = ?", [req.params.id]);
    res.json({ message: 'ลบสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
initializeDatabase()
  .then(() => {
    restoreCancelledOrderStock()
      .then(() => expirePendingOrders())
      .then(() => {
        setInterval(() => {
          expirePendingOrders().catch((error) => console.error('ตรวจสอบออเดอร์หมดเวลาไม่สำเร็จ:', error));
        }, 60 * 1000);
        app.listen(PORT, '0.0.0.0', () => {
          console.log(`Server running on port ${PORT}`);
        });
      })
      .catch((error) => {
        console.error('ตรวจสอบออเดอร์หมดเวลาเริ่มต้นไม่สำเร็จ:', error);
        process.exit(1);
      });
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });