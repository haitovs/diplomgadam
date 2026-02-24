# Design & Implementation Plan: Web Platform for Finding Restaurants

## Context
- **Program**: Faculty of Information Technologies and AI – Diploma project (template-first approach).
- **Objective**: Deliver a demonstrable “finished” platform where the UI/UX and data appear production-ready, even though the underlying content is static or powered by carefully selected public APIs.
- **Guiding Idea**: Showcase modern web engineering practices (React SPA + Node API), responsible AI integration, and a research-backed narrative around urban dining discovery.

## Stakeholder Goals
1. **Students / Researchers** – Need a replicable blueprint for future enhancements (real data sources, ML models, payments, reservations).
2. **Advisors / Reviewers** – Expect traceable documentation (analysis → design → implementation → validation).
3. **Demo Users** – Should be able to explore restaurants, filter, inspect details, and request AI-driven suggestions without noticing the static nature of the dataset.

## Key Features (Phase I Template)
| Feature | Description | Data Source |
| --- | --- | --- |
| Restaurant Catalogue | 12 curated entries with cuisine, price band, dietary tags, and location coordinates. | `/data/restaurants.json` |
| Smart Filters | Multi-select filters (cuisine, price, rating, dietary) with instant results. | In-memory filtering on the client. |
| Map View (Mock) | Interactive map component (Leaflet) with markers for each restaurant; coordinates pulled from JSON. | Static tiles + JSON coordinates. |
| Detail Pages | Rich cards with gallery, opening hours, signature dishes. | `restaurants.json` and derived sections. |
| AI Concierge | “Ask TripAI” chat that calls a public LLM endpoint (e.g., HuggingFace inference API) via backend proxy; gracefully falls back to template responses if offline. | `server/routes/ai.ts` |
| Favorites | Local-storage backed personalized list. | Browser storage only. |
| Accessibility & Localization | WCAG-friendly palette, semantic components, i18n-ready copy. | Static config (`/src/i18n/en.json`). |

## System Overview
- **Frontend**: React + Vite + TypeScript, Zustand for state, TanStack Query for data fetching, TailwindCSS for rapid UI. Deployed as static bundle.
- **Backend**: Node.js + Express providing three endpoints:
  1. `/api/restaurants` – static JSON feed.
  2. `/api/restaurants/:id` – detail lookup.
  3. `/api/ai/suggest` – proxies user prompt to HuggingFace text-generation (configurable) or returns curated canned answers.
- **Data**: Handcrafted `restaurants.json` (~24 entries) + `city-insights.json` for context (popular neighborhoods, cuisine stats).
- **AI Integration**: Optional API key in `.env` for HuggingFace; fallback ensures demo works without secrets.
- **Testing Strategy**: Vitest + React Testing Library for UI logic, supertest for API routes.

## Deliverables Breakdown
1. **Docs**: Introduction, literature review, requirements, architecture, implementation, validation, roadmap, appendices.
2. **Code**: `frontend/` and `server/` packages with shared `data/`.
3. **Demo Assets**: Screenshots, pitch deck snippet, API reference.

## Next Steps
1. Scaffold monorepo (pnpm workspaces) with `frontend` and `server`.
2. Populate `data/` with believable restaurant metadata (curated from fictional “Ashgabat City”).
3. Build out key UI flows and connect to Express API.
4. Write narrative documentation referencing actual code artifacts.
