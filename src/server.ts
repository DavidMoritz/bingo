import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import crypto from 'crypto'

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
