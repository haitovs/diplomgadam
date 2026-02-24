import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Categories table
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    name_tm TEXT,
    icon TEXT,
    count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Restaurants table
  CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    hero_image TEXT,
    cuisines TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    dietary TEXT DEFAULT '[]',
    price_tier TEXT DEFAULT '$$',
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    address TEXT,
    neighborhood TEXT,
    city TEXT DEFAULT 'Ashgabat',
    lat REAL,
    lng REAL,
    phone TEXT,
    website TEXT,
    schedule TEXT DEFAULT '[]',
    amenities TEXT DEFAULT '[]',
    menu_highlights TEXT DEFAULT '[]',
    gallery TEXT DEFAULT '[]',
    sustainability_score INTEGER DEFAULT 70,
    ai_summary TEXT,
    status TEXT DEFAULT 'active',
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Admin users table
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);
  CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
  CREATE INDEX IF NOT EXISTS idx_restaurants_neighborhood ON restaurants(neighborhood);

  -- Menu items table
  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    currency TEXT DEFAULT 'TMT',
    category TEXT,
    image_url TEXT,
    is_available BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
`);

// Seed admin user if not exists
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get() as { count: number };
if (adminCount.count === 0) {
  db.prepare('INSERT INTO admin_users (username, password, name) VALUES (?, ?, ?)').run(
    'admin', 'admin123', 'System Administrator'
  );
  console.log('✅ Admin user created (admin / admin123)');
}

import fs from 'fs';

// Seed categories if empty
const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
if (catCount.count === 0) {
  const categories = [
    { name: 'Turkmen Traditional', icon: '🍖' },
    { name: 'Plov & Rice', icon: '🍚' },
    { name: 'Turkish', icon: '🥙' },
    { name: 'International', icon: '🌍' },
    { name: 'Steakhouse', icon: '🥩' },
    { name: 'Seafood', icon: '🐟' },
    { name: 'Italian', icon: '🍝' },
    { name: 'European', icon: '🍷' },
    { name: 'Coffee & Cafe', icon: '☕' },
    { name: 'Bakery', icon: '🥐' },
    { name: 'Asian Fusion', icon: '🍱' },
    { name: 'Grill', icon: '🔥' },
    { name: 'Fine Dining', icon: '🥂' },
    { name: 'Royal Cuisine', icon: '👑' },
    { name: 'Turkmen Modern', icon: '✨' }
  ];

  const insertCat = db.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)');
  categories.forEach(c => insertCat.run(c.name, c.icon));
  console.log('✅ Categories seeded');
}

// Seed restaurants if empty
const restCount = db.prepare('SELECT COUNT(*) as count FROM restaurants').get() as { count: number };
if (restCount.count === 0) {
  console.log('📝 Seeding Ashgabat restaurants...');

  const insertRest = db.prepare(`
    INSERT INTO restaurants (id, name, description, hero_image, cuisines, tags, dietary, price_tier, rating, review_count, address, neighborhood, city, lat, lng, phone, website, schedule, amenities, menu_highlights, gallery, sustainability_score, ai_summary, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const dataPath = join(__dirname, '../../../data/restaurants.json');
  const restaurantsJson = fs.readFileSync(dataPath, 'utf-8');
  const restaurants = JSON.parse(restaurantsJson);

  restaurants.forEach((r: any) => {
    insertRest.run(
      r.id, r.name, r.description, r.heroImage,
      JSON.stringify(r.cuisines), JSON.stringify(r.tags), JSON.stringify(r.dietary),
      r.priceTier, r.rating, r.reviewCount,
      r.location.address, r.location.neighborhood, r.location.city, r.location.coordinates.lat, r.location.coordinates.lng,
      r.contact.phone, r.contact.website,
      JSON.stringify(r.schedule), JSON.stringify(r.amenities),
      JSON.stringify(r.menuHighlights), JSON.stringify(r.gallery),
      r.sustainabilityScore, r.aiSummary, r.status || 'active'
    );
  });
  console.log('✅ Restaurants seeded');
}

console.log('🚀 Database initialized successfully');

export default db;
