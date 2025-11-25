import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { useEffect, useRef, useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { fetchMyPhraseSets, fetchMySessions, orphanPhraseSet, updatePhraseSet, deletePlaySession } from '../lib/api'
import type { PhraseSet, PlaySession } from '../types'
import { useUserInfo } from '../contexts/UserContext'
import { contentHasProfanity } from '../lib/profanity'
import { PhraseHelp } from '../components/PhraseHelp'

export function ProfilePage() {
  const { displayName, email } = useUserInfo();
  const { user } = useAuthenticator((context) => [context.user])
  const ownerProfileId =
    (user as any)?.attributes?.sub ||
    user?.signInDetails?.loginId ||
    (user as any)?.attributes?.email ||
    user?.username ||
    user?.userId ||
    ''


  const { data: mySets, refetch, isLoading } = useQuery({
    queryKey: ['my-phrase-sets', ownerProfileId],
    queryFn: () => fetchMyPhraseSets(ownerProfileId),
    enabled: Boolean(ownerProfileId),
  })

  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ['my-sessions', ownerProfileId],
    queryFn: () => fetchMySessions(ownerProfileId),
    enabled: Boolean(ownerProfileId),
  })
  

  const [editing, setEditing] = useState<PhraseSet | null>(null)
  const [title, setTitle] = useState('')
  const [phrasesText, setPhrasesText] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [freeSpace, setFreeSpace] = useState(true)
  const [shareStatus, setShareStatus] = useState<Record<string, 'idle' | 'copied' | 'error'>>({})
  const [showToast, setShowToast] = useState(false)
  const editorRef = useRef<HTMLElement>(null)
  const [deleteMode, setDeleteMode] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (editing) {
      setTitle(editing.title)
      setPhrasesText(editing.phrases.join('\n'))
      setIsPublic(editing.isPublic)
      setFreeSpace(editing.freeSpace)
      // Scroll to editor section on mobile
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      setTitle('')
      setPhrasesText('')
      setIsPublic(true)
      setFreeSpace(true)
    }
  }, [editing])

  // Parse phrases and check for profanity
  const phrases = useMemo(() => parseLines(phrasesText), [phrasesText])
  const hasProfanity = useMemo(
    () => contentHasProfanity(title, phrases),
    [title, phrases]
  )

  // Check for overlong phrases
  const MAX_PHRASE_LENGTH = 65
  const tooLongPhrases = useMemo(() => phrases.filter(p => p.length > MAX_PHRASE_LENGTH), [phrases])
  const hasOverlongPhrases = tooLongPhrases.length > 0

  // Sort boards by rating (descending), then by creation date (descending)
  const sortedSets = useMemo(() => {
    if (!mySets) return []
    return [...mySets].sort((a, b) => {
      // First, sort by rating average (higher ratings first)
      if (b.ratingAverage !== a.ratingAverage) {
        return b.ratingAverage - a.ratingAverage
      }
      // If ratings are equal, sort by creation date (newer first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [mySets])

  const updateMutation = useMutation({
    mutationFn: (code: string) =>
      updatePhraseSet(code, {
        title: title.trim(),
        phrases: parseLines(phrasesText),
        isPublic: hasProfanity ? false : isPublic, // Force private if profanity detected
        freeSpace,
        ownerProfileId,
        ownerDisplayName: displayName || undefined,
      }),
    onSuccess: () => {
      setEditing(null)
      refetch()
    },
  })

  const orphanMutation = useMutation({
    mutationFn: (code: string) => orphanPhraseSet(code, ownerProfileId),
    onSuccess: () => {
      setEditing(null)
      refetch()
      refetchSessions()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePlaySession,
    onSuccess: () => {
      refetchSessions()
    },
  })

  async function handleDeleteSession(id: string) {
    // Add to deleting set for fade animation
    setDeletingIds(prev => new Set(prev).add(id))

    // Wait for fade animation (1 second)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Actually delete from database
    // Keep in deletingIds until refetch completes - the item will be gone from sessions list
    deleteMutation.mutate(id)
  }

  async function handleShare(set: PhraseSet) {
    const shareUrl = `${window.location.origin}/game/${set.code}`
    const shareText = `I created a bingo card called "${set.title}" - want to play? ⚡\n\n${shareUrl}`

    // Try Web Share API first (native share on mobile/desktop)
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
        })
        return
      } catch (err) {
        // User cancelled or error occurred - fall through to clipboard
        if ((err as Error).name === 'AbortError') {
          return // User cancelled, don't show error
        }
      }
    }

    // Fallback: copy link to clipboard with toast
    try {
      await navigator.clipboard.writeText(shareText)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (err) {
      console.error('Copy failed:', err)
      setShareStatus(prev => ({ ...prev, [set.code]: 'error' }))
      setTimeout(() => setShareStatus(prev => ({ ...prev, [set.code]: 'idle' })), 2000)
    }
  }

  if (!user || !ownerProfileId) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200">
        Please sign in to view your boards.
      </div>
    )
  }

  const hasBoards = sortedSets.length > 0

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.4fr,1fr]">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 text-slate-200 shadow-xl shadow-black/30">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Profile</p>
            <h2 className="text-2xl font-bold text-white">My boards</h2>
            <p className="text-sm text-slate-300">
              {hasBoards ? `Owned by ${email || displayName}` : 'Your customized boards appear here'}
            </p>
          </div>
          {!isLoading && !hasBoards && (
            <Link
              to="/create"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-teal-400 px-5 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-teal-400/30 transition hover:translate-y-[-2px]"
            >
              Create a board
            </Link>
          )}
        </header>

        {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
        <div className="grid gap-3 sm:grid-cols-2 pt-4 sm:pt-6">
          {sortedSets.map((set) => (
            <div
              key={set.code}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm shadow-black/20"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-white">{set.title}</div>
                <Link to="/game/$code" params={{ code: set.code }}>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-teal-200 transition hover:text-teal-100">{set.code}</span>
                </Link>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {set.ratingCount > 0 ? (
                  <>
                    <span className="text-xs text-yellow-400">★</span>
                    <span className="text-xs font-medium text-white">{set.ratingAverage.toFixed(1)}</span>
                    <span className="text-xs text-slate-400">({set.ratingCount})</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 hidden">No ratings yet</span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  className="rounded-full bg-teal-400 px-5 py-1 text-xs font-semibold text-slate-950 transition hover:bg-teal-300"
                  onClick={() => handleShare(set)}
                >
                  {shareStatus[set.code] === 'copied' ? '✓ Copied' : shareStatus[set.code] === 'error' ? 'Error' : 'Share'}
                </button>
                <button
                  className="rounded-full border border-white/15 px-5 py-1 text-xs font-semibold text-white transition hover:bg-white/10"
                  onClick={() => setEditing(set)}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {hasBoards && (
        <section ref={editorRef} className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 text-slate-200 shadow-xl shadow-black/30">
        <header className="mb-4 space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Editor</p>
          <h3 className="text-xl font-semibold text-white">
            {editing ? `Editing ${editing.code}` : 'Select a board to edit'}
          </h3>
        </header>
        {editing ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              updateMutation.mutate(editing.code)
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="edit-title">
                Title
              </label>
              <input
                id="edit-title"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white shadow-inner shadow-black/40 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-300/50"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={40}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="edit-phrases">
                  Phrases
                </label>
                <PhraseHelp />
              </div>
              <textarea
                id="edit-phrases"
                className="min-h-[180px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white shadow-inner shadow-black/40 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-300/50"
                value={phrasesText}
                onChange={(e) => setPhrasesText(e.target.value)}
              />
              <div className="space-y-1">
                <p className="text-xs text-slate-400">{parseLines(phrasesText).length} phrases</p>
                {hasOverlongPhrases && (
                  <p className="text-xs text-amber-300">
                    ℹ {tooLongPhrases.length} phrase{tooLongPhrases.length === 1 ? '' : 's'} over 65 characters will be truncated on display.
                  </p>
                )}
              </div>
            </div>

            <div className={`grid gap-3 ${hasProfanity ? '' : 'sm:grid-cols-2'}`}>
              {!hasProfanity && (
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 hover:border-white/20">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-teal-300"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  <span>
                    <span className="font-semibold text-white">Public</span>
                    <span className="block text-xs text-slate-400">Allow others to discover.</span>
                  </span>
                </label>
              )}
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 hover:border-white/20">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-teal-300"
                  checked={freeSpace}
                  onChange={(e) => setFreeSpace(e.target.checked)}
                />
                <span>
                  <span className="font-semibold text-white">Free space</span>
                  <span className="block text-xs text-slate-400">Center FREE slot toggle.</span>
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-xl bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-400/30 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                className="text-xs text-slate-400 underline"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="text-xs text-rose-300 underline"
                onClick={() => orphanMutation.mutate(editing.code)}
                disabled={orphanMutation.isPending}
              >
                {orphanMutation.isPending ? 'Removing…' : 'Remove from profile'}
              </button>
              {updateMutation.error ? (
                <span className="text-xs text-rose-300">{(updateMutation.error as Error).message}</span>
              ) : null}
              {orphanMutation.error ? (
                <span className="text-xs text-rose-300">{(orphanMutation.error as Error).message}</span>
              ) : null}
            </div>
          </form>
        ) : (
          <p className="text-sm text-slate-400">Select a board to edit.</p>
        )}
      </section>
      )}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 text-slate-200 shadow-xl shadow-black/30 lg:col-span-2">
        <header className="mb-3 space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-300">History</p>
              <h3 className="text-xl font-semibold text-white">
                Play sessions
                {deleteMode && (
                  <small className="block sm:inline-block text-xs font-medium text-rose-300 sm:ml-8">
                    Permanently delete a session. This cannot be undone
                  </small>
                )}
              </h3>
            </div>
            <button
              onClick={() => setDeleteMode(!deleteMode)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                deleteMode
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
              }`}
            >
              {deleteMode ? 'Done' : 'Delete'}
            </button>
          </div>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          {(sessions ?? []).map((s: PlaySession) => {
            const totalCells = s.gridSize * s.gridSize
            const isDeleting = deletingIds.has(s.id)

            return (
              <div
                key={s.id}
                className={`relative w-full h-full ${
                  isDeleting ? 'opacity-0 transition-opacity duration-1000' : ''
                }`}
              >
                  <Link
                    to="/session/$id"
                    params={{ id: s.id }}
                    className="flex flex-col h-full w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 transition hover:-translate-y-[1px] hover:border-teal-300/60 hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{s.phraseSetTitle || s.phraseSetCode}</span>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-teal-200">
                        {s.checkedCells.length}/{totalCells}
                      </span>
                    </div>
                    {s.notes && (
                      <p className="mt-2 text-xs text-slate-300 line-clamp-2 italic">
                        "{s.notes}"
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {formatSessionDate(s.createdAt)}
                    </p>
                  </Link>
                  {deleteMode && (
                    <button
                      onClick={() => handleDeleteSession(s.id)}
                      className="absolute right-2 bottom-2 rounded-lg bg-rose-500 p-2 text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-600"
                      aria-label="Delete session"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              )
            })}
        </div>
      </section>

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

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((phrase) => phrase.trim())
    .filter(Boolean)
}

function formatSessionDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()

  // Check if same day
  const isSameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  if (isSameDay) {
    // Format time as "h:mma" (e.g., "2:30pm")
    const timeString = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase().replace(' ', '')
    return `Today at ${timeString}`
  }

  // Return date only (no time)
  return date.toLocaleDateString()
}

export default ProfilePage
