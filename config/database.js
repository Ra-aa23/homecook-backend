const Datastore = require('nedb-promises');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = {
  users:   Datastore.create({ filename: path.join(__dirname, '../data/users.db'),   autoload: true }),
  dishes:  Datastore.create({ filename: path.join(__dirname, '../data/dishes.db'),  autoload: true }),
  orders:  Datastore.create({ filename: path.join(__dirname, '../data/orders.db'),  autoload: true }),
  reviews: Datastore.create({ filename: path.join(__dirname, '../data/reviews.db'), autoload: true }),
  promos:  Datastore.create({ filename: path.join(__dirname, '../data/promos.db'),  autoload: true }),
};

const seed = async () => {
  const existing = await db.users.findOne({});
  if (existing) return;

  console.log('🌱 Seeding database...');
  const hash = bcrypt.hashSync('password123', 10);

  const users = await db.users.insert([
    { name: 'Demo Customer',  email: 'customer@demo.com', password: hash, role: 'customer', phone: '+1 555-0001', address: '100 Main St, Raleigh, NC',         is_active: true, is_approved: true,  created_at: new Date() },
    { name: 'Chef Fatima B.', email: 'cook@demo.com',     password: hash, role: 'cook',     phone: '+1 555-0002', address: '123 Oak Street, Raleigh, NC',      is_active: true, is_approved: true,  created_at: new Date() },
    { name: 'Demo Driver',    email: 'driver@demo.com',   password: hash, role: 'driver',   phone: '+1 555-0003', address: '200 Driver Ave, Raleigh, NC',      is_active: true, is_approved: true,  created_at: new Date() },
    { name: 'Admin',          email: 'admin@demo.com',    password: hash, role: 'admin',    phone: '+1 555-0004', address: '999 Admin Blvd, Raleigh, NC',      is_active: true, is_approved: true,  created_at: new Date() },
    { name: 'Chef Ahmed K.',  email: 'ahmed@demo.com',    password: hash, role: 'cook',     phone: '+1 555-0005', address: '456 Pine Ave, Raleigh, NC',        is_active: true, is_approved: true,  created_at: new Date() },
  ]);

  const cookId  = users[1]._id;
  const ahmedId = users[4]._id;

  // 🇲🇦 Moroccan food only
  await db.dishes.insert([
    { cook_id: cookId,  name: 'Moroccan Tagine',    description: 'Slow-cooked lamb with preserved lemons, olives and aromatic ras el hanout.', price: 14.99, category: 'Moroccan', emoji: '🍲', ingredients: ['Lamb','Preserved lemons','Olives','Ras el hanout','Chickpeas'], calories: 450, serves: 2, prep_time: '35 min', is_available: true, created_at: new Date() },
    { cook_id: cookId,  name: 'Chicken Couscous',   description: 'Fluffy semolina couscous with tender chicken and seasonal vegetables.',       price: 12.99, category: 'Moroccan', emoji: '🍛', ingredients: ['Chicken','Couscous','Carrots','Zucchini','Herbs'],             calories: 380, serves: 2, prep_time: '25 min', is_available: true, created_at: new Date() },
    { cook_id: cookId,  name: 'Harira Soup',         description: 'Traditional Moroccan tomato and lentil soup with fresh herbs and spices.',    price: 8.99,  category: 'Moroccan', emoji: '🥣', ingredients: ['Tomatoes','Lentils','Chickpeas','Cilantro','Lemon'],           calories: 220, serves: 2, prep_time: '20 min', is_available: true, created_at: new Date() },
    { cook_id: cookId,  name: 'Baklava Box (12)',    description: 'Crispy phyllo layers with pistachios drizzled with rose water honey.',        price: 9.99,  category: 'Moroccan', emoji: '🍯', ingredients: ['Phyllo','Walnuts','Pistachios','Honey','Rose water'],          calories: 280, serves: 4, prep_time: '10 min', is_available: true, created_at: new Date() },
    { cook_id: cookId,  name: 'Zaalouk',             description: 'Smoky roasted eggplant and tomato salad with cumin and garlic.',             price: 7.99,  category: 'Moroccan', emoji: '🍆', ingredients: ['Eggplant','Tomatoes','Cumin','Garlic','Olive oil'],            calories: 180, serves: 2, prep_time: '20 min', is_available: true, created_at: new Date() },
    { cook_id: cookId,  name: 'Bastilla',            description: 'Traditional flaky pastry filled with spiced pigeon and almonds.',            price: 16.99, category: 'Moroccan', emoji: '🥧', ingredients: ['Pastry','Pigeon','Almonds','Cinnamon','Saffron'],              calories: 520, serves: 2, prep_time: '50 min', is_available: true, created_at: new Date() },
    { cook_id: ahmedId, name: 'Mechoui',             description: 'Slow-roasted whole lamb marinated with cumin, coriander and butter.',        price: 18.99, category: 'Moroccan', emoji: '🍖', ingredients: ['Lamb','Cumin','Coriander','Butter','Garlic'],                 calories: 620, serves: 3, prep_time: '60 min', is_available: true, created_at: new Date() },
    { cook_id: ahmedId, name: 'Moroccan Mint Tea',   description: 'Fresh mint green tea with sugar — the symbol of Moroccan hospitality.',      price: 3.99,  category: 'Moroccan', emoji: '🍵', ingredients: ['Green tea','Fresh mint','Sugar','Water'],                     calories: 45,  serves: 2, prep_time: '10 min', is_available: true, created_at: new Date() },
    { cook_id: ahmedId, name: 'Kefta Brochettes',   description: 'Grilled minced beef skewers seasoned with Moroccan spices.',                  price: 13.99, category: 'Moroccan', emoji: '🍢', ingredients: ['Beef','Onion','Parsley','Cumin','Paprika'],                   calories: 380, serves: 2, prep_time: '25 min', is_available: true, created_at: new Date() },
    { cook_id: ahmedId, name: 'Msemen',              description: 'Traditional Moroccan square flatbread, crispy outside and soft inside.',      price: 5.99,  category: 'Moroccan', emoji: '🫓', ingredients: ['Flour','Semolina','Butter','Salt','Water'],                   calories: 320, serves: 2, prep_time: '30 min', is_available: true, created_at: new Date() },
  ]);

  await db.promos.insert([
    { code: 'HOMECOOKED', discount: 10, type: 'percent', is_active: true, uses_left: 100 },
    { code: 'WELCOME5',   discount: 5,  type: 'fixed',   is_active: true, uses_left: 50  },
    { code: 'MOROCCO',    discount: 15, type: 'percent', is_active: true, uses_left: 30  },
  ]);

  console.log('✅ Database seeded with 🇲🇦 Moroccan food!');
  console.log('   📧 customer@demo.com / password123');
  console.log('   📧 cook@demo.com     / password123');
  console.log('   📧 driver@demo.com   / password123');
  console.log('   📧 admin@demo.com    / password123\n');
};

seed();
module.exports = db;
