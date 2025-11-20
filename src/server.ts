import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

type PhraseSet = {
  code: string
  title: string
  phrases: string[]
  createdAt: string
}

type PhraseSetInput = {
  title: string
  phrases: string[]
}

type PhraseSuggestionResponse = {
  genre: string
  phrases: string[]
}

const app = express()
const port = process.env.PORT ? Number(process.env.PORT) : 3000

// Very small, in-memory data store. Replace with a DB for persistence.
const phraseSets = new Map<string, PhraseSet>()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/phrase-sets', (req, res, next) => {
  try {
    const { title, phrases } = parsePhraseSetInput(req.body)

    const code = createUniqueCode()
    const phraseSet: PhraseSet = {
      code,
      title,
      phrases,
      createdAt: new Date().toISOString(),
    }

    phraseSets.set(code, phraseSet)

    res.status(201).json(phraseSet)
  } catch (err) {
    next(err)
  }
})

app.post('/phrase-suggestions', (req, res, next) => {
  try {
    const genre = parseGenreInput(req.body)
    const phrases = generatePhraseSuggestions(genre)
    const response: PhraseSuggestionResponse = { genre, phrases }

    res.json(response)
  } catch (err) {
    next(err)
  }
})

app.get('/phrase-sets/:code', (req, res) => {
  const code = String(req.params.code || '').toUpperCase()
  const phraseSet = phraseSets.get(code)

  if (!phraseSet) {
    return res.status(404).json({ error: 'Phrase set not found' })
  }

  res.json(phraseSet)
})

app.use(notFoundMiddleware)
app.use(errorMiddleware)

app.listen(port, () => {
  console.log(`Bingo API listening on http://localhost:${port}`)
})

function parsePhraseSetInput(body: unknown): PhraseSetInput {
  if (typeof body !== 'object' || body === null) {
    throw badRequest('Body must be an object')
  }

  const { title, phrases } = body as Record<string, unknown>

  if (typeof title !== 'string' || !title.trim()) {
    throw badRequest('title must be a non-empty string')
  }

  if (!Array.isArray(phrases) || phrases.length === 0) {
    throw badRequest('phrases must be a non-empty array of strings')
  }

  const sanitizedPhrases = phrases
    .map((phrase) => (typeof phrase === 'string' ? phrase.trim() : ''))
    .filter(Boolean)

  if (sanitizedPhrases.length === 0) {
    throw badRequest('phrases must contain at least one non-empty string')
  }

  return {
    title: title.trim(),
    phrases: sanitizedPhrases,
  }
}

function parseGenreInput(body: unknown): string {
  if (typeof body !== 'object' || body === null) {
    throw badRequest('Body must be an object')
  }

  const { genre } = body as Record<string, unknown>

  if (typeof genre !== 'string' || !genre.trim()) {
    throw badRequest('genre must be a non-empty string')
  }

  return genre.trim()
}

function createUniqueCode(): string {
  let code = ''

  do {
    code = generateCode()
  } while (phraseSets.has(code))

  return code
}

function generateCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(length)
  const chars = Array.from(bytes).map((byte) => alphabet[byte % alphabet.length])

  return chars.join('')
}

function badRequest(message: string) {
  const error = new Error(message)
  ;(error as Error & { status?: number }).status = 400
  return error
}

function notFoundMiddleware(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' })
}

function errorMiddleware(
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.status && err.status >= 400 ? err.status : 500
  res.status(status).json({ error: err.message || 'Unexpected error' })
}

type SuggestionTemplate = {
  keywords: string[]
  phrases: string[]
}

const SUGGESTION_TEMPLATES: SuggestionTemplate[] = loadSuggestionTemplates()

const FALLBACK_NOUNS = [
  'brainstorm',
  'coffee run',
  'surprise moment',
  'inside joke',
  'photo op',
  'group selfie',
  'awkward pause',
  'celebration cheer',
  'playlist swap',
  'dance break',
  'story time',
  'confetti toss',
  'snack break',
  'new idea',
  'high five',
  'laughter burst',
  'quick poll',
  'cheer moment',
  'unexpected cameo',
  'shout-out',
  'side quest',
  'channel check',
  'group hug',
  'mic drop',
  'energy boost',
  'inside reference',
  'photo bomb',
  'happy accident',
  'bonus round',
  'victory lap',
]

const FALLBACK_PREFIXES = [
  'impromptu',
  'unexpected',
  'classic',
  'legendary',
  'unplanned',
  'hilarious',
  'wholesome',
  'crowd-favorite',
  'last-minute',
  'surprise',
  'serendipitous',
  'off-script',
  'unrehearsed',
  'spur-of-the-moment',
  'blink-and-miss',
  'camera-ready',
  'playlist-worthy',
  'memeable',
  'overheard',
  'chaotic-good',
  'viral-ready',
  'unscripted',
  'backstage',
  'legend-in-the-making',
  'righteous',
]

function generatePhraseSuggestions(rawGenre: string): string[] {
  const normalized = rawGenre.toLowerCase()
  const template = SUGGESTION_TEMPLATES.find((t) =>
    t.keywords.some((keyword) => normalized.includes(keyword))
  )

  const base = template ? template.phrases : []
  const blended = base.concat(generateFallbackPhrases(normalized))
  return ensureMinimumPhrases(blended, normalized, 30)
}

function generateFallbackPhrases(normalizedGenre: string): string[] {
  const combined: string[] = []

  for (let i = 0; i < FALLBACK_NOUNS.length; i++) {
    const prefix = shuffle(FALLBACK_PREFIXES)[i % FALLBACK_PREFIXES.length]
    const noun = FALLBACK_NOUNS[i]
    combined.push(`${prefix} ${noun}`)
  }

  // sprinkle genre keyword variants to keep it on-theme
  if (normalizedGenre) {
    combined.push(`${normalizedGenre} highlight`)
    combined.push(`${normalizedGenre} mishap`)
    combined.push(`${normalizedGenre} inside joke`)
  }

  return shuffle(combined)
}

function ensureMinimumPhrases(seed: string[], normalizedGenre: string, minimum: number): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const phrase of seed) {
    if (!phrase || seen.has(phrase)) continue
    seen.add(phrase)
    result.push(phrase)
    if (result.length >= minimum) return result.slice(0, minimum)
  }

  const fillers = buildFallbackCombos(normalizedGenre)
  for (const phrase of fillers) {
    if (seen.has(phrase)) continue
    seen.add(phrase)
    result.push(phrase)
    if (result.length >= minimum) break
  }

  return result.slice(0, minimum)
}

function buildFallbackCombos(normalizedGenre: string): string[] {
  const combos: string[] = []
  const prefixes = shuffle([...FALLBACK_PREFIXES])
  const nouns = shuffle([...FALLBACK_NOUNS])

  for (const prefix of prefixes) {
    for (const noun of nouns) {
      combos.push(`${prefix} ${noun}`)
    }
  }

  if (normalizedGenre) {
    combos.push(`${normalizedGenre} story`)
    combos.push(`${normalizedGenre} cameo`)
    combos.push(`${normalizedGenre} tradition`)
    combos.push(`${normalizedGenre} remix`)
  }

  return shuffle(combos)
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function loadSuggestionTemplates(): SuggestionTemplate[] {
  const suggestionsDir = path.resolve(process.cwd(), 'src', 'suggestions')
  if (!fs.existsSync(suggestionsDir)) {
    return []
  }

  return fs
    .readdirSync(suggestionsDir)
    .filter((file) => file.endsWith('.json') && file !== 'fallback.json')
    .map((file) => {
      const fullPath = path.join(suggestionsDir, file)
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as SuggestionTemplate
      return data
    })
    .filter((template) => Array.isArray(template.keywords) && Array.isArray(template.phrases))
}
