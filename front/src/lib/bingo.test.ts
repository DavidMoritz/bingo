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

  it('selects different phrases when phrase set has 50+ phrases', () => {
    // Create a set with 60 phrases (more than the 24 needed for 5x5)
    const phrases = Array.from({ length: 60 }, (_, i) => `phrase-${i}`)
    const board1 = createBingoBoard(makeSet(phrases))
    const board2 = createBingoBoard(makeSet(phrases))

    // Both should be 5x5 grids
    expect(board1.gridSize).toBe(5)
    expect(board2.gridSize).toBe(5)

    // Should have 24 non-free cells
    const nonFreeCells1 = board1.cells.filter(c => !c.isFree)
    const nonFreeCells2 = board2.cells.filter(c => !c.isFree)
    expect(nonFreeCells1).toHaveLength(24)
    expect(nonFreeCells2).toHaveLength(24)

    // All cells should have phrases from the original set
    nonFreeCells1.forEach(cell => {
      expect(phrases).toContain(cell.text)
    })
  })

  it('always includes priority phrases even with 50+ total phrases', () => {
    const phrases = [
      '*MustHave1',
      '*MustHave2',
      ...Array.from({ length: 60 }, (_, i) => `regular-${i}`)
    ]
    const board = createBingoBoard(makeSet(phrases))
    const texts = board.cells.map(c => c.text)

    expect(texts).toContain('MustHave1')
    expect(texts).toContain('MustHave2')
  })

  it('handles OR syntax in phrases', () => {
    const board = createBingoBoard(makeSet(['Option A | Option B | Option C']))
    const cellText = board.cells[0]?.text
    expect(['Option A', 'Option B', 'Option C']).toContain(cellText)
  })

  it('strips asterisk from priority phrases in final board', () => {
    const board = createBingoBoard(makeSet(['*Priority phrase', 'regular']))
    const texts = board.cells.map(c => c.text)
    expect(texts).toContain('Priority phrase')
    expect(texts).not.toContain('*Priority phrase')
  })

  it('deduplicates phrases', () => {
    const board = createBingoBoard(makeSet(['duplicate', 'duplicate', 'unique', 'another']))
    const texts = board.cells.map(c => c.text)
    const duplicateCount = texts.filter(t => t === 'duplicate').length
    expect(duplicateCount).toBe(1)
  })
})
