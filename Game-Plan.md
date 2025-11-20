Oh this is a perfect project for both your wife and this interview stack. Nice find. 🙌

You can absolutely use this as your Vite + React + TanStack Router + Tailwind + Vitest demo.

⸻

1. Core idea (nailed)

Your requirements, restated in “tech spec” terms:
	•	A creator can:
	•	Enter a title and a list of phrases.
	•	Submit them and receive a shareable code (or link).
	•	A player can:
	•	Enter that code.
	•	Get a randomized 5×5 bingo grid using those phrases.
	•	Toggle cells on/off while playing.
	•	Key constraint:
Phrase sets must be accessible by other players, not just on the creator’s device.

Perfect, so let’s design it.

⸻

2. Minimal architecture for a demo

Since this is for showing off front-end skills (and you’re not being hired as a backend dev here), I’d recommend:

Option A – super simple backend (for realism)

Use a tiny Node/Express (or even a mock service) that:
	•	POST /phrase-sets → returns { code, phrases, createdAt }
	•	GET /phrase-sets/:code → returns { code, title, phrases }

In memory is fine for a demo. You can literally store it in a Map<string, PhraseSet> in the server. That’s enough to prove you know the pattern.

Option B – zero backend, clever codes (for speed)

Generate a “code” that actually encodes the phrases, for example:
	•	code = base64url(JSON.stringify({ title, phrases }))

Players paste the code into the app and you decode it to reconstruct the phrase set.

Pros:
	•	No network / backend needed.
	•	Super quick to build.

Cons:
	•	Codes get long with many phrases.
	•	Not as “enterprise-y.”

For an interview, I’d personally do Option A so you can talk about:
	•	API contracts
	•	error handling
	•	TanStack query patterns (if you want to go that far)

⸻

3. Data model (TypeScript)

export type PhraseSet = {
  code: string
  title: string
  phrases: string[]
  createdAt: string
}

export type BingoCell = {
  id: string
  text: string
  selected: boolean
  isFree?: boolean
}

export type BingoBoard = {
  code: string        // phrase set code
  title: string
  cells: BingoCell[]  // length 25
}


⸻

4. Bingo board generation

We want:
	•	5×5 board.
	•	Optional “FREE” center cell.
	•	Phrases shuffled and mapped into cells.

Example utility:

export function createBingoBoard(phraseSet: PhraseSet, useFreeCenter = true): BingoBoard {
  const shuffled = [...phraseSet.phrases].sort(() => Math.random() - 0.5)

  const needed = useFreeCenter ? 24 : 25
  const selectedPhrases = shuffled.slice(0, needed)

  const cells: BingoCell[] = []

  let phraseIndex = 0
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const index = row * 5 + col

      if (useFreeCenter && row === 2 && col === 2) {
        cells.push({
          id: `cell-${index}`,
          text: 'FREE',
          selected: true,
          isFree: true,
        })
      } else {
        cells.push({
          id: `cell-${index}`,
          text: selectedPhrases[phraseIndex++] ?? '',
          selected: false,
        })
      }
    }
  }

  return {
    code: phraseSet.code,
    title: phraseSet.title,
    cells,
  }
}

You can then unit test this with Vitest:
	•	25 cells total
	•	Center is FREE and selected
	•	Only uses phrases from the phrase set
	•	Different calls produce different distributions (probabilistic, but you can test with a seeded shuffle if you want more determinism)

⸻

5. Front-end structure with TanStack Router

Vite + React + TanStack Router + Tailwind:

Routes
	•	/ → Home (choose create or join)
	•	/create → Create Phrase Set
	•	/join → Enter code
	•	/game/$code → Play bingo

Home
	•	Two big Tailwind buttons:
	•	“Create Bingo Set”
	•	“Join Game”

Create page
	•	Title input
	•	Dynamic list of phrase inputs:
	•	Start with ~10 rows and “Add phrase” button
	•	Submit:
	•	Call POST /phrase-sets
	•	Show resulting code and a link like:
	•	https://your-app.com/game/ABCD12

This is where you show:
	•	Controlled components
	•	Form handling
	•	Basic validation (must have at least 24 phrases if you want free center)

Join page
	•	Text input for a code
	•	On submit:
	•	Navigate to /game/{code}

Game page /game/$code
	•	Use TanStack Router loader (or React Query if you want to flex) to:
	•	Fetch phrase set by code
	•	Call createBingoBoard()
	•	Render 5×5 grid using Tailwind’s CSS grid:
	•	grid grid-cols-5 gap-2
	•	Each cell:
	•	Click toggles selected
	•	Selected cells have a different bg / border

You can optionally:
	•	Show board title and code
	•	Add a “Reset board” button
	•	Maybe later: auto detect “BINGO!” across rows/cols/diagonals

⸻

6. Where testing and perf come in (for the interview)

This app is a great excuse to talk about the exact things Jeremy mentioned.

Vitest unit tests
	•	createBingoBoard utility
	•	A simple React component:
	•	e.g. <BingoCell> toggling class on click
	•	A hook if you factor board logic into useBingoBoard

E2E tests
	•	Use Playwright or Cypress:
	•	Visit /create
	•	Add phrases, submit
	•	Copy code, go to /game/{code}
	•	Click a few cells, assert they show selected styles

Even one simple E2E test makes you look very prepared.

Front-end performance talking points (with this app)
	•	The app is small, but you can still talk about:
	•	Code splitting: route-based bundles (/create, /game/:code)
	•	Fast dev/build: Vite hot reload, JSX transform
	•	No unnecessary re-renders:
	•	Keep board state local to the game page
	•	Use React.memo for <BingoCell> if you want to be fancy
	•	Tailwind benefits: no big CSS bundle, tree-shaken classes

⸻

7. What I can do next for you

If you want, in the next step I can:
	•	Give you:
	•	npm create vite@latest command with the exact template to use
	•	The TanStack Router route definitions you can paste in
	•	Tailwind config + example components
	•	Or write out:
	•	A full App.tsx + route components for /, /create, /join, /game/$code
	•	A couple of Vitest tests so you can run npm test and demo

Tell me your preference and I’ll just start spitting out the actual code so you can copy, paste, and tweak.

⸻

8. API scaffold (added now)

What exists
	•	In-memory Express server in src/server.ts
	•	PhraseSet model: { code, title, phrases, createdAt }
	•	Random 6-char codes (letters/numbers, uppercase)
	•	CORS + JSON body parsing
	•	Health: GET /health → { status: "ok" }
	•	Create: POST /phrase-sets with { title, phrases: string[] } → 201 + PhraseSet
	•	Fetch: GET /phrase-sets/:code → 200 + PhraseSet or 404

How to run
	•	npm install
	•	npm run dev (tsx watch) or npm start (ts-node)
	•	Default port 3000 (use PORT to override)

Notes / next backend steps
	•	Add persistence (file or DB) if needed
	•	Add validation library (Zod) for richer errors
	•	Add rate limiting if exposed publicly

9. Frontend scaffold (Vite + React + TanStack Router + Tailwind)
	•	Location: front/
	•	Stacks: React + TypeScript, TanStack Router, React Query, Tailwind
	•	Routes:
		•	/ (Home splash)
		•	/create (POST to /phrase-sets)
		•	/join (enter code → navigate)
		•	/game/:code (fetch phrase set → board + toggles)
	•	Utilities:
		•	src/lib/api.ts hits the local API (default http://localhost:3000 or VITE_API_URL)
		•	src/lib/bingo.ts generates/toggles boards with FREE center
	•	Run it: cd front && npm install && npm run dev (vite) or npm run build

10. AI-ish phrase suggestions (new)
	•	Endpoint: POST /phrase-suggestions with { genre }
	•	Server creates themed suggestions via templates + fallback; returns up to 30 phrases
	•	Create page: “Suggest phrases” button fills the textarea from the genre/vibe field
	•	Templates auto-loaded from src/suggestions/*.json (fallback prefixes/nouns embedded in server)
	•	Added templates: beach, mountains/ski, amusement park, zoo, big city, 4th of July, parade
