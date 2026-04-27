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
    { name: 'Romel Customer', email: 'customer@demo.com', password: hash, role: 'customer', phone: '+1 555-0001', address: '100 Main St, Raleigh, NC',         is_active: true, is_approved: true,  created_at: new Date() },
    { name: 'Chef Fatima B.', email: 'cook@demo.com',     password: hash, role: 'cook',     phone: '+1 555-0002', address: '123 Oak Street, Raleigh, NC',      is_active: true, is_approved: true,  created_at: new Date() },
    { name: 'Karim Driver',   email: 'driver@demo.com',   password: hash, role: 'driver',   phone: '+1 555-0003', address: '200 Driver Ave, Raleigh, NC',      is_active: true, is_approved: true,  created_at: new Date() },
    { name: 'Admin User',     email: 'admin@demo.com',    password: hash, role: 'admin',    phone: '+1 555-0004', address: '999 Admin Blvd, Raleigh, NC',      is_active: true, is_approved: true,  created_at: new Date() },
    { name: 'Chef Ahmed K.',  email: 'ahmed@demo.com',    password: hash, role: 'cook',     phone: '+1 555-0005', address: '456 Pine Ave, Raleigh, NC',        is_active: true, is_approved: true,  created_at: new Date() },
    { name: 'Priya M.',       email: 'priya@demo.com',    password: hash, role: 'cook',     phone: '+1 555-0006', address: '789 Elm Road, Raleigh, NC',        is_active: true, is_approved: true,  created_at: new Date() },
  ]);

  const cookId  = users[1]._id;
  const ahmedId = users[4]._id;
  const priyaId = users[5]._id;

  await db.dishes.insert([
    { cook_id: cookId,  name: 'Moroccan Tagine',  description: 'Slow-cooked lamb with preserved lemons and aromatic ras el hanout.', price: 14.99, category: 'North African', emoji: '🍲', ingredients: ['Lamb','Preserved lemons','Olives','Ras el hanout','Chickpeas'], calories: 450, serves: 2, prep_time: '35 min', is_available: true, created_at: new Date() },
    { cook_id: cookId,  name: 'Chicken Couscous', description: 'Fluffy couscous with tender chicken and seasonal vegetables.',        price: 12.99, category: 'North African', emoji: '🍛', ingredients: ['Chicken','Couscous','Carrots','Zucchini','Herbs'],             calories: 380, serves: 2, prep_time: '25 min', is_available: true, created_at: new Date() },
    { cook_id: cookId,  name: 'Harira Soup',       description: 'Traditional Moroccan tomato and lentil soup with fresh herbs.',       price: 8.99,  category: 'North African', emoji: '🥣', ingredients: ['Tomatoes','Lentils','Chickpeas','Cilantro','Lemon'],           calories: 220, serves: 2, prep_time: '20 min', is_available: true, created_at: new Date() },
    { cook_id: cookId,  name: 'Baklava Box (12)',  description: 'Crispy phyllo with pistachios drizzled with rose water honey.',       price: 9.99,  category: 'Sweets',        emoji: '🍯', ingredients: ['Phyllo','Walnuts','Pistachios','Honey','Rose water'],          calories: 280, serves: 4, prep_time: '10 min', is_available: true, created_at: new Date() },
    { cook_id: priyaId, name: 'Lamb Biryani',      description: 'Fragrant Basmati rice with slow-cooked lamb and saffron.',            price: 16.99, category: 'Indian',        emoji: '🍚', ingredients: ['Basmati rice','Lamb','Saffron','Yogurt','Whole spices'],       calories: 590, serves: 2, prep_time: '45 min', is_available: true, created_at: new Date() },
    { cook_id: priyaId, name: 'Chicken Tikka',     description: 'Tender marinated chicken in creamy tomato sauce.',                    price: 13.99, category: 'Indian',        emoji: '🍗', ingredients: ['Chicken','Tomatoes','Cream','Garam masala','Ginger'],          calories: 420, serves: 2, prep_time: '30 min', is_available: true, created_at: new Date() },
    { cook_id: ahmedId, name: 'Pasta al Forno',    description: 'Oven-baked rigatoni with San Marzano tomatoes and mozzarella.',       price: 13.99, category: 'Italian',       emoji: '🍝', ingredients: ['Rigatoni','San Marzano tomatoes','Mozzarella','Basil'],        calories: 520, serves: 3, prep_time: '30 min', is_available: true, created_at: new Date() },
  ]);

  await db.promos.insert([
    { code: 'HOMECOOKED', discount: 10, type: 'percent', is_active: true, uses_left: 100 },
    { code: 'WELCOME5',   discount: 5,  type: 'fixed',   is_active: true, uses_left: 50  },
  ]);

  console.log('✅ Database seeded!');
  console.log('   📧 customer@demo.com / password123');
  console.log('   📧 cook@demo.com     / password123');
  console.log('   📧 driver@demo.com   / password123');
  console.log('   📧 admin@demo.com    / password123\n');
};

seed();

module.exports = db;