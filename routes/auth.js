const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { auth, generateToken } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: 'Name, email, password and role are required' });
    if (!['customer', 'cook', 'driver'].includes(role))
      return res.status(400).json({ error: 'Role must be: customer, cook, or driver' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await db.users.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = bcrypt.hashSync(password, 10);
    const user = await db.users.insert({
      name, email, password: hash, role,
      phone: phone || null,
      is_active: true,
      is_approved: role === 'cook' ? false : true,
      created_at: new Date()
    });

    const { password: _, ...safeUser } = user;
    const token = generateToken(safeUser);
    res.status(201).json({
      message: role === 'cook' ? 'Account created! Awaiting admin approval.' : 'Account created!',
      token, user: safeUser
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = await db.users.findOne({ email, is_active: true });
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid email or password' });

    const { password: _, ...safeUser } = user;
    const token = generateToken(safeUser);
    res.json({ message: 'Login successful', token, user: safeUser });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await db.users.findOne({ _id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    await db.users.update({ _id: req.user.id }, { $set: { name, phone, address } });
    res.json({ message: 'Profile updated!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/forgot-password — verify email + phone
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await db.users.findOne({ email, is_active: true });
    if (!user) return res.status(404).json({ error: 'No account found with this email' });

    // Return masked phone for verification hint
    const maskedPhone = user.phone
      ? user.phone.replace(/\d(?=\d{2})/g, '*')
      : null;

    res.json({
      message: 'Account found',
      hasPhone: !!user.phone,
      maskedPhone,
      userId: user._id
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/reset-password — verify phone + set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, phone, newPassword } = req.body;
    if (!email || !phone || !newPassword)
      return res.status(400).json({ error: 'Email, phone and new password required' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = await db.users.findOne({ email, is_active: true });
    if (!user) return res.status(404).json({ error: 'Account not found' });

    // Verify phone matches
    const normalizePhone = (p) => p.replace(/\D/g, '');
    if (!user.phone || normalizePhone(user.phone) !== normalizePhone(phone)) {
      return res.status(401).json({ error: 'Phone number does not match our records' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    await db.users.update({ _id: user._id }, { $set: { password: hash } });

    res.json({ message: 'Password reset successfully! You can now login.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
