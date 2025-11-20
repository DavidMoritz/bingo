import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export function JoinPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const value = code.trim().toUpperCase()
    if (!value) return
    navigate({ to: '/game/$code', params: { code: value } })
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/30">
      <header className="mb-6 space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Players</p>
        <h2 className="text-2xl font-bold text-white">Join a game</h2>
        <p className="text-sm text-slate-300">Paste the code from the creator to spin up your board.</p>
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
    </section>
  )
}

export default JoinPage
