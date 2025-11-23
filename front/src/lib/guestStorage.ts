/**
 * Utilities for managing guest player game state in LocalStorage
 */

export type GuestGameState = {
  code: string
  title: string
  gridSize: number
  usesFreeCenter: boolean
  boardSnapshot: { text: string; isFree?: boolean }[]
  checkedCells: number[]
  lastUpdated: string // ISO timestamp
}

const STORAGE_KEY = 'bingo_guest_game'

/**
 * Save guest game state to LocalStorage
 */
export function saveGuestGameState(state: GuestGameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save guest game state:', error)
  }
}

/**
 * Load guest game state from LocalStorage
 */
export function loadGuestGameState(): GuestGameState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as GuestGameState
  } catch (error) {
    console.error('Failed to load guest game state:', error)
    return null
  }
}

/**
 * Clear guest game state from LocalStorage
 */
export function clearGuestGameState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear guest game state:', error)
  }
}

/**
 * Check if there's a guest game state for a specific code
 */
export function hasGuestGameState(code?: string): boolean {
  const state = loadGuestGameState()
  if (!state) return false
  if (!code) return true
  return state.code.toLowerCase() === code.toLowerCase()
}
