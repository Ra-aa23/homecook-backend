const router = require('express').Router();
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/users — admin
router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    const users = await db.users.find(query).sort({ created_at: -1 });
    res.json(users.map(({ password: _, ...u }) => u));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/cook/stats
router.get('/cook/stats', auth, requireRole('cook'), async (req, res) => {
  try {
    const cookId = req.user.id;
    const today = new Date(); today.setHours(0,0,0,0);

    const allOrders   = await db.orders.find({ cook_id: cookId, status: 'delivered' });
    const todayOrders = allOrders.filter(o => new Date(o.created_at) >= today);
    const weekAgo     = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekOrders  = allOrders.filter(o => new Date(o.created_at) >= weekAgo);

    const reviews  = await db.reviews.find({ cook_id: cookId });
    const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

    const pending = await db.orders.count({ cook_id: cookId, status: { $in: ['pending','accepted','preparing'] } });

    // Daily earnings last 7 days
    const daily = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const dayOrders = allOrders.filter(o => new Date(o.created_at) >= d && new Date(o.created_at) < next);
      daily.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), amount: Math.round(dayOrders.reduce((s, o) => s + o.total * 0.8, 0) * 100) / 100, orders: dayOrders.length });
    }

    res.json({
      today:  { earnings: Math.round(todayOrders.reduce((s,o) => s + o.total * 0.8, 0) * 100) / 100, orders: todayOrders.length },
      week:   { earnings: Math.round(weekOrders.reduce((s,o)  => s + o.total * 0.8, 0) * 100) / 100 },
      rating: { avg: Math.round(avgRating * 10) / 10, count: reviews.length },
      pending, daily
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/driver/stats
router.get('/driver/stats', auth, requireRole('driver'), async (req, res) => {
  try {
    const driverId = req.user.id;
    const today = new Date(); today.setHours(0,0,0,0);

    const delivered   = await db.orders.find({ driver_id: driverId, status: 'delivered' });
    const todayDel    = delivered.filter(o => new Date(o.created_at) >= today);
    const available   = await db.orders.find({ status: 'ready', driver_id: null });
    const availableWithCook = await Promise.all(available.map(async o => {
    const cook = await db.users.findOne({ _id: o.cook_id });
  return { ...o, cook_name: cook?.name, cook_address: cook?.address || "Address not set" };
}));
    let active = await db.orders.findOne({ driver_id: driverId, status: 'delivering' });
if (active) {
  const cook     = await db.users.findOne({ _id: active.cook_id });
  const customer = await db.users.findOne({ _id: active.customer_id });
  active = {
    ...active,
    cook_name:      cook?.name,
    cook_address:   cook?.address || "Address not set",
    cook_phone:     cook?.phone   || null,
    customer_name:  customer?.name,
    customer_phone: customer?.phone || null,
  };
}
    res.json({
      today: { earnings: Math.round(todayDel.reduce((s,o) => s + o.delivery_fee * 0.85, 0) * 100) / 100, deliveries: todayDel.length },
      available_jobs: availableWithCook,
      active_delivery: active || null
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/admin/stats
router.get('/admin/stats', auth, requireRole('admin'), async (req, res) => {
  try {
    const delivered = await db.orders.find({ status: 'delivered' });
    res.json({
      total_users:   await db.users.count({}),
      total_cooks:   await db.users.count({ role: 'cook', is_approved: true }),
      total_drivers: await db.users.count({ role: 'driver' }),
      total_orders:  await db.orders.count({}),
      total_revenue: Math.round(delivered.reduce((s,o) => s + o.total, 0) * 100) / 100,
      pending_cooks: await db.users.count({ role: 'cook', is_approved: false }),
      active_orders: await db.orders.count({ status: { $nin: ['delivered','cancelled'] } }),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/users/:id/approve
router.patch('/:id/approve', auth, requireRole('admin'), async (req, res) => {
  try {
    const user = await db.users.findOne({ _id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    await db.users.update({ _id: req.params.id }, { $set: { is_approved: true } });
    res.json({ message: `${user.name} approved!` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/users/:id/ban
router.patch('/:id/ban', auth, requireRole('admin'), async (req, res) => {
  try {
    await db.users.update({ _id: req.params.id }, { $set: { is_active: false } });
    res.json({ message: 'User banned' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
