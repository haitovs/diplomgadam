import { Router } from "express";
import { loadCuisineDemand, loadInsightMetrics } from "../lib/data-loader.js";

const router = Router();

router.get("/metrics", (_req, res) => {
  res.json(loadInsightMetrics());
});

router.get("/cuisine-demand", (_req, res) => {
  res.json(loadCuisineDemand());
});

export default router;
