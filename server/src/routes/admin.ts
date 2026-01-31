import { Request, Response, Router } from 'express';
import db from '../db/init.js';

const router = Router();

// Admin login
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const admin = db.prepare('SELECT * FROM admin_users WHERE username = ? AND password = ?').get(username, password) as any;

  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Simple token (in real app, use JWT)
  const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');

  res.json({
    success: true,
    token,
    user: {
      id: admin.id,
      username: admin.username,
      name: admin.name
    }
  });
});

// Get dashboard stats
router.get('/stats', (req: Request, res: Response) => {
  const stats = {
    totalRestaurants: (db.prepare('SELECT COUNT(*) as count FROM restaurants').get() as any).count,
    activeRestaurants: (db.prepare('SELECT COUNT(*) as count FROM restaurants WHERE status = ?').get('active') as any).count,
    totalCategories: (db.prepare('SELECT COUNT(*) as count FROM categories').get() as any).count,
    totalViews: (db.prepare('SELECT SUM(views) as total FROM restaurants').get() as any).total || 0,
    avgRating: (db.prepare('SELECT AVG(rating) as avg FROM restaurants WHERE status = ?').get('active') as any).avg?.toFixed(1) || 0,
    byNeighborhood: db.prepare(`
      SELECT neighborhood, COUNT(*) as count 
      FROM restaurants 
      WHERE status = 'active' 
      GROUP BY neighborhood 
      ORDER BY count DESC
    `).all(),
    byPriceTier: db.prepare(`
      SELECT price_tier, COUNT(*) as count 
      FROM restaurants 
      WHERE status = 'active' 
      GROUP BY price_tier
    `).all(),
    topRated: db.prepare(`
      SELECT id, name, rating, review_count 
      FROM restaurants 
      WHERE status = 'active' 
      ORDER BY rating DESC 
      LIMIT 5
    `).all(),
    recentlyAdded: db.prepare(`
      SELECT id, name, neighborhood, created_at 
      FROM restaurants 
      ORDER BY created_at DESC 
      LIMIT 5
    `).all()
  };

  res.json(stats);
});

// Get all categories
router.get('/categories', (req: Request, res: Response) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json(categories);
});

// Add category
router.post('/categories', (req: Request, res: Response) => {
  const { name, icon } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name required' });
  }

  try {
    const result = db.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)').run(name, icon || '🍽️');
    res.json({ id: result.lastInsertRowid, name, icon });
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    throw e;
  }
});

// Delete category
router.delete('/categories/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ success: true });
});

// Get all restaurants (admin view with all statuses)
router.get('/restaurants', (req: Request, res: Response) => {
  const { status, search } = req.query;

  let query = 'SELECT * FROM restaurants WHERE 1=1';
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (name LIKE ? OR neighborhood LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC';

  const restaurants = db.prepare(query).all(...params);

  // Parse JSON fields
  const parsed = restaurants.map((r: any) => ({
    ...r,
    cuisines: JSON.parse(r.cuisines || '[]'),
    tags: JSON.parse(r.tags || '[]'),
    dietary: JSON.parse(r.dietary || '[]'),
    schedule: JSON.parse(r.schedule || '[]'),
    amenities: JSON.parse(r.amenities || '[]'),
    menu_highlights: JSON.parse(r.menu_highlights || '[]'),
    gallery: JSON.parse(r.gallery || '[]')
  }));

  res.json(parsed);
});

// Get single restaurant
router.get('/restaurants/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(id) as any;

  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }

  // Parse JSON fields
  res.json({
    ...restaurant,
    cuisines: JSON.parse(restaurant.cuisines || '[]'),
    tags: JSON.parse(restaurant.tags || '[]'),
    dietary: JSON.parse(restaurant.dietary || '[]'),
    schedule: JSON.parse(restaurant.schedule || '[]'),
    amenities: JSON.parse(restaurant.amenities || '[]'),
    menu_highlights: JSON.parse(restaurant.menu_highlights || '[]'),
    gallery: JSON.parse(restaurant.gallery || '[]')
  });
});

// Create restaurant
router.post('/restaurants', (req: Request, res: Response) => {
  const data = req.body;
  const id = data.id || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  try {
    db.prepare(`
      INSERT INTO restaurants (
        id, name, description, hero_image, cuisines, tags, dietary,
        price_tier, rating, review_count, address, neighborhood, city,
        lat, lng, phone, website, schedule, amenities, menu_highlights,
        gallery, sustainability_score, ai_summary, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.description || '',
      data.hero_image || '',
      JSON.stringify(data.cuisines || []),
      JSON.stringify(data.tags || []),
      JSON.stringify(data.dietary || []),
      data.price_tier || '$$',
      data.rating || 0,
      data.review_count || 0,
      data.address || '',
      data.neighborhood || '',
      data.city || 'Ashgabat',
      data.lat || 37.95,
      data.lng || 58.38,
      data.phone || '',
      data.website || null,
      JSON.stringify(data.schedule || []),
      JSON.stringify(data.amenities || []),
      JSON.stringify(data.menu_highlights || []),
      JSON.stringify(data.gallery || []),
      data.sustainability_score || 70,
      data.ai_summary || '',
      data.status || 'active'
    );

    res.json({ success: true, id });
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Restaurant ID already exists' });
    }
    throw e;
  }
});

// Update restaurant
router.put('/restaurants/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const existing = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }

  db.prepare(`
    UPDATE restaurants SET
      name = ?, description = ?, hero_image = ?, cuisines = ?, tags = ?, dietary = ?,
      price_tier = ?, rating = ?, review_count = ?, address = ?, neighborhood = ?,
      lat = ?, lng = ?, phone = ?, website = ?, schedule = ?, amenities = ?,
      menu_highlights = ?, gallery = ?, sustainability_score = ?, ai_summary = ?,
      status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    data.name,
    data.description || '',
    data.hero_image || '',
    JSON.stringify(data.cuisines || []),
    JSON.stringify(data.tags || []),
    JSON.stringify(data.dietary || []),
    data.price_tier || '$$',
    data.rating || 0,
    data.review_count || 0,
    data.address || '',
    data.neighborhood || '',
    data.lat || 37.95,
    data.lng || 58.38,
    data.phone || '',
    data.website || null,
    JSON.stringify(data.schedule || []),
    JSON.stringify(data.amenities || []),
    JSON.stringify(data.menu_highlights || []),
    JSON.stringify(data.gallery || []),
    data.sustainability_score || 70,
    data.ai_summary || '',
    data.status || 'active',
    id
  );

  res.json({ success: true });
});

// Delete restaurant
router.delete('/restaurants/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM restaurants WHERE id = ?').run(id);
  res.json({ success: true });
});


// Get restaurant menu items
router.get('/restaurants/:id/menu', (req: Request, res: Response) => {
  const { id } = req.params;
  const items = db.prepare('SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY category, name').all(id);
  res.json(items);
});

// Add menu item
router.post('/restaurants/:id/menu', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, category, image_url, is_available } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  const result = db.prepare(`
    INSERT INTO menu_items (restaurant_id, name, description, price, category, image_url, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    description || '',
    price,
    category || 'Main',
    image_url || '',
    is_available !== undefined ? (is_available ? 1 : 0) : 1
  );

  res.json({ success: true, id: result.lastInsertRowid });
});

// Update menu item
router.put('/menu/:itemId', (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { name, description, price, category, image_url, is_available } = req.body;

  db.prepare(`
    UPDATE menu_items SET
      name = ?, description = ?, price = ?, category = ?, image_url = ?, is_available = ?
    WHERE id = ?
  `).run(
    name,
    description || '',
    price,
    category || 'Main',
    image_url || '',
    is_available !== undefined ? (is_available ? 1 : 0) : 1,
    itemId
  );

  res.json({ success: true });
});

// Delete menu item
router.delete('/menu/:itemId', (req: Request, res: Response) => {
  const { itemId } = req.params;
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(itemId);
  res.json({ success: true });
});

export default router;
