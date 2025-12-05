import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { useEffect, useState } from 'react'
import { fetchUserAttributes } from 'aws-amplify/auth'
import { UserProvider } from './contexts/UserContext'

function AppLayout() {
  const { user, signOut } = useAuthenticator((context) => [context.user])
  const location = useLocation()
  const [attributes, setAttributes] = useState<Record<string, string> | null>(null)
  const isHomePage = location.pathname === '/'

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
    'Signed in'
  const userEmail = attributes?.email || user?.signInDetails?.loginId || ''
  const profileId =
    (user as any)?.attributes?.sub ||
    user?.signInDetails?.loginId ||
    (user as any)?.attributes?.email ||
    user?.username ||
    user?.userId ||
    ''

  return (
    <UserProvider value={{ displayName, email: userEmail, profileId }}>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <header className="border-b border-white/5 bg-white/5 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <Link to="/" className="group inline-flex items-center gap-2 text-lg font-semibold">
              {isHomePage ? (
                <span className="h-2 w-2 rounded-full bg-teal-400 transition group-hover:scale-125" />
              ) : (
                <img
                  src="/logo_alpha.svg"
                  alt="Logo"
                  className="h-6 w-6 transition group-hover:scale-110"
                />
              )}
              Bingo Bolt
            </Link>
            <nav className="flex flex-wrap items-center justify-end gap-1 text-sm font-medium text-slate-200 sm:gap-4">
              <Link
                to="/create"
                className="rounded-full px-1 sm:px-3 py-1 transition hover:bg-white/10 hover:text-white"
              >
                Create
              </Link>
              <Link
                to="/join"
                className="rounded-full px-1 sm:px-3 py-1 transition hover:bg-white/10 hover:text-white"
              >
                Play
              </Link>
              {user ? (
                <Link
                  to="/profile"
                  className="rounded-full px-1 sm:px-3 py-1 transition hover:bg-white/10 hover:text-white"
                >
                  Profile
                </Link>
              ) : null}
              {user ? (
                <div className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-xs text-slate-200 sm:gap-2 sm:px-3">
                  <span className="hidden rounded-full bg-teal-400/20 px-2 py-1 text-teal-200 sm:inline">
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

        <main className="mx-auto max-w-5xl px-4 sm:px-6 py-4 sm:py-10">
          <Outlet />
        </main>

        <footer className="border-t border-white/5 bg-white/5 backdrop-blur mt-auto">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
              <small className="text-center sm:text-left">
                &copy; 2025 Bingo Bolt &bull;{' '}
                <a
                  href="/terms-of-service.html"
                  target="_blank"
                  className="hover:text-slate-200 transition"
                >
                  Terms of Service
                </a>
              </small>
              <a
                href="https://paypal.me/rankedchoices"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-200 transition"
              >
                🧸 Buy me a bear?
              </a>
            </div>
          </div>
        </footer>
      </div>
    </UserProvider>
  )
}

export default AppLayout
