# Chapter 4 · Implementation Narrative

## 4.1 Repository layout
```
.
├─ frontend/        # React + Vite SPA
├─ server/          # Express API
├─ data/            # Curated static datasets
└─ docs/            # Diploma chapters
```

## 4.2 Frontend (React + Vite)
- **State & data**: TanStack Query stores API responses; Zustand keeps UI filters/favorites, ensuring components remain lean.
- **UI components**:
  - `HeroBanner`, `FiltersPanel`, `RestaurantCard`, `MapPanel`, `MetricCard`, `AiConciergePage`.
  - Tailwind utility classes + custom `.glass-panel` mimic modern glassmorphism.
  - Accessibility features: semantic landmarks, focusable buttons, proper color contrast.
- **Routing**: React Router 6 with layout route (`ShellLayout`) to share navigation, hero copy, and footer.
- **Maps**: React-Leaflet renders OpenStreetMap tiles; coordinates from JSON align to a fictitious city grid.
- **Favorites**: `useFavorites` store syncs with `localStorage`, requiring zero backend state.
- **Testing**: Vitest + Testing Library (examples stubbed) – target is verifying filter logic and AI UI flows.

## 4.3 Backend (Express + TypeScript)
- **Routing**:
  - `GET /api/restaurants` – returns the entire catalogue.
  - `GET /api/restaurants/:id` – detail lookup with 404 handling.
  - `GET /api/insights/metrics`, `GET /api/insights/cuisine-demand` – analytics feeds.
  - `POST /api/ai/suggest` – validates prompt, proxies to HuggingFace or fallback heuristics.
- **Data loader**: Reads JSON once per process and caches in memory for fast responses.
- **AI proxy**: `generateAiResponse()` assesses intents (vegan, romantic, etc.) and scores restaurants using metadata. When a HuggingFace key exists, it enriches reasoning text with generated prose while preserving deterministic venue selection.
- **Error handling**: Central Express error middleware surfaces friendly responses to the SPA.

## 4.4 Datasets
- `restaurants.json` – 12 richly described venues (images, copywriting, sustainability stats). Coordinates cluster near Gadam City landmarks to allow believable map exploration.
- `insights-metrics.json` – Card values citing surveys (frozen but easily updatable).
- `cuisine-demand.json` – Chart-ready dataset to highlight cuisine popularity.

## 4.5 Styling & branding
- Tailwind config introduces a `brand` palette. Additional custom CSS sets fonts and glass panels.
- Icons: `lucide-react` for consistent stroke icons.
- Motion: `framer-motion` reserved for future enhancements (e.g., card animations).

## 4.6 AI concierge details
- Prompt builder simply forwards user text; context hook ready for future metadata injection (e.g., GPS, party size).
- Confidence values scale relative to heuristic rank.
- Response metadata (source, tokens, latency) educates examiners about AI governance choices.
- Offline-safe: without API key, TripAI keeps working using curated reasoning sentences.

## 4.7 Developer experience
- `npm run dev` launches both frontend and backend via `concurrently`.
- `npm run build` produces production bundles (server compiled to `dist`, SPA to `frontend/dist`).
- `.gitignore` ensures node_modules and environment secrets stay out of version control.

## 4.8 Future improvements
1. Integrate municipal open data (permits, transit) and display risk alerts.
2. Add offline-first PWA caching for catalogue data.
3. Replace heuristics with actual ML ranking (gradient boosting on preference logs).
4. Enable itinerary export (PDF/ICS) and shareable TripAI sessions.
