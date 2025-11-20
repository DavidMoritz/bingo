import type { BingoBoard, BingoCell, PhraseSet } from '../types'

const GRID_SIZE = 5
const CENTER_INDEX = Math.floor((GRID_SIZE * GRID_SIZE) / 2)

export function createBingoBoard(phraseSet: PhraseSet, useFreeCenter = true): BingoBoard {
  const shuffled = [...phraseSet.phrases].sort(() => Math.random() - 0.5)
  const needed = useFreeCenter ? GRID_SIZE * GRID_SIZE - 1 : GRID_SIZE * GRID_SIZE
  const selectedPhrases = shuffled.slice(0, needed)

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
