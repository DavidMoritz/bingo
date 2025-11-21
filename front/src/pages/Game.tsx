import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { createBingoBoard, toggleCell } from '../lib/bingo'
import { ratePhraseSet, createPlaySession, updatePlaySessionChecked, claimOwnership } from '../lib/api'
import type { BingoBoard, PhraseSet, PlaySession } from '../types'

type GamePageProps = {
  phraseSet: PhraseSet | null
  session?: PlaySession | null
}

export function GamePage({ phraseSet, session }: GamePageProps) {
  const { user } = useAuthenticator((context) => [context.user])
  const ownerProfileId =
    (user as any)?.attributes?.sub ||
    user?.signInDetails?.loginId ||
    (user as any)?.attributes?.email ||
    user?.username ||
    user?.userId ||
    ''

  const sessionBoard =
    session && phraseSet === null
      ? {
          code: session.phraseSetCode,
          title: session.phraseSetTitle ?? session.phraseSetCode,
          gridSize: session.gridSize,
          usesFreeCenter: session.usesFreeCenter,
          cells: session.boardSnapshot.map((snapshot, idx) => ({
            id: `cell-${idx}`,
            text: snapshot.text,
            isFree: snapshot.isFree,
            selected: session.checkedCells.includes(idx),
          })),
        }
      : null

  const initialPhraseSet: PhraseSet | null =
    phraseSet ??
    (session
      ? {
          code: session.phraseSetCode,
          title: session.phraseSetTitle ?? session.phraseSetCode,
          phrases: session.boardSnapshot.map((b) => b.text),
          createdAt: session.createdAt,
          isPublic: true,
          freeSpace: session.usesFreeCenter,
          ratingTotal: 0,
          ratingCount: 0,
          ratingAverage: 0,
          ownerProfileId: 'guest',
        }
      : null)

  const [board, setBoard] = useState<BingoBoard | null>(
    sessionBoard ?? (initialPhraseSet ? createBingoBoard(initialPhraseSet, initialPhraseSet.freeSpace) : null)
  )
  const [currentSet, setCurrentSet] = useState<PhraseSet | null>(initialPhraseSet)
  const [myRating, setMyRating] = useState<number | null>(null)
  const [hasRated, setHasRated] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(session?.id ?? null)
  const hasCreatedSession = useRef(false)

  const selectedCount = useMemo(() => (board ? board.cells.filter((c) => c.selected).length : 0), [board])

  useEffect(() => {
    async function ensureSession() {
      if (!board || !currentSet || sessionId || !ownerProfileId || hasCreatedSession.current) return
      try {
        const created = await createPlaySession({
          profileId: ownerProfileId,
          phraseSetCode: currentSet.code,
          phraseSetTitle: currentSet.title,
          gridSize: board.gridSize,
          usesFreeCenter: board.usesFreeCenter,
          boardSnapshot: board.cells.map((c) => ({ text: c.text, isFree: c.isFree })),
          checkedCells: board.cells.map((c, idx) => (c.selected ? idx : -1)).filter((idx) => idx >= 0),
        })
        setSessionId(created.id)
        hasCreatedSession.current = true
      } catch {
        // ignore create errors
      }
    }
    ensureSession()
  }, [board, currentSet, ownerProfileId, sessionId])

  const updateSessionCheckedMutation = useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: number[] }) =>
      updatePlaySessionChecked(id, { profileId: ownerProfileId, checkedCells: checked }),
  })

  function handleCellClick(cellId: string) {
    setBoard((current) => {
      if (!current) return current
      const next = toggleCell(current, cellId)
      if (sessionId && ownerProfileId) {
        const checked = next.cells
          .map((c, idx) => (c.selected ? idx : -1))
          .filter((idx) => idx >= 0)
        updateSessionCheckedMutation.mutate({ id: sessionId, checked })
      }
      return next
    })
  }

  function reshuffle() {
    if (!currentSet) return
    setSessionId(null)
    setBoard(createBingoBoard(currentSet, currentSet.freeSpace))
  }

  const ratingMutation = useMutation({
    mutationFn: (rating: number) => ratePhraseSet(currentSet!.code, rating),
    onSuccess: (updated) => {
      setCurrentSet(updated)
      setHasRated(true)
    },
  })

  function submitRating(value: number) {
    setMyRating(value)
    if (currentSet) ratingMutation.mutate(value)
  }

  async function handleClaimOwnership() {
    if (!currentSet || !ownerProfileId) return
    try {
      const updated = await claimOwnership(currentSet.code, ownerProfileId)
      setCurrentSet(updated)
    } catch {
      // ignore claim errors
    }
  }

  if (!board || !currentSet) {
    return <p className="text-slate-200">Unable to load board.</p>
  }
  console.log(currentSet, ownerProfileId);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Game</p>
          <h2 className="text-3xl font-bold text-white">{currentSet.title}</h2>
          <p className="text-sm text-slate-300">
            Code <span className="font-mono text-white">{currentSet.code}</span> ·{' '}
            {currentSet.phrases.length} phrases · {selectedCount} selected
          </p>
          <p className="text-xs text-slate-400">
            Created by:{' '}
            {currentSet.ownerProfileId && currentSet.ownerProfileId !== 'guest'
              ? currentSet.ownerProfileId
              : 'guest'}
            {ownerProfileId && currentSet.ownerProfileId === 'guest' ? (
              <button
                className="ml-2 text-teal-300 underline"
                onClick={handleClaimOwnership}
              >
                (Click to claim ownership)
              </button>
            ) : null}
          </p>
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-200">
            {hasRated ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-200">
                Thank you for your feedback!
              </span>
            ) : (
              <StarRating value={currentSet.ratingAverage} onRate={submitRating} userValue={myRating} />
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
          {currentSet.phrases.map((p, idx) => (
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

export default GamePage
