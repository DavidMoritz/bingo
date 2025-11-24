import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import type { PhraseSet, PlaySession } from '../types'
import outputs from '../../../amplify_outputs.json'
import { contentHasProfanity } from './profanity'

let dataClient: any

function generateCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const chars: string[] = []
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)

  for (let i = 0; i < length; i++) {
    chars.push(alphabet[array[i] % alphabet.length])
  }

  return chars.join('')
}

function getDataClient() {
  if (dataClient) return dataClient
  Amplify.configure(outputs as any)
  const client = generateClient<any>({
    authMode: 'apiKey',
  })
  dataClient = client as any
  return dataClient
}


export async function createPhraseSet(input: {
  title: string
  phrases: string[]
  isPublic: boolean
  freeSpace: boolean
  ownerProfileId: string
  ownerDisplayName?: string
}): Promise<PhraseSet> {
  const client = getDataClient()
  const code = generateCode()

  // Server-side profanity enforcement: Force private if profanity detected
  // NOTE: This is client-side validation. For true server-side validation,
  // implement custom resolvers or Lambda functions in Amplify backend.
  const hasProfanity = contentHasProfanity(input.title, input.phrases)
  const sanitizedInput = {
    ...input,
    isPublic: hasProfanity ? false : input.isPublic,
  }

  const res = await client.models.PhraseSet.create({
    code,
    ...sanitizedInput,
    ratingTotal: 0,
    ratingCount: 0,
    ratingAverage: 0,
  })
  console.log('createPhraseSet response:', res);
  if (!res?.data) throw new Error('Failed to create phrase set')
  return res.data as PhraseSet
}

export async function fetchPhraseSet(code: string): Promise<PhraseSet> {
  const client = getDataClient()
  const res = await client.models.PhraseSet.get({ code })
  if (!res?.data) throw new Error('Phrase set not found')
  return res.data as PhraseSet
}

export async function fetchMyPhraseSets(ownerProfileId: string): Promise<PhraseSet[]> {
  const client = getDataClient()
  const res = await client.models.PhraseSet.list({
    filter: ownerProfileId ? { ownerProfileId: { eq: ownerProfileId } } : undefined,
  })
  return (res?.data as PhraseSet[]) ?? []
}

export async function updatePhraseSet(
  code: string,
  input: {
    title: string
    phrases: string[]
    isPublic: boolean
    freeSpace: boolean
    ownerProfileId: string
    ownerDisplayName?: string
  }
): Promise<PhraseSet> {
  const client = getDataClient()

  // Server-side profanity enforcement: Force private if profanity detected
  // NOTE: This is client-side validation. For true server-side validation,
  // implement custom resolvers or Lambda functions in Amplify backend.
  const hasProfanity = contentHasProfanity(input.title, input.phrases)
  const sanitizedInput = {
    ...input,
    isPublic: hasProfanity ? false : input.isPublic,
  }

  const res = await client.models.PhraseSet.update({ code, ...sanitizedInput })
  if (!res?.data) throw new Error('Failed to update phrase set')
  return res.data as PhraseSet
}

export async function claimOwnership(code: string, ownerProfileId: string, ownerDisplayName?: string): Promise<PhraseSet> {
  const client = getDataClient()
  const res = await client.models.PhraseSet.update({
    code,
    ownerProfileId,
    ownerDisplayName: ownerDisplayName || undefined,
  })
  if (!res?.data) throw new Error('Failed to claim ownership')
  return res.data as PhraseSet
}

export async function orphanPhraseSet(code: string, _ownerProfileId: string): Promise<PhraseSet> {
  const client = getDataClient()
  const res = await client.models.PhraseSet.update({ code, ownerProfileId: 'guest', ownerDisplayName: 'guest' })
  if (!res?.data) throw new Error('Failed to remove from profile')
  return res.data as PhraseSet
}

export const sortSetsByBayesianScore = (sets: PhraseSet[]): PhraseSet[] => {
  // 1. Calculate global average rating 'm'
  const ratedSets = sets.filter((s) => s.ratingCount > 0)

  // If no sets are rated, return original order as we can't calculate a meaningful average.
  if (ratedSets.length === 0) {
    return sets
  }

  const totalRatingsSum = ratedSets.reduce((sum, s) => sum + s.ratingAverage, 0)
  const m = totalRatingsSum / ratedSets.length // prior mean

  // 2. Define the "confidence" constant 'C'. This represents the weight of the prior.
  // A good starting point is the average number of ratings, but a fixed value is simpler.
  const C = 5 // prior weight

  // 3. Calculate score for each set and sort
  const sortedSets = [...sets]
    .map((set) => {
      // For sets with 0 ratings, their score will be pulled towards the prior mean 'm'.
      const score = (C * m + set.ratingTotal) / (C + set.ratingCount)
      return { ...set, bayesianScore: score }
    })
    .sort((a, b) => b.bayesianScore - a.bayesianScore)

  return sortedSets
}

export async function fetchPublicPhraseSets(query: string): Promise<PhraseSet[]> {
  const client = getDataClient()

  // Fetch all public phrase sets
  const filter = { isPublic: { eq: true } }
  const res = await client.models.PhraseSet.list({ filter })
  const allPublicSets = (res?.data as PhraseSet[]) ?? []

  // Filter sets based on query if it exists
  const queryFilteredSets = !query.trim()
    ? allPublicSets
    : allPublicSets.filter((set) => {
        const lowerQuery = query.trim().toLowerCase()
        const lowerTitle = set.title.toLowerCase()
        const lowerCode = set.code.toLowerCase()
        const hasMatchingPhrase = set.phrases.some((phrase) => phrase.toLowerCase().includes(lowerQuery))
        return lowerTitle.includes(lowerQuery) || lowerCode.includes(lowerQuery) || hasMatchingPhrase
      })

  // Filter out sets with explicit content
  const cleanSets = queryFilteredSets.filter((set) => !contentHasProfanity(set.title, set.phrases))

  // Sort the resulting sets by the Bayesian score
  return sortSetsByBayesianScore(cleanSets)
}

export async function fetchUserRating(profileId: string, phraseSetCode: string): Promise<{ id: string; ratingValue: number } | null> {
  const client = getDataClient()
  const res = await client.models.Rating.list({
    filter: {
      profileId: { eq: profileId },
      phraseSetCode: { eq: phraseSetCode },
    },
  })

  const ratings = res?.data ?? []
  return ratings.length > 0 ? { id: ratings[0].id, ratingValue: ratings[0].ratingValue } : null
}

export async function submitRating(
  profileId: string,
  phraseSetCode: string,
  ratingValue: number,
  sessionId?: string
): Promise<PhraseSet> {
  const client = getDataClient()
  const current = await fetchPhraseSet(phraseSetCode)
  const existingRating = await fetchUserRating(profileId, phraseSetCode)

  let ratingTotal: number
  let ratingCount: number

  if (existingRating) {
    // Update existing rating
    await client.models.Rating.update({
      id: existingRating.id,
      ratingValue,
      lastSessionId: sessionId,
    })
    // Adjust totals: remove old rating, add new rating
    ratingTotal = current.ratingTotal - existingRating.ratingValue + ratingValue
    ratingCount = current.ratingCount
  } else {
    // Create new rating
    await client.models.Rating.create({
      profileId,
      phraseSetCode,
      ratingValue,
      lastSessionId: sessionId,
    })
    // Add to totals
    ratingTotal = current.ratingTotal + ratingValue
    ratingCount = current.ratingCount + 1
  }

  const ratingAverage = Number((ratingTotal / ratingCount).toFixed(2))

  const res = await client.models.PhraseSet.update({
    code: phraseSetCode,
    title: current.title,
    phrases: current.phrases,
    isPublic: current.isPublic,
    freeSpace: current.freeSpace,
    ownerProfileId: current.ownerProfileId,
    ownerDisplayName: current.ownerDisplayName,
    ratingTotal,
    ratingCount,
    ratingAverage,
  })

  if (!res?.data) throw new Error('Failed to submit rating')
  return res.data as PhraseSet
}

export async function listAvailableGenres(): Promise<string[]> {
  const client = getDataClient()
  const res = await client.models.PhraseTemplate.list()
  const templates = res?.data ?? []
  return templates.map((t: { genre: string }) => t.genre).sort()
}

export async function suggestPhrases(genre: string): Promise<string[]> {
  const client = getDataClient()
  // Use first word only for matching
  const normalizedGenre = genre.trim().split(/\s+/)[0].toLowerCase()

  if (!normalizedGenre) {
    throw new Error('Please enter a genre keyword')
  }

  // Search for existing template by genre (case-insensitive match)
  const res = await client.models.PhraseTemplate.list({
    filter: {
      genre: { eq: normalizedGenre },
    },
  })

  const templates = res?.data ?? []

  if (templates.length > 0) {
    // Use existing template and increment usage count
    const template = templates[0]
    await client.models.PhraseTemplate.update({
      id: template.id,
      usageCount: (template.usageCount || 0) + 1,
    })
    return template.phrases
  }

  // No template found - generate using AI (if credits available)
  console.log(`No template found for "${normalizedGenre}", trying AI generation...`)

  try {
    const aiResult = await client.queries.generatePhrases({ genre: normalizedGenre })

    console.log('AI Result:', aiResult)

    if (!aiResult?.data) {
      console.error('Full AI result:', JSON.stringify(aiResult, null, 2))

      // Check if it's a billing/credit issue
      const errorMessage = aiResult?.errors?.[0]?.message || ''
      if (errorMessage.includes('400') || errorMessage.includes('insufficient')) {
        const availableGenres = await listAvailableGenres()
        throw new Error(
          `AI generation requires Anthropic API credits. Available templates: ${availableGenres.join(', ')}`
        )
      }

      throw new Error(`AI generation failed. Errors: ${JSON.stringify(aiResult?.errors)}`)
    }

    // Save the generated template for future use
    await client.models.PhraseTemplate.create({
      genre: aiResult.data.genre,
      phrases: aiResult.data.phrases,
      isAiGenerated: true,
      usageCount: 1,
    })

    console.log(`✓ Generated and cached ${aiResult.data.phrases.length} phrases for "${normalizedGenre}"`)
    return aiResult.data.phrases
  } catch (error) {
    console.error('AI generation failed:', error)
    // Fallback: show available genres
    const availableGenres = await listAvailableGenres()
    throw new Error(
      `Genre "${normalizedGenre}" not found. Available: ${availableGenres.join(', ')}`
    )
  }
}

export async function createPlaySession(input: {
  profileId: string
  phraseSetCode: string
  phraseSetTitle?: string
  gridSize: number
  usesFreeCenter: boolean
  boardSnapshot: { text: string; isFree?: boolean }[]
  checkedCells: number[]
  notes?: string
}): Promise<PlaySession> {
  const client = getDataClient()
  console.log('Creating PlaySession with input:', input)
  const res = await client.models.PlaySession.create({
    ...input,
    boardSnapshot: JSON.stringify(input.boardSnapshot),
  })
  console.log('PlaySession creation response:', res)
  if (!res?.data) throw new Error('Failed to create session')
  return res.data as PlaySession
}

export async function updatePlaySessionChecked(
  id: string,
  input: { profileId: string; checkedCells: number[] }
): Promise<PlaySession> {
  const client = getDataClient()
  const res = await client.models.PlaySession.update({
    id,
    profileId: input.profileId,
    checkedCells: input.checkedCells,
  })
  if (!res?.data) throw new Error('Failed to update session')
  return res.data as PlaySession
}

export async function updatePlaySession(
  id: string,
  input: {
    profileId: string
    gridSize?: number
    usesFreeCenter?: boolean
    boardSnapshot?: { text: string; isFree?: boolean }[]
    checkedCells?: number[]
    notes?: string
  }
): Promise<PlaySession> {
  const client = getDataClient()
  const updateData: any = {
    id,
    profileId: input.profileId,
  }

  if (input.gridSize !== undefined) updateData.gridSize = input.gridSize
  if (input.usesFreeCenter !== undefined) updateData.usesFreeCenter = input.usesFreeCenter
  if (input.boardSnapshot !== undefined) updateData.boardSnapshot = JSON.stringify(input.boardSnapshot)
  if (input.checkedCells !== undefined) updateData.checkedCells = input.checkedCells
  if (input.notes !== undefined) updateData.notes = input.notes

  const res = await client.models.PlaySession.update(updateData)
  if (!res?.data) throw new Error('Failed to update session')
  return res.data as PlaySession
}

function parsePlaySession(raw: any): PlaySession {
  return {
    ...raw,
    boardSnapshot: typeof raw.boardSnapshot === 'string'
      ? JSON.parse(raw.boardSnapshot)
      : raw.boardSnapshot,
    checkedCells: raw.checkedCells ?? [],
  }
}

export async function fetchPlaySession(id: string): Promise<PlaySession> {
  const client = getDataClient()
  const res = await client.models.PlaySession.get({ id })
  if (!res?.data) throw new Error('Session not found')
  return parsePlaySession(res.data)
}

export async function fetchMySessions(profileId: string): Promise<PlaySession[]> {
  const client = getDataClient()
  console.log('Fetching sessions for profileId:', profileId)
  const res = await client.models.PlaySession.list({
    filter: profileId ? { profileId: { eq: profileId } } : undefined,
  })
  console.log('fetchMySessions response:', res)
  const sessions = (res?.data?.map(parsePlaySession) as PlaySession[]) ?? []

  // Sort by createdAt descending (newest first)
  return sessions.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return dateB - dateA
  })
}
