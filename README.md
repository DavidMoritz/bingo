# Bingo Builder

A lightning-fast bingo app with custom phrase sets, dynamic grids, and seamless guest-to-authenticated flow. Built with Vite + React + TypeScript, TanStack Router/Query, Tailwind CSS, and AWS Amplify backend.

## Stack
- **Backend**: AWS Amplify Gen 2 (DynamoDB + GraphQL API + Cognito Auth with Google OAuth)
- **Frontend**: Vite, React 19, TanStack Router, React Query, Tailwind CSS
- **Tests**: Vitest (backend + frontend), jsdom for UI-side tests
- **Deployment**: AWS Amplify Hosting with git-based CI/CD

## Setup
```bash
# Start Amplify backend sandbox
npx ampx sandbox  # Creates isolated dev environment

# Frontend (in separate terminal)
cd front
npm install
npm run dev       # Vite dev server (needs Node >= 20.19)
```

**Environment Variables**:
- Google OAuth credentials configured in Amplify Console
- `VITE_API_URL` for legacy Express API (phrase suggestions only)

## Scripts
- **Amplify**: `npx ampx sandbox` (local dev), `git push` (production deploy)
- **Frontend**: `npm run dev`, `npm run build`, `npm test` (Vitest/jsdom)
- **Legacy Backend**: `npm run dev` (Express API for phrase suggestions)

## Features

### Core Gameplay
- **Create phrase sets** with genre-based suggestions; supports OR (`A | B`) and priority (`*Phrase`) syntax
- **Dynamic grid sizing** by phrase count: 1×1 → 2×2 → 3×3 → 4×4 → 5×5 (FREE center on 5×5 only)
- **Public/private boards** with star ratings (1-5) and Bayesian sorting
- **Join via code** or search public boards by title, code, or phrase content
- **Auto-fit text** in cells with hyphenation for long phrases

### Guest Session Persistence
- **Play without signing up**: Guest players' progress saved to LocalStorage
- **Resume on refresh**: Board state, checked cells, and grid persist across page reloads
- **Resume buttons**: Appear on Home, Join, and Login pages with game info
- **Seamless sign-up flow**:
  1. Guest plays game → Clicks "Sign Up / Sign In" → Authenticates
  2. Returns to game with all progress intact
  3. LocalStorage state automatically migrates to cloud PlaySession
  4. No progress lost during authentication

### Authentication & Profiles
- **Email/password** and **Google OAuth** via AWS Cognito
- **Profile page**: View created boards, edit titles/phrases, manage visibility
- **Play session history**: Resume past games from profile
- **Empty state guidance**: New users see "Create a board" prompt

### Mobile-Responsive Design
- **Mobile-first**: Full-width buttons, optimized spacing, stacked layouts
- **Responsive breakpoints**: Adapts at sm (640px), md (768px), lg (1024px)
- **Auto-sizing cells**: Bingo grid adjusts to screen size and phrase count
- **Touch-friendly**: Large tap targets, smooth animations

## Data Models (DynamoDB via GraphQL)
- **PhraseSet**: Custom bingo boards with title, phrases, ratings, ownership
- **PlaySession**: Saved game states with board snapshots and checked cells
- **Rating**: One rating per user per phrase set (prevents duplicates)
- **PhraseTemplate**: Cached phrase suggestions by genre
- **Profile**: User info from Cognito (display name, email)

## Architecture Highlights
- **LocalStorage for guests**: Game state persists without authentication
- **React Query**: Smart caching, optimistic updates, auto-refetch
- **TanStack Router**: Type-safe routes with loaders for data prefetching
- **API Key auth**: Allows guest access, easy migration to user-based auth later
- **Bayesian rating sort**: Balances rating quality with vote count

## Deployment
- **Git push** → Amplify Hosting builds and deploys automatically
- **Frontend-only builds**: ~2 minutes
- **Backend + frontend**: ~9 minutes (CloudFormation updates)
- **Deployment logs**: Saved in `deployment-logs/` for debugging

See `explanation.md` for complete architecture documentation.