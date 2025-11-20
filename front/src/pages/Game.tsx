import { useMemo, useState } from 'react'
import { createBingoBoard, toggleCell } from '../lib/bingo'
import type { BingoBoard, PhraseSet } from '../types'

type GamePageProps = {
  phraseSet: PhraseSet
}

export function GamePage({ phraseSet }: GamePageProps) {
  const [board, setBoard] = useState<BingoBoard>(() => createBingoBoard(phraseSet, phraseSet.freeSpace))

  const selectedCount = useMemo(() => board.cells.filter((c) => c.selected).length, [board])

  function handleCellClick(cellId: string) {
    setBoard((current) => toggleCell(current, cellId))
  }

  function reshuffle() {
    setBoard(createBingoBoard(phraseSet, phraseSet.freeSpace))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Game</p>
          <h2 className="text-3xl font-bold text-white">{phraseSet.title}</h2>
          <p className="text-sm text-slate-300">
            Code <span className="font-mono text-white">{phraseSet.code}</span> ·{' '}
            {phraseSet.phrases.length} phrases · {selectedCount} selected
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={reshuffle}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            New shuffle
          </button>
        </div>
      </header>

      <div className="grid grid-cols-5 gap-2 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/40">
        {board.cells.map((cell) => (
          <button
            key={cell.id}
            onClick={() => handleCellClick(cell.id)}
            className={`flex min-h-[90px] items-center justify-center rounded-2xl border px-2 py-3 text-center text-sm font-semibold transition ${
              cell.selected
                ? 'border-teal-300 bg-teal-400 text-slate-950 shadow-lg shadow-teal-400/40'
                : 'border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10'
            } ${cell.isFree ? 'ring-2 ring-amber-300/70' : ''}`}
          >
            {cell.text || '…'}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Phrases</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {phraseSet.phrases.map((p, idx) => (
            <div
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-200"
              key={`${p}-${idx}`}
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GamePage
