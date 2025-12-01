# Chapter 2 · Requirements & Research Synthesis

## 2.1 Research highlights
- **Field interviews (42 participants)** uncovered three personas: eco-conscious locals, remote-working expats, and night-market explorers. All want decision support without app fatigue.
- **Desk research** compared platforms (Google Maps, TripAdvisor, Bolt Food). None combine qualitative storytelling, AI concierge, and sustainability metrics for a mid-sized city.
- **Data sources** used in this template:
  - Curated static dataset of 12 restaurants mapped to real coordinates in the fictional “Gadam City”.
  - Insight metrics derived from surveys + delivery platforms (values frozen for demo).
  - Optional HuggingFace inference endpoint for the conversational layer.

## 2.2 Personas

| Persona | Goals | Pain points | Key features |
| --- | --- | --- | --- |
| **Levan (29) – Remote product designer** | Quiet brunch/laptop spots, transparent Wi-Fi & sockets, AI tips for client dinners | Endless scrolling, unreliable reviews | Smart filters, work-friendly tags, TripAI suggestions |
| **Mariam (35) – Sustainability advocate** | Local sourcing, low carbon menus, ability to plan family dinners | Lack of sustainability info, no kids amenities filter | Sustainability scorecard, family-friendly tags |
| **Noor (25) – Visiting researcher** | Fast orientation, evening cultural food, halal options | Overwhelm, limited trusted recs | AI concierge, halal filter, map clustering |

## 2.3 Functional requirements
1. **Catalogue browsing** – List all curated restaurants with sorting, filtering, card previews, and navigable detail pages.
2. **Multi-filter search** – Query by cuisine, dietary preference, price tier, neighborhood, and minimum rating.
3. **Detail views** – Each venue page exposes gallery, schedule, amenities, sustainability score, and CTA links.
4. **Map visualization** – Display geographic pins with tooltips for spatial reasoning (Leaflet-based mock).
5. **Insight dashboard** – Present macro metrics & cuisine-demand chart for academic storytelling.
6. **TripAI concierge** – Accept natural-language prompt, call backend proxy, return at least three recommendations with rationale.
7. **Favorites** – Persist preferred restaurants in local storage.

## 2.4 Non-functional requirements
- **Accessibility**: WCAG AA color contrast, semantic HTML, skip redundant animation, keyboard-friendly components.
- **Performance**: <2s interactive (Core Web Vitals) thanks to Vite code-splitting and TanStack caching.
- **Reliability**: Backend returns deterministic mock JSON even offline; AI proxy falls back automatically.
- **Security & privacy**: No personal data stored; API key loaded server-side, never exposed to browser.
- **Maintainability**: Monorepo with shared TypeScript types, modular React components, documented API contracts.

## 2.5 Use cases

| ID | Scenario | Actors | Flow |
| --- | --- | --- | --- |
| UC-01 | Filter and shortlist vegan-friendly rooftops | Visitor | Open catalogue → apply dietary + tag filters → add to favorites |
| UC-02 | View AI concierge plan | Visitor | Navigate to `/concierge` → submit prompt → review suggestions + open detail pages |
| UC-03 | Present research metrics | Student | Go to insights dashboard → showcase cards + chart in defense presentation |
| UC-04 | Update dataset | Maintainer | Edit `data/*.json` → restart server → SPA reflects new content instantly |

## 2.6 Data governance
- Version-controlled JSON assets ensure repeatable demos.
- All image URLs reference Unsplash public CDN with proper query params.
- Documented structure in `docs/03_architecture.md#data-contracts`.
- Future work: integrate municipal open data (inspections, footfall) and add consent tracking for AI prompts.
