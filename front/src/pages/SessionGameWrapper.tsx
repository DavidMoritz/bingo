import { useLoaderData } from '@tanstack/react-router'
import type { PlaySession } from '../types'
import GamePage from './Game'

export function SessionGameWrapper() {
  const session = useLoaderData({ from: '/session/$id' }) as PlaySession
  return <GamePage phraseSet={null} session={session} />
}

export default SessionGameWrapper
