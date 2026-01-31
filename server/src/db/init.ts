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
      id: 'ayak-ui',
      name: 'Ayak-Ui',
      description: 'Authentic Turkmen cuisine experience, serving traditional favorites like Palaw, Ichlekli, and Dograma in a warm, welcoming atmosphere.',
      heroImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200',
      cuisines: ['Turkmen Traditional'],
      tags: ['Local Favorite', 'Traditional', 'Family Style'],
      dietary: ['Halal'],
      priceTier: '$$',
      rating: 4.6,
      reviewCount: 150,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9500, // Approximate
      lng: 58.3833, // Approximate
      phone: '+993 12 12 34 56',
      website: null,
      schedule: [{ days: 'Daily', hours: '10:00 – 22:00' }],
      amenities: ['Family Seating', 'Takeaway'],
      menuHighlights: [
        { name: 'Palaw', price: '45 TMT', description: 'Traditional Turkmen pilaf with lamb' },
        { name: 'Ichlekli', price: '55 TMT', description: 'Meat pie baked in tamdyr' },
        { name: 'Dograma', price: '40 TMT', description: 'Traditional soup with bread and meat' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800'
      ],
      sustainabilityScore: 75,
      aiSummary: 'A must-visit for anyone seeking true Turkmen hospitality and flavors.',
      status: 'active'
    },
    {
      id: 'dyyahan',
      name: 'Dýýahan',
      description: 'A culinary gem known for its wide array of traditional Turkmen dishes including Gutap, Manty, and Kebabs, alongside delightful desserts like Baklava.',
      heroImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200',
      cuisines: ['Turkmen Traditional', 'Kebab & Shashlyk'],
      tags: ['Desserts', 'Traditional', 'Casual'],
      dietary: ['Halal'],
      priceTier: '$$',
      rating: 4.5,
      reviewCount: 210,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9400, // Approximate
      lng: 58.3900, // Approximate
      phone: '+993 12 23 45 67',
      website: null,
      schedule: [{ days: 'Daily', hours: '09:00 – 23:00' }],
      amenities: ['Outdoor Seating', 'Wi-Fi'],
      menuHighlights: [
        { name: 'Gutap', price: '25 TMT', description: 'Stuffed flatbread with spinach or pumpkin' },
        { name: 'Manty', price: '35 TMT', description: 'Steamed dumplings with meat' },
        { name: 'Baklava', price: '40 TMT', description: 'Sweet pastry dessert' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'
      ],
      sustainabilityScore: 70,
      aiSummary: 'Famous for its diverse menu of savory classics and sweet treats.',
      status: 'active'
    },
    {
      id: 'dayhan-pizzeria',
      name: 'Daýhan Pizzeria',
      description: 'Popular spot for Italian cuisine lovers, offering a variety of pizzas, pastas, and fresh salads in a relaxed setting.',
      heroImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200',
      cuisines: ['International'],
      tags: ['Pizza', 'Italian', 'Casual'],
      dietary: ['Vegetarian Options'],
      priceTier: '$$',
      rating: 4.3,
      reviewCount: 320,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9450, // Approximate
      lng: 58.3750, // Approximate
      phone: '+993 12 34 56 78',
      website: null,
      schedule: [{ days: 'Daily', hours: '11:00 – 23:00' }],
      amenities: ['Takeaway', 'Delivery'],
      menuHighlights: [
        { name: 'Margherita Pizza', price: '60 TMT', description: 'Classic tomato and cheese pizza' },
        { name: 'Pasta Carbonara', price: '70 TMT', description: 'Creamy pasta with bacon' },
        { name: 'Caesar Salad', price: '50 TMT', description: 'Fresh salad with grilled chicken' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800'
      ],
      sustainabilityScore: 65,
      aiSummary: 'Go-to place for reliable Italian comfort food in Ashgabat.',
      status: 'active'
    },
    {
      id: 'cinar-restaurant',
      name: 'Çinar Restaurant',
      description: 'Showcasing the rich flavors of Turkish cuisine with dishes like Lahmacun, Pide, and an assortment of grilled Kebabs.',
      heroImage: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200',
      cuisines: ['International', 'Kebab & Shashlyk'],
      tags: ['Turkish', 'Grill', 'Lunch'],
      dietary: ['Halal'],
      priceTier: '$$',
      rating: 4.4,
      reviewCount: 180,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9350, // Approximate
      lng: 58.3850, // Approximate
      phone: '+993 12 45 67 89',
      website: null,
      schedule: [{ days: 'Daily', hours: '10:00 – 22:00' }],
      amenities: ['Outdoor Seating', 'Good for Groups'],
      menuHighlights: [
        { name: 'Lahmacun', price: '30 TMT', description: 'Turkish flatbread with minced meat' },
        { name: 'Adana Kebab', price: '65 TMT', description: 'Spicy minced meat kebab' },
        { name: 'Pide', price: '45 TMT', description: 'Turkish style pizza boat' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800'
      ],
      sustainabilityScore: 72,
      aiSummary: 'Authentic Turkish flavors and grilled specialties.',
      status: 'active'
    },
    {
      id: 'gorogly-cafe',
      name: 'Görogly Café',
      description: 'A cozy café offering a selection of vegetarian and vegan options, perfect for health-conscious diners.',
      heroImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200',
      cuisines: ['Cafe & Bakery', 'Vegetarian'],
      tags: ['Vegetarian', 'Vegan Friendly', 'Healthy'],
      dietary: ['Vegetarian', 'Vegan Options'],
      priceTier: '$$',
      rating: 4.2,
      reviewCount: 95,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9420, // Approximate
      lng: 58.3780, // Approximate
      phone: '+993 12 56 78 90',
      website: null,
      schedule: [{ days: 'Daily', hours: '08:00 – 20:00' }],
      amenities: ['Wi-Fi', 'Quiet Atmosphere'],
      menuHighlights: [
        { name: 'Veggie Wrap', price: '35 TMT', description: 'Fresh vegetables in a tortilla' },
        { name: 'Green Salad', price: '40 TMT', description: 'Mixed greens with vinaigrette' },
        { name: 'Fruit Smoothie', price: '25 TMT', description: 'Blend of seasonal fruits' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800'
      ],
      sustainabilityScore: 85,
      aiSummary: 'A great choice for light, healthy, and plant-based meals.',
      status: 'active'
    },
    {
      id: 'kopetdag-restaurant',
      name: 'Kopetdag Restaurant',
      description: 'Offering a mix of Local, Central Asian, European, and Continental cuisines.',
      heroImage: 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=1200',
      cuisines: ['Central Asian', 'International', 'European'],
      tags: ['Diverse Menu', 'Continental', 'Formal'],
      dietary: ['Halal'],
      priceTier: '$$$',
      rating: 4.5,
      reviewCount: 230,
      address: '10 Magtymguly Ave., Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9380, // Approximate
      lng: 58.3950, // Approximate
      phone: '+993 12 90 12 34',
      website: null,
      schedule: [{ days: 'Daily', hours: '11:00 – 23:00' }],
      amenities: ['Private Rooms', 'Live Music'],
      menuHighlights: [
        { name: 'Beef Stroganoff', price: '85 TMT', description: 'Creamy beef stew with mushrooms' },
        { name: 'Shashlyk Assortment', price: '95 TMT', description: 'Mixed grilled meats' },
        { name: 'Greek Salad', price: '55 TMT', description: 'Classic salad with feta cheese' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
      ],
      sustainabilityScore: 75,
      aiSummary: 'Elegant dining with a broad international menu.',
      status: 'active'
    },
    {
      id: 'joshgun-palow-house',
      name: 'Joshgun Palow House',
      description: 'Specializing in traditional Turkmen cuisine, particularly Palaw (pilaf) with over 20 varieties including Ishlekli.',
      heroImage: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=1200',
      cuisines: ['Plov & Rice', 'Turkmen Traditional'],
      tags: ['Specialty', 'Rice', 'Traditional'],
      dietary: ['Halal'],
      priceTier: '$$',
      rating: 4.8,
      reviewCount: 400,
      address: 'Ylham Seyilgahi, Ashgabat',
      neighborhood: 'Ylham Park',
      city: 'Ashgabat',
      lat: 37.9320, // Approximate
      lng: 58.3880, // Approximate
      phone: '+993 12 88 99 00',
      website: null,
      schedule: [{ days: 'Daily', hours: '10:00 – 22:00' }],
      amenities: ['Quick Service', 'Takeaway'],
      menuHighlights: [
        { name: 'Traditional Palow', price: '50 TMT', description: 'Classic lamb pilaf' },
        { name: 'Wedding Palow', price: '60 TMT', description: 'Festive pilaf with dried fruits' },
        { name: 'Ishlekli', price: '55 TMT', description: 'Meat pie' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'
      ],
      sustainabilityScore: 78,
      aiSummary: 'The ultimate destination for Pilaf lovers in Ashgabat.',
      status: 'active'
    },
    {
      id: 'soltan-restaurant',
      name: 'Soltan Restaurant',
      description: 'Featuring Local, Georgian, Central Asian, and European cuisines for a diverse dining experience.',
      heroImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200',
      cuisines: ['Central Asian', 'International'],
      tags: ['Georgian', 'Diverse', 'Family'],
      dietary: ['Halal'],
      priceTier: '$$$',
      rating: 4.6,
      reviewCount: 280,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9480, // Approximate
      lng: 58.3920, // Approximate
      phone: '+993 12 77 88 99',
      website: null,
      schedule: [{ days: 'Daily', hours: '11:00 – 23:00' }],
      amenities: ['Private Dining', 'Wi-Fi'],
      menuHighlights: [
        { name: 'Khachapuri', price: '50 TMT', description: 'Georgian cheese bread' },
        { name: 'Khinkali', price: '40 TMT', description: 'Georgian meat dumplings' },
        { name: 'Grilled Lamb Chops', price: '90 TMT', description: 'Tender lamb chops' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'
      ],
      sustainabilityScore: 74,
      aiSummary: 'Offers a rich tapestry of flavors from Georgian to European dishes.',
      status: 'active'
    },
    {
      id: 'centralpark',
      name: 'CentralPark',
      description: 'A luxurious restaurant located on the 5th and 6th floors of Altyn Asyr Shopping Centre, offering a diverse menu.',
      heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
      cuisines: ['Fine Dining', 'International'],
      tags: ['Luxury', 'View', 'Shopping Center'],
      dietary: ['Halal'],
      priceTier: '$$$$',
      rating: 4.7,
      reviewCount: 150,
      address: 'Altyn Asyr Shopping Centre, 5th & 6th Floors, Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9455, // Approximate
      lng: 58.3855, // Approximate
      phone: '+993 12 11 22 33',
      website: null,
      schedule: [{ days: 'Daily', hours: '12:00 – 00:00' }],
      amenities: ['Panoramic View', 'Full Bar', 'VIP Rooms'],
      menuHighlights: [
        { name: 'Ribeye Steak', price: '180 TMT', description: 'Premium cut steak' },
        { name: 'Seafood Pasta', price: '120 TMT', description: 'Pasta with mixed seafood' },
        { name: 'Cheesecake', price: '45 TMT', description: 'New York style cheesecake' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
      ],
      sustainabilityScore: 76,
      aiSummary: 'Top-tier dining with breathtaking views of the city.',
      status: 'active'
    },
    {
      id: 'merdem-restaurant',
      name: 'Merdem Restaurant',
      description: 'Known for traditional Turkmen cuisine, especially its Turkmen Plov.',
      heroImage: 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=1200',
      cuisines: ['Turkmen Traditional'],
      tags: ['Plov', 'Traditional', 'Authentic'],
      dietary: ['Halal'],
      priceTier: '$$',
      rating: 4.5,
      reviewCount: 190,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9300, // Approximate
      lng: 58.4000, // Approximate
      phone: '+993 12 55 44 33',
      website: null,
      schedule: [{ days: 'Daily', hours: '10:00 – 22:00' }],
      amenities: ['Outdoor Seating', 'Family Friendly'],
      menuHighlights: [
        { name: 'Turkmen Plov', price: '50 TMT', description: 'Signature rice dish' },
        { name: 'Manty', price: '40 TMT', description: 'Steamed dumplings' },
        { name: 'Fitchi', price: '30 TMT', description: 'Deep dish meat pie' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800'
      ],
      sustainabilityScore: 72,
      aiSummary: 'A reliable spot for authentic Turkmen comfort food.',
      status: 'active'
    },
    {
      id: 'hezzet-restaurant',
      name: 'Hezzet Restaurant',
      description: 'Serving a blend of Turkmen and Turkish food.',
      heroImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200',
      cuisines: ['Turkmen Traditional', 'Kebab & Shashlyk'],
      tags: ['Turkish', 'Local', 'Grill'],
      dietary: ['Halal'],
      priceTier: '$$',
      rating: 4.4,
      reviewCount: 160,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9360, // Approximate
      lng: 58.3960, // Approximate
      phone: '+993 12 66 77 88',
      website: null,
      schedule: [{ days: 'Daily', hours: '10:00 – 22:00' }],
      amenities: ['Takeaway', 'Delivery'],
      menuHighlights: [
        { name: 'Mixed Grill', price: '85 TMT', description: 'Assorted grilled meats' },
        { name: 'Lentil Soup', price: '25 TMT', description: 'Traditional Turkish soup' },
        { name: 'Doner Kebab', price: '45 TMT', description: 'Rotisserie meat sandwich' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800'
      ],
      sustainabilityScore: 70,
      aiSummary: 'Great fusion of Turkmen and Turkish culinary traditions.',
      status: 'active'
    },
    {
      id: 'alpet-steakhouse',
      name: 'AlpEt Steakhouse',
      description: 'A premier destination for steak lovers in Ashgabat.',
      heroImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200',
      cuisines: ['Fine Dining', 'International'],
      tags: ['Steakhouse', 'Meat', 'Butcher'],
      dietary: ['Halal'],
      priceTier: '$$$',
      rating: 4.6,
      reviewCount: 140,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9430, // Approximate
      lng: 58.3820, // Approximate
      phone: '+993 12 99 88 77',
      website: null,
      schedule: [{ days: 'Daily', hours: '12:00 – 23:00' }],
      amenities: ['Full Bar', 'Private Rooms'],
      menuHighlights: [
        { name: 'T-Bone Steak', price: '220 TMT', description: 'Dry-aged T-bone steak' },
        { name: 'Filet Mignon', price: '250 TMT', description: 'Tender beef fillet' },
        { name: 'Grilled Asparagus', price: '45 TMT', description: 'Seasonal side dish' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'
      ],
      sustainabilityScore: 68,
      aiSummary: 'The place to go for high-quality steaks and meat dishes.',
      status: 'active'
    },
    {
      id: 'berk-garden-pub',
      name: 'Berk Garden Pub',
      description: 'Offering Turkmen cuisine and local brews in a garden setting.',
      heroImage: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=1200',
      cuisines: ['Cafe & Bakery', 'Turkmen Traditional'],
      tags: ['Pub', 'Garden', 'Casual'],
      dietary: ['Halal'],
      priceTier: '$$',
      rating: 4.3,
      reviewCount: 200,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9330, // Approximate
      lng: 58.3730, // Approximate
      phone: '+993 12 11 00 11',
      website: null,
      schedule: [{ days: 'Daily', hours: '11:00 – 00:00' }],
      amenities: ['Outdoor Garden', 'Live Music', 'Bar'],
      menuHighlights: [
        { name: 'Beer Snacks', price: '35 TMT', description: 'Assorted fried snacks' },
        { name: 'Grilled Sausages', price: '50 TMT', description: 'House-made sausages' },
        { name: 'Chicken Wings', price: '45 TMT', description: 'Spicy buffalo wings' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800'
      ],
      sustainabilityScore: 73,
      aiSummary: 'Relaxed atmosphere with good food and drinks, perfect for socializing.',
      status: 'active'
    },
    {
      id: 'chatma-restaurant-lounge',
      name: 'Chatma Restaurant & Lounge',
      description: 'Authentic Turkmen cuisine served in a modern lounge setting.',
      heroImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200',
      cuisines: ['Turkmen Traditional', 'Fine Dining'],
      tags: ['Lounge', 'Modern', 'Atmosphere'],
      dietary: ['Halal'],
      priceTier: '$$$',
      rating: 4.6,
      reviewCount: 130,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9470, // Approximate
      lng: 58.3870, // Approximate
      phone: '+993 12 22 33 44',
      website: null,
      schedule: [{ days: 'Daily', hours: '11:00 – 00:00' }],
      amenities: ['Lounge Area', 'Cocktails', 'Music'],
      menuHighlights: [
        { name: 'Lamb Shank', price: '95 TMT', description: 'Slow-cooked lamb shank' },
        { name: 'Gourmet Burger', price: '75 TMT', description: 'Premium beef burger' },
        { name: 'Signature Salad', price: '55 TMT', description: 'Chef special salad' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'
      ],
      sustainabilityScore: 77,
      aiSummary: 'Modern vibes meets traditional tastes in an upscale environment.',
      status: 'active'
    },
    {
      id: 'altyn-acar',
      name: 'Altyn Açar',
      description: 'A perfect spot for dessert lovers.',
      heroImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200',
      cuisines: ['Cafe & Bakery'],
      tags: ['Dessert', 'Pastry', 'Coffee'],
      dietary: ['Vegetarian'],
      priceTier: '$$',
      rating: 4.4,
      reviewCount: 175,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9410, // Approximate
      lng: 58.3810, // Approximate
      phone: '+993 12 33 44 55',
      website: null,
      schedule: [{ days: 'Daily', hours: '08:00 – 22:00' }],
      amenities: ['Wi-Fi', 'Coffee Bar'],
      menuHighlights: [
        { name: 'Cheesecake', price: '35 TMT', description: 'Classic cheesecake' },
        { name: 'Fruit Tart', price: '30 TMT', description: 'Fresh seasonal fruit tart' },
        { name: 'Cappuccino', price: '20 TMT', description: 'Italian coffee' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800'
      ],
      sustainabilityScore: 72,
      aiSummary: 'Satisfy your sweet tooth with their excellent pastries.',
      status: 'active'
    },
    {
      id: 'zip-90',
      name: 'Zip 90 (Balyk Tagamlary)',
      description: 'Located in Bagtyyarlyk district, specializing in authentic Turkmen fish dishes.',
      heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
      cuisines: ['Seafood', 'Turkmen Traditional'],
      tags: ['Fish', 'Seafood', 'Local'],
      dietary: ['Halal', 'Pescatarian'],
      priceTier: '$$',
      rating: 4.5,
      reviewCount: 110,
      address: 'Bagtyyarlyk district, Ashgabat',
      neighborhood: 'Bagtyyarlyk',
      city: 'Ashgabat',
      lat: 37.9600, // Approximate
      lng: 58.3500, // Approximate
      phone: '+993 12 44 55 66',
      website: null,
      schedule: [{ days: 'Daily', hours: '10:00 – 22:00' }],
      amenities: ['Family Seating', 'Fresh Fish Display'],
      menuHighlights: [
        { name: 'Fried Carp', price: '60 TMT', description: 'Locally sourced fried fish' },
        { name: 'Fish Soup', price: '35 TMT', description: 'Traditional fish broth' },
        { name: 'Grilled Trout', price: '75 TMT', description: 'Whole grilled trout' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'
      ],
      sustainabilityScore: 78,
      aiSummary: 'The place to be for fresh and traditional fish dishes.',
      status: 'active'
    },
    {
      id: 'yelken',
      name: 'Ýelken',
      description: 'Authentic Japanese cuisine offering sushi and traditional dishes.',
      heroImage: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200',
      cuisines: ['International', 'Seafood'],
      tags: ['Japanese', 'Sushi', 'Asian'],
      dietary: ['Pescatarian'],
      priceTier: '$$$',
      rating: 4.7,
      reviewCount: 180,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9440, // Approximate
      lng: 58.3840, // Approximate
      phone: '+993 12 77 66 55',
      website: null,
      schedule: [{ days: 'Daily', hours: '12:00 – 23:00' }],
      amenities: ['Sushi Bar', 'Private Rooms'],
      menuHighlights: [
        { name: 'California Roll', price: '85 TMT', description: 'Crab and avocado roll' },
        { name: 'Sashimi Platter', price: '150 TMT', description: 'Assorted raw fish' },
        { name: 'Miso Soup', price: '30 TMT', description: 'Traditional soybean soup' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800'
      ],
      sustainabilityScore: 75,
      aiSummary: 'Top choice for sushi and Japanese cuisine aficionados.',
      status: 'active'
    },
    {
      id: 'argentina-grill',
      name: 'Argentina Grill',
      description: 'Authentic Argentine cuisine featuring premium grilled meats.',
      heroImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200',
      cuisines: ['International', 'Fine Dining'],
      tags: ['Steak', 'Argentine', 'Grill'],
      dietary: ['Halal'],
      priceTier: '$$$',
      rating: 4.6,
      reviewCount: 160,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9490, // Approximate
      lng: 58.3880, // Approximate
      phone: '+993 12 88 99 00',
      website: null,
      schedule: [{ days: 'Daily', hours: '12:00 – 23:00' }],
      amenities: ['Open Grill', 'Wine Selection'],
      menuHighlights: [
        { name: 'Asado', price: '180 TMT', description: 'Traditional Argentine BBQ' },
        { name: 'Chorizo Steak', price: '200 TMT', description: 'Sirloin steak' },
        { name: 'Empanadas', price: '45 TMT', description: 'Meat filled pastries' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'
      ],
      sustainabilityScore: 70,
      aiSummary: 'Experience the taste of Argentina in the heart of Ashgabat.',
      status: 'active'
    },
    {
      id: 'balykcy-restaurant',
      name: 'Balykçy Restaurant',
      description: 'Specializing in a variety of seafood dishes.',
      heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
      cuisines: ['Seafood'],
      tags: ['Fish', 'Fresh', 'Casual'],
      dietary: ['Pescatarian'],
      priceTier: '$$',
      rating: 4.4,
      reviewCount: 140,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9370, // Approximate
      lng: 58.3970, // Approximate
      phone: '+993 12 55 66 77',
      website: null,
      schedule: [{ days: 'Daily', hours: '11:00 – 22:00' }],
      amenities: ['Family Friendly', 'Outdoor Seating'],
      menuHighlights: [
        { name: 'Grilled Sea Bass', price: '95 TMT', description: 'Whole grilled fish' },
        { name: 'Fried Calamari', price: '60 TMT', description: 'Crispy squid rings' },
        { name: 'Fish & Chips', price: '55 TMT', description: 'Battered fish with fries' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'
      ],
      sustainabilityScore: 76,
      aiSummary: 'Great spot for casual seafood dining.',
      status: 'active'
    },
    {
      id: 'dante-italian',
      name: 'Dante Italian Pasta & Pizza',
      description: 'A cozy spot for Italian pasta and pizza lovers.',
      heroImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200',
      cuisines: ['International'],
      tags: ['Italian', 'Pasta', 'Pizza'],
      dietary: ['Vegetarian Options'],
      priceTier: '$$',
      rating: 4.3,
      reviewCount: 190,
      address: 'Ashgabat',
      neighborhood: 'City Center',
      city: 'Ashgabat',
      lat: 37.9460, // Approximate
      lng: 58.3790, // Approximate
      phone: '+993 12 22 11 00',
      website: null,
      schedule: [{ days: 'Daily', hours: '11:00 – 22:00' }],
      amenities: ['Casual Dining', 'Takeaway'],
      menuHighlights: [
        { name: 'Spaghetti Bolognese', price: '55 TMT', description: 'Pasta with meat sauce' },
        { name: 'Pepperoni Pizza', price: '65 TMT', description: 'Spicy sausage pizza' },
        { name: 'Tiramisu', price: '40 TMT', description: 'Classic Italian dessert' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'
      ],
      sustainabilityScore: 68,
      aiSummary: 'Comforting Italian classics in a friendly environment.',
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
  console.log('✅ Restaurants seeded');
}

console.log('🚀 Database initialized successfully');

export default db;
