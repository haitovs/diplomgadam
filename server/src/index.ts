import cors from "cors";
import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import adminRouter from "./routes/admin.js";
import aiRouter from "./routes/ai.js";
import insightsRouter from "./routes/insights.js";
import restaurantsRouter from "./routes/restaurants.js";

// Initialize database (imports will configure it)
import "./db/init.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Serve local restaurant images
app.use("/images", express.static(path.resolve(__dirname, "../../data/images")));

app.get("/", (_req, res) => {
  res.json({
    name: "Ashgabat Restaurant Finder API",
    status: "ok",
    version: "0.2.0",
    location: "Ashgabat, Turkmenistan"
  });
});

app.use("/api/restaurants", restaurantsRouter);
app.use("/api/insights", insightsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/admin", adminRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  console.log(`🍽️  Ashgabat Restaurant API: http://localhost:${port}`);
  console.log(`📍 Location: Ashgabat, Turkmenistan`);
});
