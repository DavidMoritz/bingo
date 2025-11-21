# Bingo App Architecture Guide

## Overview
- **Backend**: Node + Express (TypeScript). In-memory storage for phrase sets, suggestion generation, ratings, and health checks. (If I were distributing this, I would likely use Amplify. The data would be in Dynamo DB and the API running in Lambda using GraphQL)
- **Frontend**: Vite + React + TypeScript with TanStack Router, React Query, and Tailwind CSS.
- **Build/Dev**: Vite powers fast dev server and optimized builds; `npm run dev` for each side, `npm run build` for production bundles.

## Backend (Express, TypeScript)
- **Entrypoint**: `src/app.ts` builds the Express app (JSON parsing + CORS); `src/server.ts` simply boots it. This keeps the app testable without binding a port.
- **Phrase sets**: Stored in an in-memory `Map<string, PhraseSet>`; generated codes are 6-char alphanumeric. Each `PhraseSet` holds `title`, `phrases`, `isPublic`, `freeSpace`, timestamps, and rating aggregates (`ratingTotal`, `ratingCount`, `ratingAverage`).
- **Endpoints**:
  - `GET /health` — basic status.
  - `POST /phrase-sets` — create phrase sets with flags (`isPublic`, `freeSpace`); returns the full `PhraseSet`.
  - `GET /phrase-sets/:code` — fetch a set by code (uppercase insensitive).
  - `POST /phrase-suggestions` — given `{ genre }`, returns up to 30 themed phrases using template JSON files plus fallback shuffles.
  - `GET /phrase-sets/public?q=` — list up to 30 public sets, filtered by search term; sorted by rating (desc) then recency.
  - `POST /phrase-sets/:code/rate` — submit a 1–5 star rating; updates averages.
- **Suggestions data**: Auto-loaded from `src/suggestions/*.json` (except fallback logic, which is embedded). New templates are picked up automatically.
- **Ratings**: Simple aggregation in memory; no auth—purely demo-grade.

## Frontend Stack
- **Vite**: Dev server + bundler. Hot module reload during `npm run dev`, and `npm run build` outputs optimized JS/CSS. Config in `front/vite.config.ts` (React plugin).
- **React**: UI components (function components + hooks). State handled with `useState`, async mutations with React Query, and routing via TanStack Router.
- **Tailwind CSS**: Utility-first styling. Config in `front/tailwind.config.js`; classes are used directly in JSX for layout, spacing, color, and effects.
- **TanStack Router**: File-free router config in `front/src/router.tsx`. Routes:
  - `/` → Home marketing splash (`HomePage`).
  - `/create` → Phrase creation + options (`CreatePage`).
  - `/join` → Code entry + public search (`JoinPage`).
  - `/game/$code` → Play view with loader that fetches the phrase set before render (`GamePage`).
  Router uses loaders for data fetching and provides devtools for inspection.
- **React Query**: Handles mutations for create, suggestions, ratings; query for public set search. Caches responses and manages loading/error states.

## Frontend Features
- **Create flow (`front/src/pages/Create.tsx`)**:
  - AI Suggestion button: if the user edited phrases, it appends unique suggestions until 30; otherwise replaces with ~24–30 suggested phrases.
  - Title input, genre-to-suggestions helper, and phrases textarea.
  - Formatting help modal explains: one-per-line, `A | B` OR syntax (one chosen randomly), priority via `*` prefix, and center FREE note.
  - Toggles: `Public` (discoverable, default on) and `Free space` (center FREE cell on/off, only matters for 5×5).
  - Submits to `POST /phrase-sets`; displays returned code and metadata.
- **Join flow (`front/src/pages/Join.tsx`)**:
  - Direct code entry navigates to `/game/{code}`.
  - Public search hits `GET /phrase-sets/public` with query; results show title, code, snippet of phrases, created date, and rating. Click to join. Lists are sorted by rating then recency.
- **Game flow (`front/src/pages/Game.tsx`)**:
  - Loader-provided phrase set generates a board sized to phrase count: <4 → 1×1; <9 → 2×2; <16 → 3×3; <24 → 4×4; 24+ → 5×5 (FREE center only on 5×5 if enabled). Cells toggle selection on click.
  - Supports OR phrases and priority phrases: `*` forces inclusion; `A | B` picks one per line; all are shuffled and deduped.
  - Ratings: inline 1–5 star widget posts to `/phrase-sets/:code/rate`; after submission, stars are replaced with a “Thank you” chip; averages/count shown.
  - Reshuffle uses the same phrase set and respects the free-space flag.

## Utilities and Logic
- **Board generation** (`front/src/lib/bingo.ts`):
  - Parses phrases, resolves OR options, honors priority (`*`) first (shuffled), then fills remaining slots; dedupes; auto-selects grid size, and only inserts FREE center for 5×5.
  - `toggleCell` flips selection for non-free cells.
- **API helpers** (`front/src/lib/api.ts`):
  - `createPhraseSet`, `fetchPhraseSet`, `fetchPublicPhraseSets`, `suggestPhrases`, `ratePhraseSet`.
  - Base URL from `VITE_API_URL` (default `http://localhost:3000`).

## Styling
- **Tailwind usage**: Utility classes define grids, spacing, borders, gradients, blur, typography, and interactive states. Global styles live in `front/src/index.css` with Tailwind directives plus background/typography tweaks.
- **Components**: No separate CSS modules; styling is colocated via Tailwind classes for speed and consistency.

## Running and Building
- **Backend**: `npm install` (root), then `npm run dev` (ts-node/tsx watch) or `npm start`. Default port 3000; set `PORT` to override.
- **Frontend**: `cd front && npm install`, `npm run dev` for Vite HMR, `npm run build` for production assets. Needs Node ≥ 20.19 for Vite 7.
- **Environment**: Set `VITE_API_URL` in `front` to point to the backend if not `http://localhost:3000`.
- **Tests**: Backend `npm test` (Vitest, no network binding) for public search and helpers. Frontend `cd front && npm test` (Vitest/jsdom) for board sizing/priority/OR handling.

## Data/Bugs/Notes
- **Persistence**: Backend is in-memory; restarting wipes data and ratings. Swap `Map` for a DB/file to persist.
- **Auth**: None—public demo only. Ratings are unauthenticated.
- **Templates**: Add/remove JSON under `src/suggestions/` to extend AI-ish suggestions (auto-discovered).

## Additional Questions:

- "What does success look like to you?"
  - Gets them talking specifics, not corporate waffle.

- "What would make you think 'thank God we hired David' in six months' time?"
  - This is my favourite. It cuts through the fluff and gets to what really matters.

- "How would I fit into the bigger picture of where the company's heading?"
  - Shows strategic thinking. You're not just after any job, you're thinking about where this leads.

- "Jeremy said you just started this company. What have you liked most about it?"
  - People love this one. It's personal but professional, and the answer tells you loads about the real culture.
  - Generic: "I noticed you've been here for [X years]. What's kept you here?"

- "What's the biggest challenge this role will face in the first 90 days?" 
  - Shows you're already thinking about impact, not just getting through probation.