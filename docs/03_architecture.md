# Chapter 3 · Architecture & System Design

## 3.1 High-level diagram

```
┌───────────────┐           https://localhost:5173            ┌───────────────────────────┐
│ React SPA     │  REST    ────────────────────────────────▶ │ Express API (Node 18+)    │
│ (Vite, TS)    │  calls                                     │  /api/restaurants         │
│               │◀────────────────────────────────────────── │  /api/insights            │
│ - Filters     │  JSON                                      │  /api/ai/suggest          │
│ - Map view    │                                             └─────────────┬─────────────┘
│ - TripAI UI   │                                                          │
└──────┬────────┘                                                          │ reads
       │                                                                    ▼
       │ LocalStorage favorites                                ┌───────────────────────────┐
       └──────────────────────────────────────────────────────▶│ Versioned JSON datasets  │
                                                               │ data/restaurants.json    │
                                                               │ data/insights-metrics..  │
                                                               └───────────────────────────┘
```

- Optional: `/api/ai/suggest` contacts HuggingFace Inference API (if API key is provided). Otherwise, deterministic heuristic templates are used.

## 3.2 Modules

| Layer | Responsibility | Key libraries |
| --- | --- | --- |
| Presentation | Routing, state, UI atoms, data fetching | React Router, TanStack Query, Zustand, Tailwind, Leaflet |
| Domain | Filter logic, scoring heuristics, AI prompt builder | Custom hooks (`useRestaurants`, `useAiConcierge`) |
| Data | REST client + JSON datasets | Axios (client), Express (server), Zod validators |
| AI | Proxy + fallback template generator | HuggingFace fetch client, heuristic scorer |

## 3.3 Data contracts

### Restaurant
```ts
type Restaurant = {
  id: string;
  name: string;
  cuisines: string[];
  dietary: string[];
  priceTier: "$" | "$$" | "$$$";
  rating: number;
  location: { address: string; neighborhood: string; coordinates: { lat: number; lng: number } };
  schedule: { days: string; hours: string }[];
  menuHighlights: { name: string; price: string; description: string }[];
  sustainabilityScore: number;
  aiSummary: string;
};
```

### AI response
```ts
type AiResponse = {
  suggestions: {
    id: string;
    title: string;
    recommendation: string;
    confidence: number;            // 0–1 normalized
    restaurants: string[];         // references to Restaurant.id
    reasoning: string;
  }[];
  tokensUsed: number;
  latencyMs: number;
  source: "huggingface" | "template";
};
```

## 3.4 AI concierge flow
1. User submits free-text question from TripAI page.
2. Frontend sends POST `/api/ai/suggest` with `{ question }`.
3. Express validates payload via Zod.
4. Server attempts to call HuggingFace (`HUGGINGFACE_API_KEY`, `HUGGINGFACE_MODEL`). If unavailable, it falls back to heuristics:
   - Derives intents (vegan, night, family, etc.) from prompt keywords.
   - Scores each restaurant using metadata.
   - Returns top three suggestions with rationale breadcrumbs.
5. Frontend renders cards showing latency, confidence, and the suggested venues (IDs can link back to catalogue).

## 3.5 Deployment considerations
- **Frontend**: Static hosting (Vercel, Netlify, university server). Configure env `VITE_API_BASE` if API runs on different host.
- **Backend**: Node service (Render, Railway, faculty VM). Provide `.env` with API keys.
- **Datasets**: Keep JSON files under version control. For production, replace with database or CMS; update `data-loader.ts`.
- **Security**: Rate-limit AI endpoint when exposing publicly; restrict `Access-Control-Allow-Origin` to known domains.

## 3.6 Extensibility roadmap
1. Replace static JSON with PostgreSQL + Prisma.
2. Add geospatial search (PostGIS, map clustering).
3. Introduce personalization (user accounts, itinerary exports).
4. Apply ML ranking using implicit feedback collected via TripAI interactions.
