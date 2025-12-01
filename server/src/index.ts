import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import restaurantsRouter from "./routes/restaurants.js";
import insightsRouter from "./routes/insights.js";
import aiRouter from "./routes/ai.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({
    name: "Gadam Restaurant Finder API",
    status: "ok",
    version: "0.1.0"
  });
});

app.use("/api/restaurants", restaurantsRouter);
app.use("/api/insights", insightsRouter);
app.use("/api/ai", aiRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
