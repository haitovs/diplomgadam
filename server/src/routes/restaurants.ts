import { Request, Response, Router } from "express";
import db from "../db/init.js";

const router = Router();

// Get all active restaurants (public)
router.get("/", (req: Request, res: Response) => {
  const { cuisine, neighborhood, priceRange, search, sort } = req.query;

  let query = "SELECT * FROM restaurants WHERE status = ?";
  const params: any[] = ["active"];

  // Filter by cuisine (searches in JSON array)
  if (cuisine && cuisine !== "All") {
    query += " AND cuisines LIKE ?";
    params.push(`%${cuisine}%`);
  }

  // Filter by neighborhood
  if (neighborhood && neighborhood !== "All") {
    query += " AND neighborhood = ?";
    params.push(neighborhood);
  }

  // Filter by price range
  if (priceRange && priceRange !== "All") {
    query += " AND price_tier = ?";
    params.push(priceRange);
  }

  // Search
  if (search) {
    query += " AND (name LIKE ? OR description LIKE ? OR neighborhood LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  // Sorting
  switch (sort) {
    case "rating":
      query += " ORDER BY rating DESC";
      break;
    case "reviews":
      query += " ORDER BY review_count DESC";
      break;
    case "name":
      query += " ORDER BY name ASC";
      break;
    default:
      query += " ORDER BY rating DESC";
  }

  const restaurants = db.prepare(query).all(...params);

  // Parse JSON fields and format for frontend
  const parsed = restaurants.map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    heroImage: r.hero_image,
    cuisines: JSON.parse(r.cuisines || "[]"),
    tags: JSON.parse(r.tags || "[]"),
    dietary: JSON.parse(r.dietary || "[]"),
    priceTier: r.price_tier,
    rating: r.rating,
    reviewCount: r.review_count,
    location: {
      address: r.address,
      neighborhood: r.neighborhood,
      city: r.city,
      coordinates: { lat: r.lat, lng: r.lng },
    },
    contact: {
      phone: r.phone,
      website: r.website,
    },
    schedule: JSON.parse(r.schedule || "[]"),
    amenities: JSON.parse(r.amenities || "[]"),
    menuHighlights: JSON.parse(r.menu_highlights || "[]"),
    gallery: JSON.parse(r.gallery || "[]"),
    sustainabilityScore: r.sustainability_score,
    aiSummary: r.ai_summary,
  }));

  res.json(parsed);
});

// Get filter options — MUST be before /:id to avoid matching "filters" as an ID
router.get("/filters/options", (req: Request, res: Response) => {
  const cuisines = db
    .prepare(
      `
    SELECT DISTINCT json_each.value as cuisine 
    FROM restaurants, json_each(cuisines) 
    WHERE status = 'active'
  `,
    )
    .all()
    .map((r: any) => r.cuisine);

  const neighborhoods = db
    .prepare(
      `
    SELECT DISTINCT neighborhood 
    FROM restaurants 
    WHERE status = 'active' AND neighborhood IS NOT NULL
    ORDER BY neighborhood
  `,
    )
    .all()
    .map((r: any) => r.neighborhood);

  const priceTiers = ["$", "$$", "$$$"];

  res.json({
    cuisines: ["All", ...new Set(cuisines)],
    neighborhoods: ["All", ...neighborhoods],
    priceTiers: ["All", ...priceTiers],
  });
});

// Get single restaurant by ID
router.get("/:id", (req: Request, res: Response) => {
  const { id } = req.params;

  const restaurant = db
    .prepare("SELECT * FROM restaurants WHERE id = ? AND status = ?")
    .get(id, "active") as any;

  if (!restaurant) {
    return res.status(404).json({ error: "Restaurant not found" });
  }

  // Increment view count
  // Increment view count
  db.prepare("UPDATE restaurants SET views = views + 1 WHERE id = ?").run(id);

  // Fetch full menu items
  const fullMenu = db
    .prepare(
      "SELECT * FROM menu_items WHERE restaurant_id = ? AND is_available = 1 ORDER BY category, name",
    )
    .all(id);

  // Parse and format
  res.json({
    id: restaurant.id,
    name: restaurant.name,
    description: restaurant.description,
    heroImage: restaurant.hero_image,
    cuisines: JSON.parse(restaurant.cuisines || "[]"),
    tags: JSON.parse(restaurant.tags || "[]"),
    dietary: JSON.parse(restaurant.dietary || "[]"),
    priceTier: restaurant.price_tier,
    rating: restaurant.rating,
    reviewCount: restaurant.review_count,
    location: {
      address: restaurant.address,
      neighborhood: restaurant.neighborhood,
      city: restaurant.city,
      coordinates: { lat: restaurant.lat, lng: restaurant.lng },
    },
    contact: {
      phone: restaurant.phone,
      website: restaurant.website,
    },
    schedule: JSON.parse(restaurant.schedule || "[]"),
    amenities: JSON.parse(restaurant.amenities || "[]"),
    menuHighlights: JSON.parse(restaurant.menu_highlights || "[]"),
    gallery: JSON.parse(restaurant.gallery || "[]"),
    sustainabilityScore: restaurant.sustainability_score,
    aiSummary: restaurant.ai_summary,
    fullMenu: fullMenu, // Attach full menu
  });
});

export default router;
