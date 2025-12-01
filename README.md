# Gadam Restaurant Finder

Design & implementation template for a diploma project about discovering restaurants in a smart-city context. The repository contains:

- **Frontend** – React + Vite SPA with smart filters, detail pages, faux map integration, TripAI concierge UI, and accessibility-first components.
- **Backend** – Express API serving curated static datasets plus an optional proxy to the HuggingFace Inference API for public LLM suggestions.
- **Docs** – Sequential chapters that describe the research motivation, requirements, architecture, implementation, and validation strategy.

> The experience is intentionally “finished-looking” while relying on static JSON assets so it can be demonstrated without private data sources. Plug in real APIs when you are ready to extend it.

## Key features

- Hero discover page with multi-dimensional filters, favorites, and call-to-action blocks for AI exploration.
- Restaurant profile pages with schedules, sustainability indicators, and gallery placeholders.
- Insight dashboard powered by precomputed metrics, Recharts visualizations, and narrative copy.
- TripAI concierge that hits the backend proxy; works with static intent-matching templates or a HuggingFace API key.
- Clean architecture monorepo (`frontend` + `server`) with shared datasets and type parity.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, React Router 6, TanStack Query, Zustand, React-Leaflet, Recharts |
| Backend | Node 18+, Express 4, TypeScript, Zod validation, optional HuggingFace integration |
| Tooling | Vitest, Testing Library, MSW for mocks, tsx for dev server, concurrently for orchestration |

## Getting started

> Commands assume you are in the repo root. Network access is required for installing dependencies the first time.

1. **Install dependencies**
   ```bash
   npm install
   npm install --prefix frontend
   npm install --prefix server
   ```
   Or leverage npm workspaces:
   ```bash
   npm install --workspaces
   ```
2. **Environment variables (optional)**
   - Copy `.env.sample` to `.env` inside `server/` and add `HUGGINGFACE_API_KEY` if you want live LLM responses.
3. **Run both apps**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - API: http://localhost:4000
4. **Production build**
   ```bash
   npm run build
   npm run start   # serves API (deploy SPA separately)
   ```

## Testing

- `npm run test --prefix frontend` → Vitest + React Testing Library.
- Backend routes can be extended with supertest; see `docs/05_validation.md` for scenarios.

## Project documentation

| Chapter | Description |
| --- | --- |
| `docs/01_project_overview.md` | Context, stakeholders, features, and milestone roadmap. |
| `docs/02_requirements.md` | Research insights, personas, functional and non-functional requirements. |
| `docs/03_architecture.md` | System design, data contracts, deployment diagrams, AI integration strategy. |
| `docs/04_implementation.md` | Detailed walkthrough of frontend, backend, datasets, and AI concierge flows. |
| `docs/05_validation.md` | Testing strategy, demo scripts, and future research extensions. |

---

Feel free to adapt branding, dataset size, and tonal elements to fit your thesis narrative. The current setup favors clarity, modularity, and demonstrable AI augmentation. Pull requests are welcome if you expand the static data or wire up real data feeds.
