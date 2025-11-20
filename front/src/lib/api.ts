import type { PhraseSet } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function createPhraseSet(input: {
  title: string
  phrases: string[]
  isPublic: boolean
  freeSpace: boolean
}): Promise<PhraseSet> {
  const response = await fetch(`${API_BASE}/phrase-sets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error((await safeError(response)) ?? 'Failed to create phrase set')
  }

  return response.json()
}

export async function fetchPhraseSet(code: string): Promise<PhraseSet> {
  const response = await fetch(`${API_BASE}/phrase-sets/${encodeURIComponent(code)}`)

  if (!response.ok) {
    throw new Error((await safeError(response)) ?? 'Phrase set not found')
  }

  return response.json()
}

export async function fetchPublicPhraseSets(query: string): Promise<PhraseSet[]> {
  const url = new URL(`${API_BASE}/phrase-sets/public`)
  if (query.trim()) {
    url.searchParams.set('q', query.trim())
  }

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error((await safeError(response)) ?? 'Failed to load public phrase sets')
  }

  const data = (await response.json()) as { items?: PhraseSet[] }
  if (!Array.isArray(data.items)) return []
  return data.items
}

export async function ratePhraseSet(code: string, rating: number): Promise<PhraseSet> {
  const response = await fetch(`${API_BASE}/phrase-sets/${encodeURIComponent(code)}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating }),
  })

  if (!response.ok) {
    throw new Error((await safeError(response)) ?? 'Failed to submit rating')
  }

  return response.json()
}

export async function suggestPhrases(genre: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/phrase-suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ genre }),
  })

  if (!response.ok) {
    throw new Error((await safeError(response)) ?? 'Failed to suggest phrases')
  }

  const data = (await response.json()) as { phrases?: string[] }
  if (!data.phrases || !Array.isArray(data.phrases)) {
    throw new Error('Unexpected suggestion response')
  }

  return data.phrases
}

async function safeError(response: Response): Promise<string | null> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string') return data.error
  } catch {
    // ignore parse errors
  }
  return null
}
