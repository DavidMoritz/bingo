# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bingo Builder: A full-stack bingo game application where users create custom phrase sets, share them via codes, and play bingo with dynamic grids. Currently transitioning from an in-memory Express API to AWS Amplify backend.

**Stack:**
- Backend: Node + Express (TypeScript, in-memory) - being phased out
- AWS Amplify: Data (DynamoDB + GraphQL), Auth (Cognito with Google OAuth)
- Frontend: Vite, React 19, TanStack Router, React Query, Tailwind CSS
- Tests: Vitest for both backend and frontend (jsdom for UI tests)

## Development Commands

### Backend (Legacy Express API - Still Used for Suggestions)
```bash
# Root directory
npm install
npm run dev      # Start Express API on port 3000 (tsx watch)
npm test         # Run Vitest tests (no port binding)
npm run build    # Compile TypeScript
```

### Frontend
```bash
cd front
npm install
npm run dev      # Vite dev server (requires Node >= 20.19)
npm run build    # TypeScript check + Vite production build
npm run lint     # Run ESLint
npm test         # Run Vitest tests with jsdom
```

### Amplify
```bash
# Deploy Amplify backend
npx ampx sandbox  # Start sandbox environment
npx ampx deploy   # Deploy to cloud
```

**Environment Variables:**
- `VITE_API_URL`: Backend URL for phrase suggestions (defaults to `http://localhost:3000`)
- Google OAuth secrets configured in Amplify: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Architecture

### Hybrid Backend Architecture

**Amplify Backend** (`amplify/` directory):
- `amplify/backend.ts`: Defines data and auth resources
- `amplify/data/resource.ts`: GraphQL schema with models:
  - `Profile`: User profiles (id, displayName, email)
  - `PhraseSet`: Phrase sets with code, phrases array, public/private flags, ratings
  - `PlaySession`: Saved game sessions with board snapshots and checked cells
  - `Rating`: Star ratings for phrase sets
- `amplify/auth/resource.ts`: Cognito auth with email and Google OAuth
- Authorization: All models use `publicApiKey` mode (API key authentication)

**Legacy Express API** (`src/` directory):
- Still handles phrase suggestions (`POST /phrase-suggestions`)
- `src/app.ts`: Express app with CORS and JSON parsing
- `src/server.ts`: Server entrypoint
- `src/suggestions/`: JSON template files for AI-ish phrase generation
- Auto-discovers suggestion templates from `*.json` files

### Frontend Architecture

**Routing** (`front/src/router.tsx`):
- TanStack Router with file-free configuration
- Routes: `/`, `/create`, `/join`, `/login`, `/profile`, `/game/$code`, `/session/$id`
- Loaders prefetch data before rendering (phrase sets, play sessions)
- Devtools available in development

**Data Layer** (`front/src/lib/api.ts`):
- Amplify Data client with GraphQL API
- Uses `apiKey` auth mode (configured in `amplify_outputs.json`)
- PhraseSet CRUD: create, fetch by code, list public sets, update, rate
- PlaySession CRUD: create, update checked cells, fetch by ID, list by profile
- Suggestions still call Express API (`VITE_API_URL`)

**State Management**:
- React Query for server state (mutations and queries)
- UserContext (`front/src/contexts/UserContext.tsx`) for auth state (profileId, email, displayName)
- Local component state with `useState` for UI interactions

**Pages** (`front/src/pages/`):
- `Create.tsx`: Create/edit phrase sets with AI suggestions
- `Game.tsx`: Play bingo with dynamic grid sizing
- `Join.tsx`: Join via code or search public boards
- `Profile.tsx`: View created boards and past sessions
- `Login.tsx`: Amplify authentication UI
- `SessionGameWrapper.tsx`: Resume saved sessions

**Game Logic** (`front/src/lib/bingo.ts`):
- Dynamic grid sizing based on phrase count: 1×1 (1-3), 2×2 (4-8), 3×3 (9-15), 4×4 (16-23), 5×5 (24+)
- FREE center only on 5×5 grids (locked on when 25+ phrases)
- Phrase syntax: `*Phrase` for priority, `A | B` for OR options
- Board generation: resolves OR options, honors priority phrases, shuffles, dedupes

## Key Implementation Details

### Phrase Set Features
- **Public/Private**: Toggle visibility in search results
- **Free Space**: Optional FREE center cell (only relevant for 5×5)
- **Ratings**: 1-5 stars, aggregated (ratingTotal, ratingCount, ratingAverage)
- **Ownership**: Tracked via `ownerProfileId` (can be "guest" for anonymous)
- **Code**: 6-character alphanumeric identifier (case-insensitive)

### Play Sessions
- Persist game state: board snapshot, checked cells, grid size
- Resume past games from Profile page
- Created when user starts a game (saved to Amplify)

### AI Suggestions
- Reads JSON templates from `src/suggestions/` directory
- Generates 30 themed phrases based on genre
- Frontend can append or replace phrases (deduplicates)
- Add new templates by dropping JSON files in `src/suggestions/`

### Authentication Flow
- Amplify Authenticator component handles UI
- Supports email and Google OAuth
- Callback URLs configured for localhost:5173 and localhost:4173
- User context populated after sign-in

## Common Patterns

### Creating a Phrase Set
```typescript
const phraseSet = await createPhraseSet({
  title: "Game Night",
  phrases: ["*Must include", "Option A | Option B", "Normal phrase"],
  isPublic: true,
  freeSpace: true,
  ownerProfileId: profileId
})
```

### Data Fetching with React Query
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['phrase-set', code],
  queryFn: () => fetchPhraseSet(code)
})
```

### Mutations
```typescript
const mutation = useMutation({
  mutationFn: createPhraseSet,
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['my-phrase-sets'] })
  }
})
```

## Important Constraints

- **API Key Auth**: All Amplify Data operations use public API key (no user-based auth yet)
- **Legacy Suggestions**: Still using Express API for phrase suggestions (not migrated to Amplify)
- **Grid Sizing**: Automatically determined by phrase count, cannot be manually set
- **FREE Center**: Locked to enabled when 25+ phrases (5×5 grid)
- **Data Migration**: Transitioning from Express to Amplify, some code references both

## Testing

- Backend tests use Vitest with no port binding (unit tests only)
- Frontend tests use Vitest + jsdom (component and logic tests)
- `front/src/lib/bingo.test.ts`: Tests for board generation, priority, OR syntax
- Run tests before committing changes

## File Structure Notes

- `amplify_outputs.json`: Generated Amplify config (in both root and `front/src/`)
- Frontend uses `front/src/amplify_outputs.json` for client configuration
- `front/amplify_outputs.json` appears to be a symlink or duplicate
- TypeScript configs: `tsconfig.json` (root), `front/tsconfig.app.json` (app code), `front/tsconfig.node.json` (Vite config)
