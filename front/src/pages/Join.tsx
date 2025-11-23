import { useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicPhraseSets } from '../lib/api'
import type { PhraseSet } from '../types'
import { loadGuestGameState } from '../lib/guestStorage'
import type { GuestGameState } from '../lib/guestStorage'

export function JoinPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [search, setSearch] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [guestSession, setGuestSession] = useState<GuestGameState | null>(null)

  useEffect(() => {
    const saved = loadGuestGameState()
    setGuestSession(saved)
  }, [])

  const { data: publicSets, isFetching, refetch } = useQuery({
    queryKey: ['public-phrase-sets', submittedQuery],
    queryFn: () => fetchPublicPhraseSets(submittedQuery),
    enabled: true,
  })

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const value = code.trim().toUpperCase()
    if (!value) return
    navigate({ to: '/game/$code', params: { code: value } })
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault()
    setSubmittedQuery(search.trim())
    refetch()
  }

  return (
    <>
    {guestSession && (
      <section className="mb-4 sm:mb-8 rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 sm:p-8 shadow-lg">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Continue Playing</p>
            <h3 className="mt-2 text-xl font-bold text-white">{guestSession.title}</h3>
            <p className="mt-1 text-sm text-slate-300">
              Code: <span className="font-mono text-amber-200">{guestSession.code}</span> · {guestSession.checkedCells.length} cells checked
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Last played: {new Date(guestSession.lastUpdated).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => navigate({ to: '/game/$code', params: { code: guestSession.code } })}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-amber-400/30 transition hover:translate-y-[-2px]"
          >
            Resume Game
          </button>
        </div>
      </section>
    )}
    <section className="space-y-2 sm:space-y-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-8 shadow-xl shadow-black/30">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Players</p>
        <h2 className="text-2xl font-bold text-white">Join a game</h2>
        <p className="text-xs sm:text-sm text-slate-300">Enter a code or browse public boards.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:gap-4 sm:flex-row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABC123"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white shadow-inner shadow-black/40 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-300/50 sm:max-w-xs"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-400/30 transition hover:translate-y-[-1px]"
        >
          Go to board
        </button>
      </form>

    </section>
    <section className="mt-4 sm:mt-10 space-y-2 sm:space-y-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-8 shadow-xl shadow-black/30">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Discover</p>
        <h2 className="text-2xl font-bold text-white">Public boards</h2>
        <p className="text-xs sm:text-sm text-slate-300">Search discoverable sets and bolt in.</p>
      </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, code, or phrase"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white shadow-inner shadow-black/30 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-300/50 sm:w-64"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white bg-slate-950/60 transition hover:bg-white/10 disabled:opacity-60"
              disabled={isFetching}
            >
              {isFetching ? 'Searching…' : 'Search'}
            </button>
          </form>
        </div>

        {submittedQuery && publicSets && publicSets.length === 0 ? (
          <p className="text-sm text-slate-400">No public boards match “{submittedQuery}”.</p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {publicSets?.map((set: PhraseSet) => (
            <button
              key={set.code}
              onClick={() => navigate({ to: '/game/$code', params: { code: set.code } })}
              className="group flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-sm text-slate-200 transition hover:-translate-y-[1px] hover:border-teal-300/60 hover:bg-white/10"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-semibold text-white">{set.title}</span>
                <span className="rounded-full bg-teal-400/20 px-2 py-1 text-[11px] font-semibold text-teal-200">
                  {set.code}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-slate-400">{set.phrases.slice(0, 3).join(' · ')}</p>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span>{new Date(set.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span className="text-amber-300">
                  ★ {set.ratingAverage?.toFixed(1) ?? '0.0'} ({set.ratingCount ?? 0})
                </span>
              </div>
            </button>
          ))}
        </div>
    </section>
    </>
  )
}

export default JoinPage
