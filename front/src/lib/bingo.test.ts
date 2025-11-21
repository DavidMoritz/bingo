import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createBingoBoard } from './bingo'
import type { PhraseSet } from '../types'

const baseSet: PhraseSet = {
  code: 'TEST',
  title: 'Test Board',
  phrases: [],
  createdAt: new Date().toISOString(),
  isPublic: false,
  freeSpace: true,
  ratingAverage: 0,
  ratingCount: 0,
  ratingTotal: 0,
  ownerProfileId: 'tester',
}

function makeSet(phrases: string[], freeSpace = true): PhraseSet {
  return { ...baseSet, phrases, freeSpace }
}

describe('createBingoBoard grid sizing', () => {
  it('uses 1x1 when fewer than 4 phrases', () => {
    const board = createBingoBoard(makeSet(['one', 'two', 'three']))
    expect(board.gridSize).toBe(1)
    expect(board.cells).toHaveLength(1)
    expect(board.usesFreeCenter).toBe(false)
  })

  it('uses 2x2 when 4-8 phrases', () => {
    const board = createBingoBoard(makeSet(['a', 'b', 'c', 'd', 'e']))
    expect(board.gridSize).toBe(2)
    expect(board.cells).toHaveLength(4)
  })

  it('uses 3x3 when 9-15 phrases', () => {
    const board = createBingoBoard(makeSet(Array.from({ length: 10 }, (_, i) => `p${i}`)))
    expect(board.gridSize).toBe(3)
    expect(board.cells).toHaveLength(9)
  })

  it('uses 4x4 when 16-23 phrases', () => {
    const board = createBingoBoard(makeSet(Array.from({ length: 18 }, (_, i) => `p${i}`)))
    expect(board.gridSize).toBe(4)
    expect(board.cells).toHaveLength(16)
    expect(board.usesFreeCenter).toBe(false)
  })

  it('uses 5x5 and free center for 24+ phrases', () => {
    const board = createBingoBoard(makeSet(Array.from({ length: 30 }, (_, i) => `p${i}`)))
    expect(board.gridSize).toBe(5)
    expect(board.cells).toHaveLength(25)
    expect(board.usesFreeCenter).toBe(true)
    const centerIndex = Math.floor((25) / 2)
    expect(board.cells[centerIndex]?.isFree).toBe(true)
  })
})

describe('createBingoBoard phrase handling', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  it('picks one option when phrase uses OR', () => {
    const board = createBingoBoard(makeSet(['A | B']))
    expect(board.cells[0]?.text).toBe('A')
  })

  it('keeps priority phrases and shuffles them in', () => {
    const board = createBingoBoard(makeSet(['*Priority', 'one', 'two', 'three']))
    const texts = board.cells.map((c) => c.text)
    expect(texts).toContain('Priority')
  })

  it('does not insert free center on smaller grids even if freeSpace true', () => {
    const board = createBingoBoard(makeSet(['a', 'b', 'c']))
    expect(board.usesFreeCenter).toBe(false)
    expect(board.cells.some((c) => c.isFree)).toBe(false)
  })
})
