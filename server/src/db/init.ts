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
`);

// Seed admin user if not exists
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get() as { count: number };
if (adminCount.count === 0) {
  db.prepare('INSERT INTO admin_users (username, password, name) VALUES (?, ?, ?)').run(
    'admin', 'admin123', 'System Administrator'
  );
  console.log('✅ Admin user created (admin / admin123)');
}

// Seed categories if empty
const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
if (catCount.count === 0) {
  const categories = [
    { name: 'Turkmen Traditional', icon: '🍖' },
    { name: 'Plov & Rice', icon: '🍚' },
    { name: 'Kebab & Shashlyk', icon: '🥩' },
    { name: 'Manty & Dumplings', icon: '🥟' },
    { name: 'Lagman & Noodles', icon: '🍜' },
    { name: 'Central Asian', icon: '🌏' },
    { name: 'International', icon: '🌍' },
    { name: 'Cafe & Bakery', icon: '☕' },
    { name: 'Fast Food', icon: '🍔' },
    { name: 'Fine Dining', icon: '🍷' },
    { name: 'Seafood', icon: '🐟' },
    { name: 'Vegetarian', icon: '🥗' },
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

  const restaurants = [
    {
      id: 'ak-altyn-plaza',
      name: 'Ak Altyn Plaza Restaurant',
      description: 'Elegant hotel restaurant offering a blend of international cuisine and traditional Turkmen dishes in a luxurious setting with panoramic city views.',
      heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
      cuisines: ['International', 'Turkmen Traditional'],
      tags: ['Hotel Dining', 'Business', 'City View'],
      dietary: ['Halal'],
      priceTier: '$$$',
      rating: 4.7,
      reviewCount: 312,
      address: 'Ak Altyn Plaza Hotel, Archabil Avenue',
      neighborhood: 'Archabil',
      city: 'Ashgabat',
      lat: 37.9401,
      lng: 58.3896,
      phone: '+993 12 39 00 00',
      website: 'https://akaltyn.tm',
      schedule: [{ days: 'Daily', hours: '07:00 – 23:00' }],
      amenities: ['Private Dining', 'Wi-Fi', 'Valet Parking', 'Live Music'],
      menuHighlights: [
        { name: 'Turkmen Plov', price: '85 TMT', description: 'Traditional rice with lamb and carrots' },
        { name: 'Grilled Sturgeon', price: '120 TMT', description: 'Caspian sturgeon with herb butter' },
        { name: 'Kebab Platter', price: '95 TMT', description: 'Assorted grilled meats with sides' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
        'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800'
      ],
      sustainabilityScore: 78,
      aiSummary: 'Premium hotel dining ideal for business meetings and special occasions.',
      status: 'active'
    },
    {
      id: 'yyldyz-restaurant',
      name: 'Yyldyz Hotel Restaurant',
      description: 'Fine dining experience at the iconic star-shaped Yyldyz Hotel with stunning architecture and exquisite Turkmen hospitality.',
      heroImage: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200',
      cuisines: ['Fine Dining', 'Turkmen Traditional'],
      tags: ['Iconic Venue', 'Fine Dining', 'Architecture'],
      dietary: ['Halal', 'Vegetarian Options'],
      priceTier: '$$$',
      rating: 4.8,
      reviewCount: 245,
      address: 'Yyldyz Hotel, Kopetdag District',
      neighborhood: 'Kopetdag',
      city: 'Ashgabat',
      lat: 37.9156,
      lng: 58.3614,
      phone: '+993 12 48 00 00',
      website: 'https://yyldyz.tm',
      schedule: [{ days: 'Daily', hours: '12:00 – 23:00' }],
      amenities: ['Panoramic Views', 'Private Rooms', 'Full Bar', 'Valet'],
      menuHighlights: [
        { name: 'Lamb Shashlik', price: '75 TMT', description: 'Marinated lamb skewers with saffron rice' },
        { name: 'Sturgeon Caviar', price: '200 TMT', description: 'Caspian caviar with traditional accompaniments' },
        { name: 'Baklava Assortment', price: '45 TMT', description: 'House-made honey pastries' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
        'https://images.unsplash.com/photo-1485182708500-e8f1f318ba72?w=800'
      ],
      sustainabilityScore: 82,
      aiSummary: 'Iconic architectural landmark offering world-class dining experience.',
      status: 'active'
    },
    {
      id: 'nusay-restaurant',
      name: 'Nusay Restaurant',
      description: 'Authentic Turkmen cuisine celebrating the heritage of ancient Nisa, featuring traditional recipes passed down through generations.',
      heroImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200',
      cuisines: ['Turkmen Traditional', 'Central Asian'],
      tags: ['Traditional', 'Family Style', 'Cultural'],
      dietary: ['Halal'],
      priceTier: '$$',
      rating: 4.6,
      reviewCount: 423,
      address: '15 Mahtumkuli Avenue',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9489,
      lng: 58.3850,
      phone: '+993 12 35 42 18',
      website: null,
      schedule: [
        { days: 'Mon–Sat', hours: '11:00 – 22:00' },
        { days: 'Sun', hours: '12:00 – 21:00' }
      ],
      amenities: ['Family Friendly', 'Traditional Decor', 'Outdoor Seating'],
      menuHighlights: [
        { name: 'Chorek Bread', price: '15 TMT', description: 'Fresh-baked traditional bread' },
        { name: 'Dograma', price: '55 TMT', description: 'Traditional meat and bread soup' },
        { name: 'Ichlekli', price: '65 TMT', description: 'Meat-filled pastry with onions' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'
      ],
      sustainabilityScore: 75,
      aiSummary: 'Best choice for authentic Turkmen flavors and cultural dining experience.',
      status: 'active'
    },
    {
      id: 'berkarar-food-court',
      name: 'Berkarar Mall Food Court',
      description: 'Modern food court in Ashgabat\'s premier shopping destination with diverse dining options from fast food to Asian cuisine.',
      heroImage: 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=1200',
      cuisines: ['Fast Food', 'International', 'Central Asian'],
      tags: ['Mall', 'Quick Bites', 'Family'],
      dietary: ['Halal', 'Vegetarian Options'],
      priceTier: '$',
      rating: 4.2,
      reviewCount: 567,
      address: 'Berkarar Shopping Center, Bitarap Turkmenistan Avenue',
      neighborhood: 'Berzengi',
      city: 'Ashgabat',
      lat: 37.9234,
      lng: 58.3567,
      phone: '+993 12 46 00 00',
      website: 'https://berkarar.tm',
      schedule: [{ days: 'Daily', hours: '10:00 – 22:00' }],
      amenities: ['Wi-Fi', 'Kids Play Area', 'Parking', 'AC'],
      menuHighlights: [
        { name: 'Burger Set', price: '35 TMT', description: 'Beef burger with fries and drink' },
        { name: 'Chicken Lagman', price: '45 TMT', description: 'Hand-pulled noodles with chicken' },
        { name: 'Ice Cream Sundae', price: '25 TMT', description: 'Assorted flavors with toppings' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1555992457-b8fefdd09069?w=800',
        'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800'
      ],
      sustainabilityScore: 65,
      aiSummary: 'Convenient option for shopping breaks with variety for all ages.',
      status: 'active'
    },
    {
      id: 'olimpiya-restaurant',
      name: 'Olimpiya Restaurant',
      description: 'Sports-themed restaurant near the Olympic complex, popular with athletes and sports enthusiasts offering high-protein healthy options.',
      heroImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200',
      cuisines: ['International', 'Healthy'],
      tags: ['Sports', 'Healthy', 'Protein-Rich'],
      dietary: ['Halal', 'High Protein'],
      priceTier: '$$',
      rating: 4.4,
      reviewCount: 289,
      address: 'Olympic Village, South Ashgabat',
      neighborhood: 'Olympic District',
      city: 'Ashgabat',
      lat: 37.8967,
      lng: 58.3789,
      phone: '+993 12 49 12 34',
      website: null,
      schedule: [{ days: 'Daily', hours: '08:00 – 22:00' }],
      amenities: ['TV Screens', 'Outdoor Terrace', 'Healthy Menu'],
      menuHighlights: [
        { name: 'Grilled Chicken Salad', price: '55 TMT', description: 'Mixed greens with grilled chicken breast' },
        { name: 'Protein Plov', price: '65 TMT', description: 'Rice with extra lean lamb' },
        { name: 'Fresh Juice', price: '20 TMT', description: 'Seasonal fresh-pressed juice' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800'
      ],
      sustainabilityScore: 72,
      aiSummary: 'Perfect for health-conscious diners and sports fans.',
      status: 'active'
    },
    {
      id: 'ahal-restaurant',
      name: 'Ahal Restaurant',
      description: 'Cozy neighborhood restaurant serving home-style Turkmen cooking with recipes from the Ahal region, known for generous portions.',
      heroImage: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=1200',
      cuisines: ['Turkmen Traditional', 'Home Cooking'],
      tags: ['Local Favorite', 'Generous Portions', 'Home Style'],
      dietary: ['Halal'],
      priceTier: '$',
      rating: 4.5,
      reviewCount: 512,
      address: '28 Andalib Street',
      neighborhood: 'Parahat',
      city: 'Ashgabat',
      lat: 37.9312,
      lng: 58.4123,
      phone: '+993 12 34 56 78',
      website: null,
      schedule: [
        { days: 'Mon–Sat', hours: '10:00 – 21:00' },
        { days: 'Sun', hours: 'Closed' }
      ],
      amenities: ['Family Seating', 'Takeaway', 'Delivery'],
      menuHighlights: [
        { name: 'Manty', price: '40 TMT', description: 'Steamed dumplings with lamb and onion' },
        { name: 'Kovurma', price: '55 TMT', description: 'Fried meat with potatoes' },
        { name: 'Gatyk', price: '15 TMT', description: 'Traditional yogurt drink' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800',
        'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800'
      ],
      sustainabilityScore: 70,
      aiSummary: 'Authentic local experience with excellent value for money.',
      status: 'active'
    },
    {
      id: 'grand-turkmen',
      name: 'Grand Turkmen Restaurant',
      description: 'Grand venue for weddings, celebrations and banquets with capacity for large events and traditional Turkmen entertainment.',
      heroImage: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200',
      cuisines: ['Turkmen Traditional', 'Banquet'],
      tags: ['Events', 'Weddings', 'Large Groups'],
      dietary: ['Halal'],
      priceTier: '$$$',
      rating: 4.3,
      reviewCount: 178,
      address: '45 Turkmenbashi Avenue',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9445,
      lng: 58.3912,
      phone: '+993 12 45 67 89',
      website: 'https://grandturkmen.tm',
      schedule: [{ days: 'Daily', hours: '11:00 – 00:00' }],
      amenities: ['Event Hall', 'Live Music', 'Catering', 'Valet Parking'],
      menuHighlights: [
        { name: 'Banquet Plov', price: '75 TMT', description: 'Celebration-style plov for groups' },
        { name: 'Whole Lamb', price: '800 TMT', description: 'Slow-roasted whole lamb (serves 15)' },
        { name: 'Festive Desserts', price: '35 TMT', description: 'Traditional sweets platter' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800',
        'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800'
      ],
      sustainabilityScore: 68,
      aiSummary: 'Go-to venue for celebrations and group events.',
      status: 'active'
    },
    {
      id: 'paytagt-restaurant',
      name: 'Paytagt Restaurant',
      description: 'Modern restaurant in the heart of the capital offering fusion cuisine that blends Turkmen traditions with contemporary flavors.',
      heroImage: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1200',
      cuisines: ['Fusion', 'International'],
      tags: ['Modern', 'City Center', 'Trendy'],
      dietary: ['Halal', 'Vegetarian Options'],
      priceTier: '$$',
      rating: 4.5,
      reviewCount: 334,
      address: 'Paytagt Tower, Neutrality Avenue',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9501,
      lng: 58.3834,
      phone: '+993 12 42 33 44',
      website: null,
      schedule: [{ days: 'Daily', hours: '10:00 – 23:00' }],
      amenities: ['Rooftop Terrace', 'Wi-Fi', 'Business Lunch'],
      menuHighlights: [
        { name: 'Fusion Kebab', price: '65 TMT', description: 'Modern take on classic kebab with Asian glaze' },
        { name: 'Caesar Salad', price: '45 TMT', description: 'Classic caesar with grilled chicken' },
        { name: 'Tiramisu', price: '35 TMT', description: 'Italian dessert with local twist' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
        'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800'
      ],
      sustainabilityScore: 76,
      aiSummary: 'Perfect for modern diners seeking fusion flavors in a chic setting.',
      status: 'active'
    },
    {
      id: 'jennet-cafe',
      name: 'Jennet Cafe',
      description: 'Charming cafe known for its excellent coffee, fresh pastries, and peaceful garden atmosphere perfect for relaxation.',
      heroImage: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=1200',
      cuisines: ['Cafe & Bakery'],
      tags: ['Coffee', 'Pastries', 'Garden'],
      dietary: ['Vegetarian'],
      priceTier: '$',
      rating: 4.6,
      reviewCount: 456,
      address: '12 Oguzhan Street',
      neighborhood: 'Mir',
      city: 'Ashgabat',
      lat: 37.9378,
      lng: 58.3698,
      phone: '+993 65 12 34 56',
      website: null,
      schedule: [{ days: 'Daily', hours: '08:00 – 21:00' }],
      amenities: ['Garden Seating', 'Wi-Fi', 'Takeaway'],
      menuHighlights: [
        { name: 'Cappuccino', price: '18 TMT', description: 'Italian-style espresso with steamed milk' },
        { name: 'Napoleon Cake', price: '25 TMT', description: 'Layered puff pastry with cream' },
        { name: 'Fresh Croissant', price: '15 TMT', description: 'Butter croissant baked daily' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
        'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800'
      ],
      sustainabilityScore: 74,
      aiSummary: 'Ideal spot for coffee lovers and those seeking a quiet retreat.',
      status: 'active'
    },
    {
      id: 'altyn-asyr-restaurant',
      name: 'Altyn Asyr Restaurant',
      description: 'Traditional Turkmen restaurant named after the golden age, featuring authentic cuisine and live folk music performances.',
      heroImage: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=1200',
      cuisines: ['Turkmen Traditional'],
      tags: ['Live Music', 'Traditional', 'Cultural'],
      dietary: ['Halal'],
      priceTier: '$$',
      rating: 4.4,
      reviewCount: 267,
      address: '78 Ataturk Street',
      neighborhood: 'Howdan',
      city: 'Ashgabat',
      lat: 37.9267,
      lng: 58.3945,
      phone: '+993 12 38 90 12',
      website: null,
      schedule: [
        { days: 'Tue–Sun', hours: '12:00 – 23:00' },
        { days: 'Mon', hours: 'Closed' }
      ],
      amenities: ['Live Music', 'Traditional Decor', 'Private Rooms'],
      menuHighlights: [
        { name: 'Gutap', price: '30 TMT', description: 'Thin pastry filled with meat or pumpkin' },
        { name: 'Tamdyrlama', price: '85 TMT', description: 'Lamb cooked in tandoor oven' },
        { name: 'Green Tea Set', price: '20 TMT', description: 'Traditional tea service with sweets' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
        'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800'
      ],
      sustainabilityScore: 71,
      aiSummary: 'Cultural dining experience with entertainment and authentic flavors.',
      status: 'active'
    },
    {
      id: 'caspian-seafood',
      name: 'Caspian Seafood House',
      description: 'Premium seafood restaurant specializing in fresh Caspian Sea fish and caviar, with elegant maritime-themed decor.',
      heroImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200',
      cuisines: ['Seafood', 'Fine Dining'],
      tags: ['Seafood', 'Caspian', 'Premium'],
      dietary: ['Pescatarian'],
      priceTier: '$$$',
      rating: 4.7,
      reviewCount: 198,
      address: '33 Caspian Boulevard',
      neighborhood: 'Archabil',
      city: 'Ashgabat',
      lat: 37.9356,
      lng: 58.3812,
      phone: '+993 12 44 55 66',
      website: 'https://caspianseafood.tm',
      schedule: [{ days: 'Daily', hours: '12:00 – 23:00' }],
      amenities: ['Wine Cellar', 'Private Dining', 'Waterfall Feature'],
      menuHighlights: [
        { name: 'Beluga Caviar', price: '350 TMT', description: 'Premium Caspian caviar with blinis' },
        { name: 'Grilled Kutum', price: '95 TMT', description: 'Caspian white fish with herbs' },
        { name: 'Seafood Platter', price: '180 TMT', description: 'Selection of fresh catches' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=800',
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'
      ],
      sustainabilityScore: 80,
      aiSummary: 'Premium destination for seafood lovers and special occasions.',
      status: 'active'
    },
    {
      id: 'silk-road-kitchen',
      name: 'Silk Road Kitchen',
      description: 'Journey through Central Asian cuisines celebrating the historic Silk Road trade routes with dishes from across the region.',
      heroImage: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=1200',
      cuisines: ['Central Asian', 'Uzbek'],
      tags: ['Silk Road', 'Regional', 'Historic'],
      dietary: ['Halal'],
      priceTier: '$$',
      rating: 4.5,
      reviewCount: 345,
      address: '56 Garasyzlyk Avenue',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9423,
      lng: 58.3878,
      phone: '+993 12 36 78 90',
      website: null,
      schedule: [{ days: 'Daily', hours: '11:00 – 22:00' }],
      amenities: ['Silk Road Decor', 'Tea House', 'Group Tables'],
      menuHighlights: [
        { name: 'Uzbek Plov', price: '60 TMT', description: 'Samarkand-style rice with lamb' },
        { name: 'Samsa', price: '25 TMT', description: 'Baked pastry triangles with meat' },
        { name: 'Shurpa', price: '40 TMT', description: 'Hearty meat and vegetable soup' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'
      ],
      sustainabilityScore: 73,
      aiSummary: 'Culinary journey through Central Asia in one location.',
      status: 'active'
    },
    {
      id: 'modern-manty-house',
      name: 'Modern Manty House',
      description: 'Contemporary restaurant dedicated to the art of manty with creative fillings and modern presentation techniques.',
      heroImage: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=1200',
      cuisines: ['Manty & Dumplings', 'Modern'],
      tags: ['Specialty', 'Modern', 'Dumplings'],
      dietary: ['Halal', 'Vegetarian Options'],
      priceTier: '$$',
      rating: 4.6,
      reviewCount: 287,
      address: '19 Azadi Street',
      neighborhood: 'Berzengi',
      city: 'Ashgabat',
      lat: 37.9189,
      lng: 58.3534,
      phone: '+993 65 87 65 43',
      website: null,
      schedule: [
        { days: 'Mon–Sat', hours: '11:00 – 21:00' },
        { days: 'Sun', hours: '12:00 – 20:00' }
      ],
      amenities: ['Open Kitchen', 'Cooking Classes', 'Takeaway'],
      menuHighlights: [
        { name: 'Classic Lamb Manty', price: '45 TMT', description: 'Traditional steamed dumplings' },
        { name: 'Pumpkin Manty', price: '35 TMT', description: 'Vegetarian pumpkin filling' },
        { name: 'Truffle Manty', price: '75 TMT', description: 'Premium manty with truffle oil' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800',
        'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800'
      ],
      sustainabilityScore: 77,
      aiSummary: 'Must-visit for dumpling enthusiasts seeking creative interpretations.',
      status: 'active'
    },
    {
      id: 'green-garden-vegetarian',
      name: 'Green Garden Vegetarian',
      description: 'First dedicated vegetarian restaurant in Ashgabat offering creative plant-based versions of Central Asian classics.',
      heroImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200',
      cuisines: ['Vegetarian', 'Healthy'],
      tags: ['Vegetarian', 'Healthy', 'Garden'],
      dietary: ['Vegetarian', 'Vegan Options'],
      priceTier: '$$',
      rating: 4.4,
      reviewCount: 156,
      address: '7 Zelili Street',
      neighborhood: 'Mir',
      city: 'Ashgabat',
      lat: 37.9345,
      lng: 58.3723,
      phone: '+993 65 23 45 67',
      website: null,
      schedule: [{ days: 'Daily', hours: '09:00 – 21:00' }],
      amenities: ['Garden Terrace', 'Organic', 'Smoothie Bar'],
      menuHighlights: [
        { name: 'Veggie Plov', price: '50 TMT', description: 'Rice with seasonal vegetables' },
        { name: 'Mushroom Manty', price: '40 TMT', description: 'Dumplings with wild mushrooms' },
        { name: 'Fresh Smoothie Bowl', price: '35 TMT', description: 'Seasonal fruits with granola' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800',
        'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800'
      ],
      sustainabilityScore: 90,
      aiSummary: 'Pioneer in plant-based dining with creative local interpretations.',
      status: 'active'
    },
    {
      id: 'kebab-master',
      name: 'Kebab Master',
      description: 'Casual eatery specializing in perfectly grilled kebabs with secret family marinades and fresh bread from the tandoor.',
      heroImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200',
      cuisines: ['Kebab & Shashlyk'],
      tags: ['Grilled', 'Casual', 'Quick'],
      dietary: ['Halal'],
      priceTier: '$',
      rating: 4.5,
      reviewCount: 678,
      address: '92 Bitarap Street',
      neighborhood: 'Parahat',
      city: 'Ashgabat',
      lat: 37.9278,
      lng: 58.4056,
      phone: '+993 65 45 67 89',
      website: null,
      schedule: [{ days: 'Daily', hours: '11:00 – 23:00' }],
      amenities: ['Open Grill', 'Outdoor Seating', 'Delivery'],
      menuHighlights: [
        { name: 'Lamb Shashlik', price: '50 TMT', description: 'Marinated lamb skewers' },
        { name: 'Chicken Kebab', price: '40 TMT', description: 'Spiced chicken with vegetables' },
        { name: 'Mixed Grill', price: '70 TMT', description: 'Assortment of grilled meats' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
        'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800'
      ],
      sustainabilityScore: 68,
      aiSummary: 'No-frills spot for the best kebabs in town at great prices.',
      status: 'active'
    },
    {
      id: 'lagman-house',
      name: 'Lagman House',
      description: 'Noodle-focused restaurant with hand-pulled lagman made fresh daily using traditional Uyghur techniques.',
      heroImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1200',
      cuisines: ['Lagman & Noodles', 'Central Asian'],
      tags: ['Noodles', 'Hand-Pulled', 'Fresh'],
      dietary: ['Halal'],
      priceTier: '$',
      rating: 4.6,
      reviewCount: 423,
      address: '34 Garashsyzlyk Street',
      neighborhood: 'Howdan',
      city: 'Ashgabat',
      lat: 37.9234,
      lng: 58.3967,
      phone: '+993 65 98 76 54',
      website: null,
      schedule: [{ days: 'Daily', hours: '10:00 – 21:00' }],
      amenities: ['Open Kitchen', 'Quick Service', 'Takeaway'],
      menuHighlights: [
        { name: 'Classic Lagman', price: '45 TMT', description: 'Hand-pulled noodles with beef' },
        { name: 'Fried Lagman', price: '50 TMT', description: 'Stir-fried noodles with vegetables' },
        { name: 'Spicy Lagman', price: '48 TMT', description: 'Extra chili heat version' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
        'https://images.unsplash.com/photo-1552611052-33e04de081de?w=800'
      ],
      sustainabilityScore: 72,
      aiSummary: 'Authentic noodle experience with mesmerizing hand-pulling display.',
      status: 'active'
    },
    {
      id: 'plov-center',
      name: 'Ashgabat Plov Center',
      description: 'Dedicated to Turkmenistan\'s most beloved dish, serving traditional plov cooked in massive kazan pots over open fire.',
      heroImage: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=1200',
      cuisines: ['Plov & Rice', 'Turkmen Traditional'],
      tags: ['Plov', 'Traditional', 'Open Fire'],
      dietary: ['Halal'],
      priceTier: '$',
      rating: 4.7,
      reviewCount: 534,
      address: '45 Andalib Street',
      neighborhood: 'Parahat',
      city: 'Ashgabat',
      lat: 37.9289,
      lng: 58.4089,
      phone: '+993 65 11 22 33',
      website: null,
      schedule: [{ days: 'Daily', hours: '11:00 – 20:00' }],
      amenities: ['Outdoor Kazan', 'Group Seating', 'Takeaway'],
      menuHighlights: [
        { name: 'Turkmen Plov', price: '55 TMT', description: 'Traditional lamb rice pilaf' },
        { name: 'Chicken Plov', price: '45 TMT', description: 'Lighter version with chicken' },
        { name: 'Wedding Plov', price: '65 TMT', description: 'Special recipe with dried fruits' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'
      ],
      sustainabilityScore: 75,
      aiSummary: 'The definitive spot for authentic plov lovers.',
      status: 'active'
    },
    {
      id: 'international-hotel-buffet',
      name: 'International Hotel Buffet',
      description: 'All-you-can-eat international buffet at a premier hotel with live cooking stations and weekend brunch specials.',
      heroImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200',
      cuisines: ['International', 'Buffet'],
      tags: ['Buffet', 'Hotel', 'All-You-Can-Eat'],
      dietary: ['Halal', 'Vegetarian Options'],
      priceTier: '$$$',
      rating: 4.3,
      reviewCount: 234,
      address: 'International Hotel, Magtymguly Avenue',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9467,
      lng: 58.3856,
      phone: '+993 12 50 00 00',
      website: 'https://internationalhotel.tm',
      schedule: [
        { days: 'Mon–Fri', hours: '06:30 – 10:30, 12:00 – 15:00, 18:00 – 22:00' },
        { days: 'Sat–Sun', hours: '07:00 – 11:00 (Brunch), 18:00 – 22:00' }
      ],
      amenities: ['Live Cooking', 'Dessert Station', 'Kids Corner'],
      menuHighlights: [
        { name: 'Breakfast Buffet', price: '80 TMT', description: 'Full international breakfast' },
        { name: 'Lunch Buffet', price: '100 TMT', description: 'Hot and cold selections' },
        { name: 'Sunday Brunch', price: '150 TMT', description: 'Premium brunch with champagne' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
      ],
      sustainabilityScore: 70,
      aiSummary: 'Best variety under one roof with excellent Sunday brunch.',
      status: 'active'
    },
    {
      id: 'chai-khana',
      name: 'Traditional Chai Khana',
      description: 'Authentic teahouse experience with low seating, traditional tea service, and light Turkmen snacks in serene atmosphere.',
      heroImage: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=1200',
      cuisines: ['Cafe & Bakery', 'Traditional'],
      tags: ['Tea House', 'Traditional', 'Peaceful'],
      dietary: ['Vegetarian'],
      priceTier: '$',
      rating: 4.5,
      reviewCount: 312,
      address: '23 Mollanepes Street',
      neighborhood: 'Howdan',
      city: 'Ashgabat',
      lat: 37.9245,
      lng: 58.3923,
      phone: '+993 65 33 44 55',
      website: null,
      schedule: [{ days: 'Daily', hours: '08:00 – 22:00' }],
      amenities: ['Traditional Seating', 'Hookah', 'Board Games'],
      menuHighlights: [
        { name: 'Green Tea Pot', price: '15 TMT', description: 'Traditional green tea for 4' },
        { name: 'Chorek Set', price: '25 TMT', description: 'Bread with honey and cream' },
        { name: 'Dried Fruits Platter', price: '30 TMT', description: 'Selection of local dried fruits' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
      ],
      sustainabilityScore: 85,
      aiSummary: 'Authentic teahouse for relaxation and cultural immersion.',
      status: 'active'
    },
    {
      id: 'pizza-palace',
      name: 'Pizza Palace Ashgabat',
      description: 'Popular pizza chain adapted for Turkmen tastes with both classic Italian and local fusion pizza options.',
      heroImage: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200',
      cuisines: ['Fast Food', 'Italian'],
      tags: ['Pizza', 'Delivery', 'Family'],
      dietary: ['Vegetarian Options'],
      priceTier: '$',
      rating: 4.2,
      reviewCount: 467,
      address: 'Multiple Locations',
      neighborhood: 'Various',
      city: 'Ashgabat',
      lat: 37.9400,
      lng: 58.3800,
      phone: '+993 12 99 99 99',
      website: 'https://pizzapalace.tm',
      schedule: [{ days: 'Daily', hours: '11:00 – 23:00' }],
      amenities: ['Delivery', 'Wi-Fi', 'Kids Menu', 'Party Room'],
      menuHighlights: [
        { name: 'Margherita', price: '45 TMT', description: 'Classic tomato and mozzarella' },
        { name: 'Turkmen Special', price: '60 TMT', description: 'Lamb kebab and vegetables' },
        { name: 'Cheese Lovers', price: '55 TMT', description: 'Four cheese blend' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'
      ],
      sustainabilityScore: 62,
      aiSummary: 'Reliable pizza option for families and quick meals.',
      status: 'active'
    }
  ];

  restaurants.forEach(r => {
    insertRest.run(
      r.id, r.name, r.description, r.heroImage,
      JSON.stringify(r.cuisines), JSON.stringify(r.tags), JSON.stringify(r.dietary),
      r.priceTier, r.rating, r.reviewCount,
      r.address, r.neighborhood, r.city, r.lat, r.lng,
      r.phone, r.website,
      JSON.stringify(r.schedule), JSON.stringify(r.amenities),
      JSON.stringify(r.menuHighlights), JSON.stringify(r.gallery),
      r.sustainabilityScore, r.aiSummary, r.status
    );
  });
  
  console.log(`✅ ${restaurants.length} Ashgabat restaurants seeded`);
}

console.log('✅ Database initialized');

export default db;
