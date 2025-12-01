import { Router } from "express";
import { findRestaurant, loadRestaurants } from "../lib/data-loader.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(loadRestaurants());
});

router.get("/:id", (req, res) => {
  const restaurant = findRestaurant(req.params.id);
  if (!restaurant) {
    return res.status(404).json({ message: "Restaurant not found" });
  }
  return res.json(restaurant);
});

export default router;
