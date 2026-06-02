import { Router } from "express";
import { z } from "zod";
import { generateAiResponse } from "../lib/ai-proxy.js";

const router = Router();

const promptSchema = z.object({
  question: z.string().min(4, "Prompt should include at least a few words."),
  lang: z.enum(["tk", "en"]).optional(),
  context: z.record(z.any()).optional()
});

router.post("/suggest", async (req, res) => {
  const parsed = promptSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
  }

  const lang = parsed.data.lang ?? (parsed.data.context?.lang as "tk" | "en" | undefined) ?? "tk";
  const response = await generateAiResponse(parsed.data.question, lang);
  return res.json(response);
});

export default router;
