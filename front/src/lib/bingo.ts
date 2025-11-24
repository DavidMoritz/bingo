import type { BingoBoard, BingoCell, PhraseSet } from '../types'

export function createBingoBoard(phraseSet: PhraseSet, useFreeCenter = true): BingoBoard {
  const parsed = phraseSet.phrases
    .map(parsePhrase)
    .filter((item): item is ParsedPhrase => Boolean(item && item.text.trim().length > 0))

  const gridSize = pickGridSize(parsed.length)
  const allowFreeCenter = useFreeCenter && gridSize === 5
  const cellsNeeded = gridSize * gridSize - (allowFreeCenter ? 1 : 0)

  const priorityPhrases = parsed
    .filter((p) => p.priority)
    .map((p) => p.text)
  const regularPhrases = parsed
    .filter((p) => !p.priority)
    .map((p) => p.text)

  // Deduplicate priority and regular phrases separately
  const uniquePriority = Array.from(new Set(priorityPhrases))
  const uniqueRegular = Array.from(new Set(regularPhrases))

  // Shuffle regular phrases BEFORE selecting
  const shuffledRegular = shuffle(uniqueRegular)

  // Combine: all priority phrases + shuffled regular phrases
  const pool = [...uniquePriority, ...shuffledRegular]

  // Take only what we need from the pool
  const selected = pool.slice(0, cellsNeeded)

  // Pad with empty strings if needed
  while (selected.length < cellsNeeded) {
    selected.push('')
  }

  // Shuffle the final selection for board placement
  const selectedPhrases = shuffle(selected)

  const cells: BingoCell[] = []
  let phraseIndex = 0
  const centerIndex = Math.floor((gridSize * gridSize) / 2)

  for (let index = 0; index < gridSize * gridSize; index++) {
    if (allowFreeCenter && index === centerIndex) {
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
    gridSize,
    usesFreeCenter: allowFreeCenter,
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

function pickGridSize(phraseCount: number): number {
  if (phraseCount < 4) return 1
  if (phraseCount < 9) return 2
  if (phraseCount < 16) return 3
  if (phraseCount < 24) return 4
  return 5
}
