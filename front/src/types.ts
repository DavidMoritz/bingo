export type PhraseSet = {
  code: string
  title: string
  phrases: string[]
  createdAt: string
  isPublic: boolean
  freeSpace: boolean
  ratingTotal: number
  ratingCount: number
  ratingAverage: number
  ownerProfileId: string
  ownerDisplayName?: string
}

export type BingoCell = {
  id: string
  text: string
  selected: boolean
  isFree?: boolean
}

export type BingoBoard = {
  code: string
  title: string
  gridSize: number
  usesFreeCenter: boolean
  cells: BingoCell[]
}

export type PlaySession = {
  id: string
  profileId: string
  phraseSetCode: string
  phraseSetTitle?: string
  gridSize: number
  usesFreeCenter: boolean
  boardSnapshot: { text: string; isFree?: boolean }[]
  checkedCells: number[]
  notes?: string
  createdAt: string
}
