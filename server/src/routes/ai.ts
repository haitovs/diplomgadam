import { Router } from "express";
import { z } from "zod";
import { generateAiResponse } from "../lib/ai-proxy.js";

const router = Router();

const promptSchema = z.object({
  question: z.string().min(4, "Prompt should include at least a few words."),
  context: z.record(z.any()).optional()
});

router.post("/suggest", async (req, res) => {
  const parsed = promptSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
  }

  const response = await generateAiResponse(parsed.data.question);
  return res.json(response);
});

export default router;
