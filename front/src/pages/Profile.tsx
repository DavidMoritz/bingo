import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { useEffect, useRef, useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { fetchMyPhraseSets, fetchMySessions, orphanPhraseSet, updatePhraseSet } from '../lib/api'
import type { PhraseSet, PlaySession } from '../types'
import { useUserInfo } from '../contexts/UserContext'
import { contentHasProfanity } from '../lib/profanity'

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
  const editorRef = useRef<HTMLElement>(null)

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

  async function handleShare(set: PhraseSet) {
    const shareUrl = `${window.location.origin}/game/${set.code}`
    const shareText = `I created a bingo card called "${set.title}" - want to play? 🎲\n\n⚡ ${shareUrl}`

    // Try Web Share API first (native share on mobile/desktop)
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
        })
        setShareStatus(prev => ({ ...prev, [set.code]: 'idle' }))
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err)
          setShareStatus(prev => ({ ...prev, [set.code]: 'error' }))
          setTimeout(() => setShareStatus(prev => ({ ...prev, [set.code]: 'idle' })), 2000)
        }
      }
    } else {
      // Fallback: copy link to clipboard with message
      try {
        await navigator.clipboard.writeText(shareText)
        setShareStatus(prev => ({ ...prev, [set.code]: 'copied' }))
        setTimeout(() => setShareStatus(prev => ({ ...prev, [set.code]: 'idle' })), 2000)
      } catch (err) {
        console.error('Copy failed:', err)
        setShareStatus(prev => ({ ...prev, [set.code]: 'error' }))
        setTimeout(() => setShareStatus(prev => ({ ...prev, [set.code]: 'idle' })), 2000)
      }
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
                <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-teal-200">{set.code}</span>
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
              <label className="text-sm font-medium text-slate-200" htmlFor="edit-phrases">
                Phrases
              </label>
              <textarea
                id="edit-phrases"
                className="min-h-[180px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white shadow-inner shadow-black/40 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-300/50"
                value={phrasesText}
                onChange={(e) => setPhrasesText(e.target.value)}
              />
              <p className="text-xs text-slate-400">{parseLines(phrasesText).length} phrases</p>
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
                    <span className="block text-xs text-slate-400">Allow others to discover this set.</span>
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
          <p className="text-xs uppercase tracking-[0.3em] text-teal-300">History</p>
          <h3 className="text-xl font-semibold text-white">Play sessions</h3>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          {(sessions ?? []).map((s: PlaySession) => {
            const totalCells = s.gridSize * s.gridSize
            return (
              <a
                href={`/session/${s.id}`}
                key={s.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 transition hover:-translate-y-[1px] hover:border-teal-300/60 hover:bg-white/10"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{s.phraseSetTitle || s.phraseSetCode}</span>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-teal-200">
                    {s.checkedCells.length}/{totalCells}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {formatSessionDate(s.createdAt)}
                </p>
              </a>
            )
          })}
        </div>
      </section>
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
