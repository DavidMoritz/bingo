export type PhraseSet = {
  code: string
  title: string
  phrases: string[]
  createdAt: string
  isPublic: boolean
  freeSpace: boolean
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
  cells: BingoCell[]
}
