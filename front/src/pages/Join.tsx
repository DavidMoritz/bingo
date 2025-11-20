import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicPhraseSets } from '../lib/api'
import type { PhraseSet } from '../types'

export function JoinPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [search, setSearch] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  const { data: publicSets, isFetching } = useQuery({
    queryKey: ['public-phrase-sets', submittedQuery],
    queryFn: () => fetchPublicPhraseSets(submittedQuery),
    enabled: submittedQuery.trim().length > 0,
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
  }

  return (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/30">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Players</p>
        <h2 className="text-2xl font-bold text-white">Join a game</h2>
        <p className="text-sm text-slate-300">Enter a code or browse public boards.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row">
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

      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Public boards</p>
            <p className="text-sm text-slate-300">Search discoverable sets and hop in.</p>
          </div>
          <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, code, or phrase"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white shadow-inner shadow-black/30 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-300/50 sm:w-64"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
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
              className="group flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-200 transition hover:-translate-y-[1px] hover:border-teal-300/60 hover:bg-white/10"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-semibold text-white">{set.title}</span>
                <span className="rounded-full bg-teal-400/20 px-2 py-1 text-[11px] font-semibold text-teal-200">
                  {set.code}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-slate-400">{set.phrases.slice(0, 3).join(' · ')}</p>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span>{set.phrases.length} phrases</span>
                <span>•</span>
                <span>{new Date(set.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span className="text-amber-300">
                  ★ {set.ratingAverage?.toFixed(1) ?? '0.0'} ({set.ratingCount ?? 0})
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export default JoinPage
