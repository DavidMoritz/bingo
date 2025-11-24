import { Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { loadGuestGameState } from '../lib/guestStorage'
import type { GuestGameState } from '../lib/guestStorage'
import { useUserInfo } from '../contexts/UserContext'
import { useQuery } from '@tanstack/react-query'
import { fetchMySessions } from '../lib/api'

export function HomePage() {
  const navigate = useNavigate()
  const { profileId } = useUserInfo()
  const [guestSession, setGuestSession] = useState<GuestGameState | null>(null)

  const { data: sessions } = useQuery({
    queryKey: ['my-sessions', profileId],
    queryFn: () => fetchMySessions(profileId),
    enabled: Boolean(profileId),
  })

  useEffect(() => {
    const saved = loadGuestGameState()
    setGuestSession(saved)
  }, [])

  const handlePlayClick = () => {
    if (sessions && sessions.length > 0) {
      // Navigate to most recent session
      navigate({ to: '/session/$id', params: { id: sessions[0].id } })
    } else {
      // No sessions, go to join
      navigate({ to: '/join' })
    }
  }

  const featureCards = [
    {
      title: 'Create',
      description: '⚡ Spark a game in seconds—instant codes, zero hassle.',
      onClick: () => navigate({ to: '/create' })
    },
    {
      title: 'Join',
      description: '⚡ Punch in a code, get your board. Lightning fast.',
      onClick: () => navigate({ to: '/join' })
    },
    {
      title: 'Play',
      description: '⚡ Tap to win. Track the action with instant feedback.',
      onClick: handlePlayClick
    },
  ]
  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-white/5 p-4 sm:p-8 shadow-2xl ring-1 ring-white/10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4 lg:max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-300">
              Vite + TanStack Router + Tailwind
            </p>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
              Lightning-fast custom bingo boards. Share in a flash.
            </h1>
            <p className="text-lg text-slate-200">
              Customize your clues, generate a code, and you're live. Players instantly join with randomized boards—no setup, just play.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {guestSession && (
                <Link
                  to="/game/$code"
                  params={{ code: guestSession.code }}
                  className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-amber-400/30 transition hover:translate-y-[-2px]"
                >
                  Resume Game
                </Link>
              )}
              <Link
                to="/create"
                className="inline-flex items-center justify-center rounded-xl bg-teal-400 px-5 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-teal-400/30 transition hover:translate-y-[-2px]"
              >
                Create a set
              </Link>
              <Link
                to="/join"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Bingo Bolt!
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 rounded-2xl bg-slate-900/70 p-4 text-center text-sm font-semibold text-slate-200 ring-1 ring-white/10">
            {Array.from({ length: 25 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-3 text-xs uppercase tracking-wide text-white/80"
              >
                {idx === 12 ? '☆' : '★'}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {featureCards.map((card) => (
          <button
            key={card.title}
            onClick={card.onClick}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:px-6 md:px-8 md:py-6 text-sm text-slate-200 shadow-lg shadow-black/30 text-left transition hover:bg-white/10 hover:border-white/20"
          >
            <h3 className="text-lg font-semibold text-white">{card.title}</h3>
            <p className="mt-2 leading-relaxed text-slate-300">{card.description}</p>
          </button>
        ))}
      </section>
    </div>
  )
}

export default HomePage
