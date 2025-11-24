import { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { useNavigate } from '@tanstack/react-router'
import { createBingoBoard, toggleCell } from '../lib/bingo'
import { submitRating, createPlaySession, updatePlaySessionChecked, claimOwnership, fetchUserRating } from '../lib/api'
import type { BingoBoard, PhraseSet, PlaySession } from '../types'
import { useUserInfo } from '../contexts/UserContext'
import { hyphenate } from 'hyphen/en'
import { saveGuestGameState, loadGuestGameState, clearGuestGameState } from '../lib/guestStorage'

// Hyphenate text with soft hyphens for better wrapping
async function hyphenateText(text: string): Promise<string> {
  try {
    // Skip hyphenation for very long text (> 100 chars) to avoid performance issues
    if (text.length > 100) {
      return text
    }
    const words = text.split(' ')
    const hyphenatedWords = await Promise.all(words.map(word => hyphenate(word)))
    return hyphenatedWords.join(' ')
  } catch (error) {
    // Fallback to original text if hyphenation fails
    console.warn('Hyphenation failed:', error)
    return text
  }
}

function useAutoFitText(text: string, containerRef: React.RefObject<HTMLElement>) {
  const [fontSize, setFontSize] = useState(14)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const measure = () => {
      const maxWidth = container.clientWidth - 8 // reduced padding
      const maxHeight = container.clientHeight - 12 // reduced padding

      let size = 20
      let fits = false

      while (size > 8 && !fits) {
        container.style.fontSize = `${size}px`
        const textWidth = container.scrollWidth - 8
        const textHeight = container.scrollHeight - 12

        if (textWidth <= maxWidth && textHeight <= maxHeight) {
          fits = true
        } else {
          size -= 1
        }
      }

      setFontSize(size)
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [text, containerRef])

  return fontSize
}

type GamePageProps = {
  phraseSet: PhraseSet | null
  session?: PlaySession | null
}

export function GamePage({ phraseSet, session }: GamePageProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { displayName } = useUserInfo()
  const { user } = useAuthenticator((context) => [context.user])
  const ownerProfileId =
    (user as any)?.attributes?.sub ||
    user?.signInDetails?.loginId ||
    (user as any)?.attributes?.email ||
    user?.username ||
    user?.userId ||
    ''

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
          ownerDisplayName: undefined,
        }
      : null)

  const [board, setBoard] = useState<BingoBoard | null>(() => {
    if (session) {
      return {
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
    }

    // Check for guest game state in LocalStorage (even if user just signed in)
    if (initialPhraseSet) {
      const guestState = loadGuestGameState()
      if (guestState && guestState.code.toLowerCase() === initialPhraseSet.code.toLowerCase()) {
        return {
          code: guestState.code,
          title: guestState.title,
          gridSize: guestState.gridSize,
          usesFreeCenter: guestState.usesFreeCenter,
          cells: guestState.boardSnapshot.map((snapshot, idx) => ({
            id: `cell-${idx}`,
            text: snapshot.text,
            isFree: snapshot.isFree ?? false,
            selected: guestState.checkedCells.includes(idx),
          })),
        }
      }
    }

    return initialPhraseSet ? createBingoBoard(initialPhraseSet, initialPhraseSet.freeSpace) : null
  });
  const [currentSet, setCurrentSet] = useState<PhraseSet | null>(initialPhraseSet)
  const [sessionId, setSessionId] = useState<string | null>(session?.id ?? null)
  const [showToast, setShowToast] = useState(false)
  const hasCreatedSession = useRef(false)

  // Fetch existing rating for this user and phrase set
  const { data: existingRating } = useQuery<{ id: string; ratingValue: number } | null>({
    queryKey: ['user-rating', ownerProfileId, currentSet?.code],
    queryFn: () => fetchUserRating(ownerProfileId, currentSet!.code),
    enabled: Boolean(ownerProfileId && currentSet),
  })

  const selectedCount = useMemo(() => (board ? board.cells.filter((c) => c.selected).length : 0), [board])

  useEffect(() => {
    async function ensureSession() {
      if (!board || !currentSet || sessionId || !ownerProfileId || hasCreatedSession.current) return

      // Set flag BEFORE async operation to prevent race condition in StrictMode
      hasCreatedSession.current = true

      // Check if there's guest game state that needs to be migrated
      const guestState = loadGuestGameState()
      const shouldMigrateGuestState = guestState && guestState.code.toLowerCase() === currentSet.code.toLowerCase()

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

        // Clear guest game state after successfully creating a PlaySession
        if (shouldMigrateGuestState) {
          clearGuestGameState()
        }
      } catch {
        // Reset flag on error so user can retry
        hasCreatedSession.current = false
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
      if (!current || !currentSet) return current
      const next = toggleCell(current, cellId)

      if (sessionId && ownerProfileId) {
        // Update PlaySession for logged-in users
        const checked = next.cells
          .map((c, idx) => (c.selected ? idx : -1))
          .filter((idx) => idx >= 0)
        updateSessionCheckedMutation.mutate({ id: sessionId, checked })
      } else if (!ownerProfileId) {
        // Save to LocalStorage for guest players
        const checked = next.cells
          .map((c, idx) => (c.selected ? idx : -1))
          .filter((idx) => idx >= 0)
        saveGuestGameState({
          code: currentSet.code,
          title: currentSet.title,
          gridSize: next.gridSize,
          usesFreeCenter: next.usesFreeCenter,
          boardSnapshot: next.cells.map((c) => ({ text: c.text, isFree: c.isFree })),
          checkedCells: checked,
          lastUpdated: new Date().toISOString(),
        })
      }

      return next
    })
  }

  function reshuffle() {
    if (!currentSet) return
    setSessionId(null)
    hasCreatedSession.current = false
    const newBoard = createBingoBoard(currentSet, currentSet.freeSpace)
    setBoard(newBoard)

    // For guest players, save new board state to LocalStorage
    if (!ownerProfileId) {
      saveGuestGameState({
        code: currentSet.code,
        title: currentSet.title,
        gridSize: newBoard.gridSize,
        usesFreeCenter: newBoard.usesFreeCenter,
        boardSnapshot: newBoard.cells.map((c) => ({ text: c.text, isFree: c.isFree })),
        checkedCells: [],
        lastUpdated: new Date().toISOString(),
      })
    }
  }

  const ratingMutation = useMutation({
    mutationFn: (rating: number) => submitRating(ownerProfileId, currentSet!.code, rating, sessionId || undefined),
    onSuccess: (updated) => {
      setCurrentSet(updated)
      // Invalidate the user rating query to refetch and show "Thank you" message
      queryClient.invalidateQueries({ queryKey: ['user-rating', ownerProfileId, currentSet?.code] })
    },
  })

  function handleSubmitRating(value: number) {
    if (currentSet && ownerProfileId) ratingMutation.mutate(value)
  }

  async function handleClaimOwnership() {
    if (!currentSet || !ownerProfileId) return
    try {
      const updated = await claimOwnership(currentSet.code, ownerProfileId, displayName || undefined)
      setCurrentSet(updated)
    } catch {
      // ignore claim errors
    }
  }

  function handleRebuild() {
    if (!currentSet) return
    // Navigate to Create page with phrase set data encoded in URL
    const params = new URLSearchParams({
      title: currentSet.title,
      phrases: currentSet.phrases.join('\n'),
      isPublic: currentSet.isPublic.toString(),
      freeSpace: currentSet.freeSpace.toString(),
    })
    navigate({ to: '/create', search: { rebuild: params.toString() } })
  }

  async function handleShare() {
    if (!currentSet) return
    const url = `${window.location.origin}/game/${currentSet.code}`
    const message = `I'm playing a bingo card called '${currentSet.title}' - want to join? ⚡\n\n${url}`

    // Try Web Share API first (works on mobile and some desktop browsers)
    if (navigator.share) {
      try {
        await navigator.share({ text: message })
        return
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(message)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch {
      // Last resort: show the message in an alert
      console.log(message)
    }
  }

  if (!board || !currentSet) {
    return <p className="text-slate-200">Unable to load board.</p>
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Game</p>
          <h2 className="text-3xl font-bold text-white">{currentSet.title}</h2>
          <p className="text-sm text-slate-300">
            Code <span className="font-mono text-white">{currentSet.code}</span> ·{' '}
            {selectedCount} selected
          </p>
          <p className="text-xs text-slate-400">
            Created by:{' '}
            {currentSet.ownerDisplayName
              ? currentSet.ownerDisplayName
              : currentSet.ownerProfileId !== 'guest'
              ? 'Anonymous user'
              : 'guest'}
            {ownerProfileId && currentSet.ownerProfileId === 'guest' ? (
              <button
                className="ml-2 text-teal-300 underline"
                onClick={handleClaimOwnership}
              >
                Click to claim ownership
              </button>
            ) : null}
          </p>
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-200">
            {existingRating ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-200">
                Thank you for your feedback!
              </span>
            ) : (
              <StarRating value={currentSet.ratingAverage} onRate={handleSubmitRating} userValue={(existingRating as any)?.ratingValue ?? null} />
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
            onClick={handleShare}
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-teal-200 transition hover:bg-white/10"
          >
            Share board
          </button>
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
          <BingoCell
            key={cell.id}
            text={cell.text || '…'}
            selected={cell.selected}
            isFree={cell.isFree ?? false}
            onClick={() => handleCellClick(cell.id)}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Can you make this better?</p>
            <p className="mt-1 text-sm text-slate-300">
              Create your own version to improve the phrases!
            </p>
          </div>
          <button
            onClick={handleRebuild}
            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Bolt this Board
          </button>
        </div>
      </div>

      {!ownerProfileId && (
        <div className="rounded-2xl border border-teal-500/30 bg-teal-950/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Save Your Progress</p>
              <p className="mt-1 text-sm text-slate-300">
                Sign up to save your game sessions and access them from any device!
              </p>
            </div>
            <button
              onClick={() => navigate({ to: '/login', search: { returnTo: `/game/${currentSet.code}` } })}
              className="inline-flex items-center justify-center rounded-xl border border-teal-400/40 bg-teal-500/20 px-4 py-2 text-sm font-semibold text-teal-200 transition hover:bg-teal-500/30"
            >
              Sign Up / Sign In
            </button>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-xl border border-white/15 bg-white/10 px-6 py-3 shadow-lg backdrop-blur-sm">
            <p className="text-sm font-semibold text-teal-200">Link copied to clipboard!</p>
          </div>
        </div>
      )}
    </div>
  )
}

type BingoCellProps = {
  text: string
  selected: boolean
  isFree: boolean
  onClick: () => void
}

function BingoCell({ text, selected, isFree, onClick }: BingoCellProps) {
  const cellRef = useRef<HTMLButtonElement>(null)
  const MAX_DISPLAY_LENGTH = 65
  const displayText = text.length > MAX_DISPLAY_LENGTH ? text.slice(0, MAX_DISPLAY_LENGTH) + '…' : text
  const [hyphenatedText, setHyphenatedText] = useState(displayText)
  const fontSize = useAutoFitText(displayText, cellRef as React.RefObject<HTMLElement>)

  useEffect(() => {
    hyphenateText(displayText).then(setHyphenatedText).catch(() => {
      // Fallback to original text if hyphenation fails
      setHyphenatedText(displayText)
    })
  }, [displayText])

  return (
    <button
      ref={cellRef}
      onClick={onClick}
      lang="en"
      className={`flex min-h-[90px] items-center justify-center overflow-hidden rounded-2xl border px-1 py-1.5 text-center font-semibold leading-tight transition ${
        selected
          ? 'border-teal-300 bg-teal-400 text-slate-950 shadow-lg shadow-teal-400/40'
          : 'border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10'
      } ${isFree ? 'ring-2 ring-amber-300/70' : ''}`}
      style={{ fontSize: `${fontSize}px`, hyphens: 'manual', WebkitHyphens: 'manual', wordWrap: 'break-word' }}
    >
      <span className="break-words" dangerouslySetInnerHTML={{ __html: hyphenatedText }} />
    </button>
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
