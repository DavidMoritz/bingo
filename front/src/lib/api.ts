import type { PhraseSet } from '../types'
import type { PlaySession } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function createPhraseSet(input: {
  title: string
  phrases: string[]
  isPublic: boolean
  freeSpace: boolean
  ownerProfileId: string
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

export async function fetchMyPhraseSets(ownerProfileId: string): Promise<PhraseSet[]> {
  const url = new URL(`${API_BASE}/phrase-sets`)
  url.searchParams.set('owner', ownerProfileId)
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error((await safeError(response)) ?? 'Failed to load phrase sets')
  }
  const data = (await response.json()) as { items?: PhraseSet[] }
  return data.items ?? []
}

export async function updatePhraseSet(
  code: string,
  input: {
    title: string
    phrases: string[]
    isPublic: boolean
    freeSpace: boolean
    ownerProfileId: string
  }
): Promise<PhraseSet> {
  const response = await fetch(`${API_BASE}/phrase-sets/${encodeURIComponent(code)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw new Error((await safeError(response)) ?? 'Failed to update phrase set')
  }
  return response.json()
}

export async function claimOwnership(code: string, ownerProfileId: string): Promise<PhraseSet> {
  const response = await fetch(`${API_BASE}/phrase-sets/${encodeURIComponent(code)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerProfileId }),
  })
  if (!response.ok) {
    throw new Error((await safeError(response)) ?? 'Failed to claim ownership')
  }
  return response.json()
}

export async function orphanPhraseSet(code: string, ownerProfileId: string): Promise<PhraseSet> {
  const response = await fetch(`${API_BASE}/phrase-sets/${encodeURIComponent(code)}/orphan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerProfileId }),
  })
  if (!response.ok) {
    throw new Error((await safeError(response)) ?? 'Failed to remove from profile')
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

export async function createPlaySession(input: {
  profileId: string
  phraseSetCode: string
  phraseSetTitle?: string
  gridSize: number
  usesFreeCenter: boolean
  boardSnapshot: { text: string; isFree?: boolean }[]
  checkedCells: number[]
}): Promise<PlaySession> {
  const response = await fetch(`${API_BASE}/play-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw new Error((await safeError(response)) ?? 'Failed to create session')
  }
  return response.json()
}

export async function updatePlaySessionChecked(
  id: string,
  input: { profileId: string; checkedCells: number[] }
): Promise<PlaySession> {
  const response = await fetch(`${API_BASE}/play-sessions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw new Error((await safeError(response)) ?? 'Failed to update session')
  }
  return response.json()
}

export async function fetchPlaySession(id: string): Promise<PlaySession> {
  const response = await fetch(`${API_BASE}/play-sessions/${encodeURIComponent(id)}`)
  if (!response.ok) {
    throw new Error((await safeError(response)) ?? 'Session not found')
  }
  return response.json()
}

export async function fetchMySessions(profileId: string): Promise<PlaySession[]> {
  const url = new URL(`${API_BASE}/play-sessions`)
  url.searchParams.set('profileId', profileId)
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error((await safeError(response)) ?? 'Failed to load sessions')
  }
  const data = (await response.json()) as { items?: PlaySession[] }
  return data.items ?? []
}
