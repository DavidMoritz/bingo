import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export type PhraseSet = {
  code: string
  title: string
  phrases: string[]
  createdAt: string
  isPublic: boolean
  freeSpace: boolean
  ratingTotal: number
  ratingCount: number
  ratingAverage: number
  ownerProfileId: string
}

export type PhraseSetInput = {
  title: string
  phrases: string[]
  isPublic: boolean
  freeSpace: boolean
  ratingTotal: number
  ratingCount: number
  ratingAverage: number
  ownerProfileId: string
  code?: string
}

type PhraseSuggestionResponse = {
  genre: string
  phrases: string[]
}

type PublicPhraseSetResponse = {
  items: PhraseSet[]
}

export function buildApp() {
  const app = express()

  // Very small, in-memory data store. Replace with a DB for persistence.
  const phraseSets = new Map<string, PhraseSet>()

  app.use(cors())
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.post('/phrase-sets', (req, res, next) => {
    try {
      const { title, phrases, isPublic, freeSpace, ownerProfileId } = parsePhraseSetInput(req.body)

      const code = createUniqueCode(phraseSets)
      const phraseSet: PhraseSet = {
        code,
        title,
        phrases,
        createdAt: new Date().toISOString(),
        isPublic,
        freeSpace,
        ratingTotal: 0,
        ratingCount: 0,
        ratingAverage: 0,
        ownerProfileId,
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

  app.get('/phrase-sets', (req, res) => {
    const owner = req.query.owner ? String(req.query.owner) : null
    const items = Array.from(phraseSets.values()).filter((set) =>
      owner ? set.ownerProfileId === owner : true
    )
    res.json({ items })
  })

  app.get('/phrase-sets/:code', (req, res) => {
    const code = String(req.params.code || '').toUpperCase()
    const phraseSet = phraseSets.get(code)

    if (!phraseSet) {
      return res.status(404).json({ error: 'Phrase set not found' })
    }

    res.json(phraseSet)
  })

  app.put('/phrase-sets/:code', (req, res) => {
    const code = String(req.params.code || '').toUpperCase()
    const existing = phraseSets.get(code)

    if (!existing) {
      return res.status(404).json({ error: 'Phrase set not found' })
    }

    const { title, phrases, isPublic, freeSpace, ownerProfileId } = parsePhraseSetInput(req.body)

    if (ownerProfileId && existing.ownerProfileId && existing.ownerProfileId !== ownerProfileId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const updated: PhraseSet = {
      ...existing,
      title,
      phrases,
      isPublic,
      freeSpace,
    }

    phraseSets.set(code, updated)
    res.json(updated)
  })

  app.post('/phrase-sets/:code/rate', (req, res) => {
    const code = String(req.params.code || '').toUpperCase()
    const phraseSet = phraseSets.get(code)

    if (!phraseSet) {
      return res.status(404).json({ error: 'Phrase set not found' })
    }

    const rating = Number((req.body as { rating?: unknown })?.rating)
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' })
    }

    phraseSet.ratingTotal += rating
    phraseSet.ratingCount += 1
    phraseSet.ratingAverage = Number((phraseSet.ratingTotal / phraseSet.ratingCount).toFixed(2))
    phraseSets.set(code, phraseSet)

    res.json(phraseSet)
  })

  app.get('/phrase-sets/public', (req, res) => {
    const items = getPublicSets(String(req.query.q ?? ''), phraseSets)
    const response: PublicPhraseSetResponse = { items }
    res.json(response)
  })

  app.use(notFoundMiddleware)
  app.use(errorMiddleware)

  return {
    app,
    resetStore: () => phraseSets.clear(),
    getPublicSets: (query: string) => getPublicSets(query, phraseSets),
    createPhraseSetForTest: (input: PhraseSetInput) =>
      createPhraseSetRecord(input, phraseSets, input.code ?? createUniqueCode(phraseSets)),
  }
}

// --- helpers ---

function parsePhraseSetInput(body: unknown): PhraseSetInput {
  if (typeof body !== 'object' || body === null) {
    throw badRequest('Body must be an object')
  }

  const { title, phrases, isPublic, freeSpace, ownerProfileId } = body as Record<string, unknown>

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
    isPublic: Boolean(isPublic),
    freeSpace: freeSpace === false ? false : true,
    ratingTotal: 0,
    ratingCount: 0,
    ratingAverage: 0,
    ownerProfileId: typeof ownerProfileId === 'string' && ownerProfileId.trim() ? ownerProfileId.trim() : 'guest',
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

function createUniqueCode(store: Map<string, PhraseSet>): string {
  let code = ''

  do {
    code = generateCode()
  } while (store.has(code))

  return code
}

function createPhraseSetRecord(
  input: PhraseSetInput,
  store: Map<string, PhraseSet>,
  code: string
): PhraseSet {
  const phraseSet: PhraseSet = {
    code,
    title: input.title,
    phrases: input.phrases,
    createdAt: new Date().toISOString(),
    isPublic: input.isPublic,
    freeSpace: input.freeSpace,
    ratingTotal: input.ratingTotal ?? 0,
    ratingCount: input.ratingCount ?? 0,
    ratingAverage: input.ratingAverage ?? 0,
    ownerProfileId: input.ownerProfileId,
  }
  store.set(code, phraseSet)
  return phraseSet
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
  'unexpectedly wholesome',
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
  const prefixes = shuffle([...FALLBACK_PREFIXES])
  const nouns = shuffle([...FALLBACK_NOUNS])

  for (const prefix of prefixes) {
    for (const noun of nouns) {
      combined.push(`${prefix} ${noun}`)
    }
  }

  if (normalizedGenre) {
    combined.push(`${normalizedGenre} story`)
    combined.push(`${normalizedGenre} cameo`)
    combined.push(`${normalizedGenre} tradition`)
    combined.push(`${normalizedGenre} remix`)
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

function getPublicSets(query: string, store: Map<string, PhraseSet>): PhraseSet[] {
  const term = query.trim().toLowerCase()
  return Array.from(store.values())
    .filter((set) => set.isPublic)
    .filter((set) => {
      if (!term) return true
      const haystack = `${set.title} ${set.code} ${set.phrases.join(' ')}`.toLowerCase()
      return haystack.includes(term)
    })
    .sort((a, b) => {
      const aScore = a.ratingAverage || 0
      const bScore = b.ratingAverage || 0
      if (bScore !== aScore) return bScore - aScore
      return b.createdAt.localeCompare(a.createdAt)
    })
    .slice(0, 30)
}
