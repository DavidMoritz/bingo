import { describe, expect, it, beforeEach, vi } from 'vitest'
import { saveGuestGameState, loadGuestGameState, clearGuestGameState } from './guestStorage'
import type { GuestGameState } from './guestStorage'

describe('Guest Storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and loads guest game state', () => {
    const gameState: GuestGameState = {
      code: 'ABC123',
      title: 'Test Game',
      gridSize: 5,
      usesFreeCenter: true,
      boardSnapshot: [
        { text: 'Phrase 1', isFree: false },
        { text: 'Phrase 2', isFree: false },
        { text: 'FREE', isFree: true },
      ],
      checkedCells: [0, 2],
      lastUpdated: new Date().toISOString(),
    }

    saveGuestGameState(gameState)
    const loaded = loadGuestGameState()

    expect(loaded).toEqual(gameState)
  })

  it('returns null when no guest game state exists', () => {
    const loaded = loadGuestGameState()
    expect(loaded).toBeNull()
  })

  it('clears guest game state', () => {
    const gameState: GuestGameState = {
      code: 'XYZ789',
      title: 'Clear Test',
      gridSize: 3,
      usesFreeCenter: false,
      boardSnapshot: [{ text: 'Test', isFree: false }],
      checkedCells: [],
      lastUpdated: new Date().toISOString(),
    }

    saveGuestGameState(gameState)
    expect(loadGuestGameState()).not.toBeNull()

    clearGuestGameState()
    expect(loadGuestGameState()).toBeNull()
  })

  it('handles invalid JSON in localStorage', () => {
    localStorage.setItem('bingo-guest-game', 'invalid json{]')
    const loaded = loadGuestGameState()
    expect(loaded).toBeNull()
  })

  it('updates existing game state', () => {
    const initial: GuestGameState = {
      code: 'TEST',
      title: 'Initial',
      gridSize: 5,
      usesFreeCenter: true,
      boardSnapshot: [],
      checkedCells: [0],
      lastUpdated: '2024-01-01T00:00:00Z',
    }

    saveGuestGameState(initial)

    const updated: GuestGameState = {
      ...initial,
      checkedCells: [0, 1, 2],
      lastUpdated: '2024-01-01T00:01:00Z',
    }

    saveGuestGameState(updated)
    const loaded = loadGuestGameState()

    expect(loaded?.checkedCells).toEqual([0, 1, 2])
    expect(loaded?.lastUpdated).toBe('2024-01-01T00:01:00Z')
  })
})
