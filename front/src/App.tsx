import { Link, Outlet } from '@tanstack/react-router'

function AppLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-white/5 bg-white/5 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="group inline-flex items-center gap-2 text-lg font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 transition group-hover:scale-125" />
            Bingo Builder
          </Link>
          <nav className="flex gap-4 text-sm font-medium text-slate-200">
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
