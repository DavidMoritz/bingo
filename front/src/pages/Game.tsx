import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createBingoBoard, toggleCell } from '../lib/bingo'
import { ratePhraseSet } from '../lib/api'
import type { BingoBoard, PhraseSet } from '../types'

type GamePageProps = {
  phraseSet: PhraseSet
}

export function GamePage({ phraseSet }: GamePageProps) {
  const [board, setBoard] = useState<BingoBoard>(() => createBingoBoard(phraseSet, phraseSet.freeSpace))
  const [currentSet, setCurrentSet] = useState<PhraseSet>(phraseSet)
  const [myRating, setMyRating] = useState<number | null>(null)
  const [hasRated, setHasRated] = useState(false)

  const selectedCount = useMemo(() => board.cells.filter((c) => c.selected).length, [board])

  function handleCellClick(cellId: string) {
    setBoard((current) => toggleCell(current, cellId))
  }

  function reshuffle() {
    setBoard(createBingoBoard(currentSet, currentSet.freeSpace))
  }

  const ratingMutation = useMutation({
    mutationFn: (rating: number) => ratePhraseSet(currentSet.code, rating),
    onSuccess: (updated) => {
      setCurrentSet(updated)
      setHasRated(true)
    },
  })

  function submitRating(value: number) {
    setMyRating(value)
    ratingMutation.mutate(value)
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
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-200">
            {hasRated ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-200">
                Thank you for your feedback!
              </span>
            ) : (
              <StarRating
                value={currentSet.ratingAverage}
                onRate={submitRating}
                userValue={myRating}
                disabled={ratingMutation.isPending}
              />
            )}
            <span className="text-xs text-slate-400">
              {currentSet.ratingAverage.toFixed(2)} ({currentSet.ratingCount} ratings)
            </span>
            {ratingMutation.isPending ? (
              <span className="text-xs text-slate-400">Submitting…</span>
            ) : ratingMutation.error ? (
              <span className="text-xs text-rose-300">Rating failed</span>
            ) : null}
          </div>
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

      <div
        className="grid gap-2 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/40"
        style={{ gridTemplateColumns: `repeat(${board.gridSize}, minmax(0, 1fr))` }}
      >
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

type StarRatingProps = {
  value: number
  userValue: number | null
  onRate: (value: number) => void
  disabled?: boolean
}

function StarRating({ value, userValue, onRate, disabled }: StarRatingProps) {
  const rounded = Math.round(value * 2) / 2

  return (
    <div className="flex items-center gap-1 text-amber-300">
      {Array.from({ length: 5 }).map((_, idx) => {
        const starValue = idx + 1
        const active = rounded >= starValue
        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onRate(starValue)}
            disabled={disabled}
            className={`h-6 w-6 rounded-full text-lg transition hover:scale-110 ${
              active || userValue === starValue ? 'text-amber-300' : 'text-slate-500'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            aria-label={`Rate ${starValue} star${starValue === 1 ? '' : 's'}`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}
