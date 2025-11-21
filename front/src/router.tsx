import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import AppLayout from './App'
import CreatePage from './pages/Create'
import GamePage from './pages/Game'
import HomePage from './pages/Home'
import JoinPage from './pages/Join'
import ProfilePage from './pages/Profile'
import LoginPage from './pages/Login'
import { fetchPhraseSet, fetchPlaySession } from './lib/api'
import SessionGameWrapper from './pages/SessionGameWrapper'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <AppLayout />
      <TanStackRouterDevtools position="bottom-right" />
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

const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game/$code',
  loader: ({ params }) => fetchPhraseSet(params.code),
  component: () => {
    const phraseSet = gameRoute.useLoaderData()
    return <GamePage phraseSet={phraseSet} />
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
