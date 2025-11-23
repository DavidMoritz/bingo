import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { loadGuestGameState } from '../lib/guestStorage'
import type { GuestGameState } from '../lib/guestStorage'

export function LoginPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/login' }) as { returnTo?: string }
  const { user } = useAuthenticator((context) => [context.user])
  const [guestSession, setGuestSession] = useState<GuestGameState | null>(null)

  // Load guest session on mount
  useEffect(() => {
    const saved = loadGuestGameState()
    setGuestSession(saved)
  }, [])

  // Redirect to returnTo path after successful sign-in
  useEffect(() => {
    if (user && search.returnTo) {
      navigate({ to: search.returnTo as any })
    }
  }, [user, search.returnTo, navigate])

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
      <header className="mb-4 space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Account</p>
        <h2 className="text-2xl font-bold text-white">Sign in</h2>
        <p className="text-sm text-slate-300">Use Google or email/password to create a profile and save your boards.</p>
      </header>
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
        <Authenticator
          loginMechanisms={['email']}
          socialProviders={['google']}
          hideSignUp={false}
          variation="default"
        />
        {user ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-teal-400/30 bg-teal-400/10 px-3 py-2 text-xs text-teal-100">
              <span>Signed in as {user?.signInDetails?.loginId ?? user?.username ?? 'user'}.</span>
            </div>
            {guestSession ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-300 mb-2">Continue Playing</p>
                <p className="text-sm font-semibold text-white mb-1">{guestSession.title}</p>
                <p className="text-xs text-slate-300 mb-3">
                  Code: <span className="font-mono text-amber-200">{guestSession.code}</span> · {guestSession.checkedCells.length} cells checked
                </p>
                <button
                  className="w-full sm:w-auto rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-400/30 transition hover:translate-y-[-1px]"
                  onClick={() => navigate({ to: '/game/$code', params: { code: guestSession.code } })}
                >
                  Resume Game
                </button>
              </div>
            ) : null}
            <button
              className="self-start rounded-full bg-teal-400 px-3 py-1 text-[11px] font-semibold text-slate-950 transition hover:translate-y-[-1px]"
              onClick={() => navigate({ to: '/' })}
            >
              Go to home
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default LoginPage
