# Bingo Builder

A Vite + React + TypeScript front-end with TanStack Router/Query and Tailwind, backed by a tiny Express API. Create phrase sets, share a code, play bingo with dynamic grids, AI-ish suggestions, public search, and ratings.

## Stack
- Backend: Node + Express (TypeScript, in-memory)
- Frontend: Vite, React, TanStack Router, React Query, Tailwind CSS
- Tests: Vitest (backend + frontend), jsdom for UI-side tests

## Setup
```bash
# backend (repo root)
npm install
npm run dev    # starts API on :3000 (set PORT to override)

# frontend
cd front
npm install
npm run dev    # Vite dev server (needs Node >= 20.19)
```
Set `VITE_API_URL` in `front` if the API isn’t on `http://localhost:3000`.

## Scripts
- Backend: `npm run dev`, `npm run build`, `npm test` (Vitest, no port binding)
- Frontend: `npm run dev`, `npm run build`, `npm test` (Vitest/jsdom)

## Features
- Create phrase sets with optional AI suggestions; supports OR (`A | B`) and priority (`*Phrase`) syntax.
- Dynamic grid sizing by phrase count (1×1 up to 5×5; FREE center only on 5×5, locked on until 25+ phrases).
- Public/private toggle; free-space toggle (locked on until 25+ phrases).
- Join via code or search public boards (sorted by rating, then recency).
- In-game star ratings with inline thank-you state.

## API (high-level)
- `POST /phrase-sets` — create a set
- `GET /phrase-sets/:code` — fetch by code
- `POST /phrase-suggestions` — genre → phrases
- `GET /phrase-sets/public?q=` — search public sets
- `POST /phrase-sets/:code/rate` — submit 1–5 star rating

## Notes
- Data/rates are in-memory; restart clears them.
- To add more suggestion templates, drop JSON files in `src/suggestions/`.
