const router = require('express').Router();
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/dishes
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = { is_available: true };
    if (category && category !== 'All') query.category = category;

    let dishes = await db.dishes.find(query).sort({ created_at: -1 });

    if (search) {
      const s = search.toLowerCase();
      dishes = dishes.filter(d =>
        d.name.toLowerCase().includes(s) ||
        d.category.toLowerCase().includes(s)
      );
    }

    // Attach cook name
    const withCook = await Promise.all(dishes.map(async d => {
      const cook = await db.users.findOne({ _id: d.cook_id });
      const reviews = await db.reviews.find({ cook_id: d.cook_id });
      const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
      return { ...d, cook_name: cook?.name || 'Unknown', avg_rating: Math.round(avg * 10) / 10, review_count: reviews.length };
    }));

    res.json(withCook);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dishes/categories
router.get('/categories', async (req, res) => {
  try {
    const dishes = await db.dishes.find({ is_available: true });
    const cats = [...new Set(dishes.map(d => d.category))];
    res.json(['All', ...cats]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dishes/:id
router.get('/:id', async (req, res) => {
  try {
    const dish = await db.dishes.findOne({ _id: req.params.id });
    if (!dish) return res.status(404).json({ error: 'Dish not found' });
    const cook = await db.users.findOne({ _id: dish.cook_id });
    const reviews = await db.reviews.find({ cook_id: dish.cook_id });
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    res.json({ ...dish, cook_name: cook?.name, avg_rating: Math.round(avg * 10) / 10, review_count: reviews.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/dishes
router.post('/', auth, requireRole('cook'), async (req, res) => {
  try {
    const { name, description, price, category, emoji, ingredients, calories, serves, prep_time } = req.body;
    if (!name || !price || !category)
      return res.status(400).json({ error: 'Name, price and category required' });

    const dish = await db.dishes.insert({
      cook_id: req.user.id, name, description: description || '',
      price: parseFloat(price), category, emoji: emoji || '🍲',
      ingredients: Array.isArray(ingredients) ? ingredients : [],
      calories: calories || null, serves: serves || 2,
      prep_time: prep_time || '30 min', is_available: true, created_at: new Date()
    });
    res.status(201).json({ message: 'Dish added!', dish });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/dishes/:id
router.put('/:id', auth, requireRole('cook', 'admin'), async (req, res) => {
  try {
    const dish = await db.dishes.findOne({ _id: req.params.id });
    if (!dish) return res.status(404).json({ error: 'Dish not found' });
    if (dish.cook_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not your dish' });
    await db.dishes.update({ _id: req.params.id }, { $set: req.body });
    res.json({ message: 'Dish updated!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/dishes/:id
router.delete('/:id', auth, requireRole('cook', 'admin'), async (req, res) => {
  try {
    const dish = await db.dishes.findOne({ _id: req.params.id });
    if (!dish) return res.status(404).json({ error: 'Dish not found' });
    if (dish.cook_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not your dish' });
    await db.dishes.remove({ _id: req.params.id });
    res.json({ message: 'Dish deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
