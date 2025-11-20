import type { BingoBoard, BingoCell, PhraseSet } from '../types'

const GRID_SIZE = 5
const CENTER_INDEX = Math.floor((GRID_SIZE * GRID_SIZE) / 2)

export function createBingoBoard(phraseSet: PhraseSet, useFreeCenter = true): BingoBoard {
  const parsed = phraseSet.phrases
    .map(parsePhrase)
    .filter((item): item is ParsedPhrase => Boolean(item && item.text.trim().length > 0))

  const priorityPhrases = parsed
    .filter((p) => p.priority)
    .map((p) => p.text)
  const regularPhrases = parsed
    .filter((p) => !p.priority)
    .map((p) => p.text)

  const needed = useFreeCenter ? GRID_SIZE * GRID_SIZE - 1 : GRID_SIZE * GRID_SIZE
  const pool = [...shuffle(priorityPhrases), ...shuffle(regularPhrases)]
  const unique = Array.from(new Set(pool))
  const selectedPhrases = unique.slice(0, needed)

  const cells: BingoCell[] = []
  let phraseIndex = 0

  for (let index = 0; index < GRID_SIZE * GRID_SIZE; index++) {
    if (useFreeCenter && index === CENTER_INDEX) {
      cells.push({
        id: `cell-${index}`,
        text: 'FREE',
        selected: true,
        isFree: true,
      })
      continue
    }

    cells.push({
      id: `cell-${index}`,
      text: selectedPhrases[phraseIndex++] ?? '',
      selected: false,
    })
  }

  return {
    code: phraseSet.code,
    title: phraseSet.title,
    cells,
  }
}

export function toggleCell(board: BingoBoard, cellId: string): BingoBoard {
  return {
    ...board,
    cells: board.cells.map((cell) =>
      cell.id === cellId && !cell.isFree ? { ...cell, selected: !cell.selected } : cell
    ),
  }
}

type ParsedPhrase = {
  text: string
  priority: boolean
}

function parsePhrase(raw: string): ParsedPhrase | null {
  let text = raw.trim()
  if (!text) return null

  let priority = false
  if (text.startsWith('*')) {
    priority = true
    text = text.slice(1).trim()
  }

  const options = text
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)

  if (options.length === 0) return null

  const choice = options.length === 1 ? options[0] : options[Math.floor(Math.random() * options.length)]

  return { text: choice, priority }
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
