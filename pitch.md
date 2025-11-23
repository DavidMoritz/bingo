# Bingo Builder - Interview Pitch

## The Hook
**A production bingo app that solves a real UX problem**: How do you let users play without friction, then convert them to authenticated users without losing their progress?

Most apps force sign-up upfront. I built a seamless guest-to-authenticated flow with LocalStorage that migrates to cloud storage on sign-up. **Zero progress lost, zero friction.**

## What It Does
- Create custom bingo boards with dynamic grids (1×1 to 5×5, auto-sized by phrase count)
- Share via 6-character codes or public search
- Play as guest (LocalStorage) or authenticated user (DynamoDB)
- Rate boards, discover popular sets, resume games across devices

## The Standout Features

### 1. Seamless Guest Flow
**The Problem**: Guests lose progress when they refresh or sign up.

**My Solution**:
- Auto-save to LocalStorage on every cell click
- "Resume Game" buttons appear across the app (Home, Join, Login pages)
- When guest signs up → redirect back to game → load from LocalStorage → migrate to cloud → clear local storage
- Result: **Guests feel like authenticated users**, conversion doesn't break the experience

### 2. Mobile-First Responsive Design
- Full-width buttons on mobile, auto-width on desktop
- Auto-fitting text in bingo cells with hyphenation for long phrases
- Touch-friendly targets, optimized spacing at every breakpoint
- Looks great on iPhone SE through desktop displays

### 3. Smart UX Details
- **Empty states**: New users see "Create a board" prompts, not confusing empty lists
- **Color-coded CTAs**: Teal for primary actions, amber for "resume" features (consistent visual language)
- **Bayesian rating sort**: Balances rating quality with vote count (prevents new boards with 1 five-star rating from dominating)
- **One rating per user per board**: Prevents spam, updates replace instead of append

## Tech Stack (Modern & Production-Ready)

**Frontend**:
- React 19 + TypeScript (full type safety)
- Vite (fast dev server, optimized builds)
- TanStack Router (type-safe routing with data loaders)
- React Query (smart caching, optimistic updates)
- Tailwind CSS (rapid, responsive styling)

**Backend**:
- AWS Amplify Gen 2 (DynamoDB + GraphQL + Cognito)
- API Key auth (allows guest access + easy migration to user auth)
- Google OAuth integration
- Git-based CI/CD (push to deploy in 2 minutes)

**Architecture Highlights**:
- LocalStorage utilities for guest persistence
- GraphQL for efficient data fetching
- Smart caching layers (React Query + PhraseTemplate caching)
- Mobile-first responsive patterns throughout

## What This Demonstrates

### Technical Skills
- **Full-stack**: Backend (Amplify/DynamoDB), Frontend (React), Infrastructure (CI/CD)
- **Modern tooling**: Latest React, TypeScript, AWS Gen 2, TanStack ecosystem
- **State management**: LocalStorage, React Query, optimistic updates
- **API design**: GraphQL schema design, authorization modes, data modeling

### Product Thinking
- **User empathy**: Identified friction points (sign-up, progress loss) and solved them
- **Progressive enhancement**: Works great as guest, better when authenticated
- **Performance**: Fast loads, instant feedback, smart caching
- **Mobile-first**: Built for real users on real devices

### Attention to Detail
- Consistent color language (teal = primary, amber = resume)
- Empty state guidance
- Responsive at every breakpoint
- Auto-fitting text, hyphenation, smooth animations
- Edge cases handled (refresh, sign-up, migration)

## Live Demo Flow (2 minutes)

1. **Guest experience** (30 sec):
   - Open site → Join game with code → Play a few cells → Refresh → Progress saved
   - Show "Resume Game" button on Home/Join pages

2. **Sign-up flow** (30 sec):
   - Click "Sign Up / Sign In" → Authenticate → Redirected back to game
   - All progress intact → Creates cloud PlaySession → LocalStorage cleared

3. **Authenticated features** (45 sec):
   - Profile page → My boards with editing
   - Create new board → Genre suggestions → Dynamic grid preview
   - Public search → Rating system

4. **Mobile responsive** (15 sec):
   - Open DevTools → Toggle device mode → Show responsive layouts

## Why This Matters
I didn't just build features—I built an **experience**. Every decision prioritizes the user:
- Guest flow removes friction
- Mobile-first design works everywhere
- Empty states guide new users
- Smart defaults (Bayesian sort, auto-grid sizing)

This is how I approach all development: **user-first, technically sound, production-ready.**

---

**Live Site**: [your-amplify-url]
**Code**: github.com/yourname/bingo
**Time to Build**: [X weeks] as a side project
**Lines of Code**: ~3,000 (frontend + backend config)
