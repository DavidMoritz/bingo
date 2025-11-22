import { useLoaderData } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { PlaySession } from '../types'
import GamePage from './Game'
import { fetchPhraseSet } from '../lib/api'

export function SessionGameWrapper() {
  const session = useLoaderData({ from: '/session/$id' }) as PlaySession

  const { data: phraseSet, isLoading } = useQuery({
    queryKey: ['phrase-set', session.phraseSetCode],
    queryFn: () => fetchPhraseSet(session.phraseSetCode),
  })

  if (isLoading) {
    return <p className="text-slate-200">Loading phrase set...</p>
  }

  return <GamePage phraseSet={phraseSet ?? null} session={session} />
}

export default SessionGameWrapper
