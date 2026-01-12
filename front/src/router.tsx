import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import AppLayout from './App'
import CreatePage from './pages/Create'
import GamePage from './pages/Game'
import HomePage from './pages/Home'
import JoinPage from './pages/Join'
import ProfilePage from './pages/Profile'
import LoginPage from './pages/Login'
import MoritzTools from './pages/MoritzTools'
import { fetchPhraseSet, fetchPlaySession, fetchMySessions } from './lib/api'
import SessionGameWrapper from './pages/SessionGameWrapper'
import { useUserInfo } from './contexts/UserContext'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <AppLayout />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const createRouteConfig = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create',
  component: CreatePage,
})

const joinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/join',
  component: JoinPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
})

const moritzToolsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moritz-tools',
  component: MoritzTools,
})

const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game/$code',
  loader: async ({ params }) => {
    // tries to find an existing session for this code for the signed-in user
    // fallback to loading the phrase set
    return { code: params.code }
  },
  component: () => {
    const { code } = gameRoute.useLoaderData() as { code: string }
    const { profileId } = useUserInfo()
    const { data: session } =
      useQuery({
        queryKey: ['session-for-code', profileId, code],
        queryFn: async () => {
          if (!profileId) return null
          const sessions = await fetchMySessions(profileId)
          return sessions.find((s) => s.phraseSetCode.toUpperCase() === code.toUpperCase()) ?? null
        },
        enabled: Boolean(profileId),
      }) || {}
    const phraseSetData = useQuery({
      queryKey: ['phrase-set', code],
      queryFn: () => fetchPhraseSet(code),
      enabled: !session,
    })

    const phraseSet = session ? null : phraseSetData.data ?? null
    const isLoading = (!session && phraseSetData.isLoading) || (!session && !phraseSet)
    if (isLoading) return <p className="text-slate-200">Loading…</p>

    return <GamePage phraseSet={phraseSet} session={session ?? undefined} />
  },
})

const sessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/session/$id',
  loader: ({ params }) => fetchPlaySession(params.id),
  component: SessionGameWrapper,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  createRouteConfig,
  joinRoute,
  loginRoute,
  profileRoute,
  moritzToolsRoute,
  sessionRoute,
  gameRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
