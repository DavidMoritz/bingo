import { Link } from '@tanstack/react-router'

const featureCards = [
  { title: 'Create', description: 'Craft a phrase set and generate a shareable code.' },
  { title: 'Join', description: 'Enter a code to spawn a fresh 5×5 bingo board.' },
  { title: 'Play', description: 'Tap cells to track the chaos—center FREE spot included.' },
]

export function HomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-white/5 p-8 shadow-2xl ring-1 ring-white/10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4 lg:max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-300">
              Vite + TanStack Router + Tailwind
            </p>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
              Build and share custom bingo boards in seconds.
            </h1>
            <p className="text-lg text-slate-200">
              Drop in a title, paste your phrases, and share the code. Players join, get a randomized
              board, and mark squares as the game unfolds.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
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
                Join with a code
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
          <div
            key={card.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200 shadow-lg shadow-black/30"
          >
            <h3 className="text-lg font-semibold text-white">{card.title}</h3>
            <p className="mt-2 leading-relaxed text-slate-300">{card.description}</p>
          </div>
        ))}
      </section>
    </div>
  )
}

export default HomePage
