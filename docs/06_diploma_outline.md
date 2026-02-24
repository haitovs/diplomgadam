CONTENT
INTRODUCTION 7
CHAPTER I. USED PROGRAMMING LANGUAGES AND WEB TECHNOLOGIES 11
1.1 What is React (SPA architecture)? 11
1.2 What is TypeScript? 18
1.3 State management with TanStack Query and Zustand in “Ashgabat Eats” 24
1.4 Tailwind theming and design system choices 31
CHAPTER II. INTRODUCING THE “ASHGABAT EATS” URBAN DINING PLATFORM 38
2.1 Key features of the “Ashgabat Eats” application 38
2.2 System requirements, hosting topology, and target clients 40
2.3 Restaurant discovery, favorites, and AI concierge motivation 43
2.4 Data sourcing strategy and mock datasets for demonstrations 47
CHAPTER III. DEVELOPMENT AND FEATURES OF THE “ASHGABAT EATS” APPLICATION 53
3.1 Project structure, monorepo layout, and core data models 53
3.2 API layer, dataset loaders, and heuristic AI responder 59
3.3 Frontend views, routing, and interactive components 66
3.4 Observability, loading states, and graceful error UX 72
CONCLUSION 78
RECOMMENDATION 80
REFERENCES 82


ABSTRACT

The application is delivered as a full-stack monorepo with a React + TypeScript single-page frontend and an Express-based API backend. The entry point on the web (main.tsx) mounts a Router wrapped in a QueryClientProvider and Zustand stores, while the backend entry (src/index.ts) wires Express middleware, route mounts, and a pluggable AI proxy. This separation allows restaurant data, AI suggestions, and user state (filters, favorites) to evolve independently while still sharing a consistent contract.

Core experiences — Discover, Restaurant Detail, Insights, Favorites, and TripAI — are built from reusable layout primitives (Shell, HeroBanner, Glass panels) and domain components (RestaurantCard, MapPanel, FilterChip, RatingBadge). Favorites persist locally via a lightweight Zustand store, while server data is cached and kept fresh via TanStack Query. Filters combine client-side search, cuisine and dietary selection, price tiers, and minimum rating thresholds to demonstrate multi-dimensional querying over static JSON assets.

On the backend, dataset loaders read curated JSON files for restaurants, insight metrics, and cuisine demand. An AI concierge proxy runs a deterministic heuristic scorer: it derives intent flags (budget, cuisines, neighborhoods, dietary needs, late-night preference) and scores restaurants to produce suggestions with confidence, reasoning, and simulated latency. This approach keeps the prototype fully offline-ready while illustrating how external AI services could be integrated later through the same interface.

The Insights module aggregates mock analytics into charts for cuisine demand, price tier distribution, late-night coverage, and sustainability versus ratings, highlighting how data storytelling complements discovery. UI theming uses Tailwind with a default dark mode and a toggle for light mode, showcasing modern theming practices. By combining declarative UI, typed API contracts, modular state management, and believable mock datasets, the “Ashgabat Eats” project demonstrates end-to-end web application design for urban dining discovery and AI-augmented decision support.
