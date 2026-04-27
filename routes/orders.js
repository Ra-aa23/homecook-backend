const router = require('express').Router();
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');

const populateOrder = async (order) => {
  const customer = await db.users.findOne({ _id: order.customer_id });
  const cook     = await db.users.findOne({ _id: order.cook_id });
  const driver   = order.driver_id ? await db.users.findOne({ _id: order.driver_id }) : null;
  return {
    ...order,
    customer_name: customer?.name, customer_phone: customer?.phone,
    cook_name: cook?.name,
    cook_address: cook?.address || "Address not set",
    driver_name: driver?.name, driver_phone: driver?.phone,
  };
};

// POST /api/orders
router.post('/', auth, requireRole('customer'), async (req, res) => {
  try {
    const { items, address, notes, payment_method, promo_code } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'No items in order' });
    if (!address)       return res.status(400).json({ error: 'Delivery address required' });

    // Fetch dishes from DB (never trust client prices)
    const dishes = await Promise.all(items.map(i => db.dishes.findOne({ _id: i.dish_id, is_available: true })));
    if (dishes.some(d => !d)) return res.status(400).json({ error: 'One or more dishes unavailable' });

    const cookIds = [...new Set(dishes.map(d => d.cook_id))];
    if (cookIds.length > 1) return res.status(400).json({ error: 'All items must be from the same chef' });

    let subtotal = 0;
    const orderItems = items.map((item, i) => {
      subtotal += dishes[i].price * item.quantity;
      return { dish_id: item.dish_id, dish_name: dishes[i].name, dish_emoji: dishes[i].emoji, quantity: item.quantity, price: dishes[i].price };
    });

    // Apply promo
    let discount = 0;
    if (promo_code) {
      const promo = await db.promos.findOne({ code: promo_code.toUpperCase(), is_active: true });
      if (promo && promo.uses_left > 0) {
        discount = promo.type === 'percent' ? subtotal * (promo.discount / 100) : promo.discount;
        await db.promos.update({ _id: promo._id }, { $inc: { uses_left: -1 } });
      }
    }

    const delivery_fee = 2.99;
    const tax = subtotal * 0.08;
    const total = Math.round((subtotal - discount + delivery_fee + tax) * 100) / 100;

    const order = await db.orders.insert({
      customer_id: req.user.id, cook_id: cookIds[0], driver_id: null,
      items: orderItems, address, notes: notes || null,
      status: 'pending', total, delivery_fee, tax: Math.round(tax * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      payment_method: payment_method || 'cash',
      promo_code: promo_code || null, created_at: new Date(), updated_at: new Date()
    });

    res.status(201).json({ message: 'Order placed!', order: await populateOrder(order) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orders
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'customer') query = { customer_id: req.user.id };
    else if (req.user.role === 'cook') query = { cook_id: req.user.id };
    else if (req.user.role === 'driver') query = { driver_id: req.user.id };
    // admin gets all

    const orders = await db.orders.find(query).sort({ created_at: -1 });

    // Also include ready orders for drivers
    if (req.user.role === 'driver') {
      const readyOrders = await db.orders.find({ status: 'ready', driver_id: null });
      const all = [...orders, ...readyOrders.filter(r => !orders.find(o => o._id === r._id))];
      return res.json(await Promise.all(all.map(populateOrder)));
    }

    res.json(await Promise.all(orders.map(populateOrder)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orders/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await db.orders.findOne({ _id: req.params.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const allowed = [order.customer_id, order.cook_id, order.driver_id].includes(req.user.id) || req.user.role === 'admin';
    if (!allowed) return res.status(403).json({ error: 'Access denied' });
    res.json(await populateOrder(order));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await db.orders.findOne({ _id: req.params.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const transitions = {
      cook:     { pending: 'accepted', accepted: 'preparing', preparing: 'ready' },
      driver:   { ready: 'delivering', delivering: 'delivered' },
      customer: { pending: 'cancelled' },
      admin:    { pending: 'cancelled', accepted: 'cancelled' }
    };

    const allowed = transitions[req.user.role] || {};
    if (allowed[order.status] !== status)
      return res.status(400).json({ error: `Cannot change "${order.status}" → "${status}" as ${req.user.role}` });

    const updateData = { status, updated_at: new Date() };
    if (status === 'delivering') updateData.driver_id = req.user.id;

    await db.orders.update({ _id: order._id }, { $set: updateData });
    const updated = await db.orders.findOne({ _id: order._id });
    res.json({ message: `Order ${status}!`, order: await populateOrder(updated) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/orders/:id/review
router.post('/:id/review', auth, requireRole('customer'), async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const order = await db.orders.findOne({ _id: req.params.id, customer_id: req.user.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'delivered') return res.status(400).json({ error: 'Can only review delivered orders' });
    const existing = await db.reviews.findOne({ order_id: order._id });
    if (existing) return res.status(409).json({ error: 'Already reviewed' });
    await db.reviews.insert({ order_id: order._id, customer_id: req.user.id, cook_id: order.cook_id, rating, comment: comment || null, created_at: new Date() });
    res.status(201).json({ message: 'Review submitted!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
