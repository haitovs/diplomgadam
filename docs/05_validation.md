# Chapter 5 · Validation & Evaluation

## 5.1 Testing matrix

| Layer | What to test | Tooling | Status |
| --- | --- | --- | --- |
| Frontend – filters | Search + filter composition returns correct subset | Vitest + React Testing Library | TODO (spec + sample) |
| Frontend – AI UI | Submit prompt, show loading state, render cards | Vitest + MSW mock for `/api/ai/suggest` | TODO |
| Backend – restaurants | `GET /api/restaurants` returns 200 + JSON schema | Supertest | TODO |
| Backend – AI route | Invalid payload 400, valid payload returns 3 suggestions | Supertest + jest | TODO |
| UX rehearsal | Demo script for defense (narrated) | Manual | Scheduled |

## 5.2 Acceptance scenarios
1. **Catalogue exploration** – Examiner navigates to home page, filters by “Vegan + Rooftop”, sees relevant cards and map pins update instantly.
2. **Detail deep dive** – Examiner opens “Riverstone Atelier”, inspects sustainability score, menu highlights, and schedule grid.
3. **TripAI prompt** – Examiner asks “family-friendly halal dinner after 9pm”; TripAI returns curated cards referencing actual restaurants.
4. **Insight storytelling** – Examiner visits dashboard and explains each metric, referencing methodology captured in requirements chapter.

## 5.3 Observability hooks
- Console logging kept minimal to avoid noise; network tab clearly shows `/api/*` requests for transparency.
- `AiResponse` includes latency + tokens to reason about AI performance even when using template fallback.
- Future addition: integrate simple analytics (e.g., Plausible) to count TripAI submissions during pilot.

## 5.4 Deployment checklist
1. Install dependencies via `npm install --workspaces`.
2. Configure `.env` under `server/` with `PORT`, `HUGGINGFACE_API_KEY` (optional).
3. Run `npm run build`.
4. Deploy `frontend/dist` to static host. Serve `server/dist` via Node process or container.
5. Update `frontend/vite.config.ts` proxy or set `VITE_API_BASE` to production API URL.

## 5.5 Risk & mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| HuggingFace downtime | AI cards fallback to heuristics | Already implemented fallback; show informative message |
| Static dataset reveals template nature | Undermines “finished” illusion | Narrative copy emphasizes “curated by culinary lab”; add more entries if needed |
| Performance on low-end laptops | Demo lag | Limit heavy animations, leverage Vite lazy loading |
| Academic integrity concerns | Need to show real engineering | Provide walkthrough + code review-ready tests and documentation |
