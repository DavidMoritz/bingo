import { Link, Outlet } from '@tanstack/react-router'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { useEffect, useState } from 'react'
import { fetchUserAttributes } from 'aws-amplify/auth'

function AppLayout() {
  const { user, signOut } = useAuthenticator((context) => [context.user])
  const [attributes, setAttributes] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    let mounted = true
    async function loadAttributes() {
      if (!user) {
        setAttributes(null)
        return
      }
      try {
        const attrs = await fetchUserAttributes()
        if (mounted) setAttributes(attrs as Record<string, string>)
      } catch {
        if (mounted) setAttributes(null)
      }
    }
    loadAttributes()
    return () => {
      mounted = false
    }
  }, [user])

  const displayName =
    attributes?.name ||
    attributes?.email ||
    user?.signInDetails?.loginId ||
    user?.username ||
    'Signed in'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-white/5 bg-white/5 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="group inline-flex items-center gap-2 text-lg font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 transition group-hover:scale-125" />
            Bingo Builder
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-200">
            <Link
              to="/create"
              className="rounded-full px-3 py-1 transition hover:bg-white/10 hover:text-white"
            >
              Create
            </Link>
            <Link
              to="/join"
              className="rounded-full px-3 py-1 transition hover:bg-white/10 hover:text-white"
            >
              Play 
            </Link>
            {user ? (
              <Link
                to="/profile"
                className="rounded-full px-3 py-1 transition hover:bg-white/10 hover:text-white"
              >
                Profile
              </Link>
            ) : null}
            {user ? (
              <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-200">
                <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-emerald-200">
                  {displayName}
                </span>
                <button
                  onClick={() => signOut()}
                  className="rounded-full px-2 py-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-full px-3 py-1 transition hover:bg-white/10 hover:text-white"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
