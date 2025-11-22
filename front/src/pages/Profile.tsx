import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { useEffect, useState } from 'react'
import { fetchMyPhraseSets, fetchMySessions, orphanPhraseSet, updatePhraseSet } from '../lib/api'
import type { PhraseSet, PlaySession } from '../types'
import { useUserInfo } from '../contexts/UserContext'

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

  useEffect(() => {
    if (editing) {
      setTitle(editing.title)
      setPhrasesText(editing.phrases.join('\n'))
      setIsPublic(editing.isPublic)
      setFreeSpace(editing.freeSpace)
    } else {
      setTitle('')
      setPhrasesText('')
      setIsPublic(true)
      setFreeSpace(true)
    }
  }, [editing])

  const updateMutation = useMutation({
    mutationFn: (code: string) =>
      updatePhraseSet(code, {
        title: title.trim(),
        phrases: parseLines(phrasesText),
        isPublic,
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

  if (!user || !ownerProfileId) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200">
        Please sign in to view your boards.
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200 shadow-xl shadow-black/30">
        <header className="mb-4 space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Profile</p>
          <h2 className="text-2xl font-bold text-white">My boards</h2>
          <p className="text-sm text-slate-300">Owned by {email || displayName}</p>
        </header>

        {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {(mySets ?? []).map((set) => (
            <div
              key={set.code}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm shadow-black/20"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-white">{set.title}</div>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-teal-200">{set.code}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{set.phrases.length} phrases</p>
              <button
                className="mt-3 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/10"
                onClick={() => setEditing(set)}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200 shadow-xl shadow-black/30">
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

            <div className="grid gap-3 sm:grid-cols-2">
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

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200 shadow-xl shadow-black/30 lg:col-span-2">
        <header className="mb-3 space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-teal-300">History</p>
          <h3 className="text-xl font-semibold text-white">Play sessions</h3>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          {(sessions ?? []).map((s: PlaySession) => (
            <a
              href={`/session/${s.id}`}
              key={s.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 transition hover:-translate-y-[1px] hover:border-teal-300/60 hover:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{s.phraseSetTitle || s.phraseSetCode}</span>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-teal-200">#{s.gridSize}x{s.gridSize}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(s.createdAt).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-400">{s.checkedCells.length} checked</p>
            </a>
          ))}
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

export default ProfilePage
