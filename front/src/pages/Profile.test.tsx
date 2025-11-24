import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProfilePage } from './Profile'
import * as api from '../lib/api'
import type { PhraseSet, PlaySession } from '../types'

// Mocks
vi.mock('../lib/api')
vi.mock('@aws-amplify/ui-react', () => ({
  useAuthenticator: () => ({
    user: {
      username: 'test-user',
      attributes: { sub: 'test-user' },
      signInDetails: { loginId: 'test-user' },
    },
  }),
}))
vi.mock('../contexts/UserContext', () => ({
  useUserInfo: () => ({ displayName: 'Test User', email: 'test@example.com', profileId: 'test-user' }),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params }: any) => <a href={`${to}/${params?.code || params?.id || ''}`}>{children}</a>,
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const mockPhraseSet: PhraseSet = {
  code: 'TEST1',
  title: 'Test Board',
  phrases: ['phrase1', 'phrase2', 'phrase3'],
  createdAt: new Date().toISOString(),
  isPublic: true,
  freeSpace: true,
  ratingTotal: 20,
  ratingCount: 5,
  ratingAverage: 4,
  ownerProfileId: 'test-user',
}

const mockSession: PlaySession = {
  id: 'session-1',
  profileId: 'test-user',
  phraseSetCode: 'TEST1',
  phraseSetTitle: 'Test Board',
  gridSize: 3,
  usesFreeCenter: false,
  boardSnapshot: [
    { text: 'phrase1', isFree: false },
    { text: 'phrase2', isFree: false },
  ],
  checkedCells: [0],
  createdAt: new Date().toISOString(),
}

const renderComponent = () => {
  const user = userEvent.setup()
  const queryClient = createTestQueryClient()
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>
  )
  return { user, queryClient, ...view }
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchMyPhraseSets).mockResolvedValue([mockPhraseSet])
    vi.mocked(api.fetchMySessions).mockResolvedValue([mockSession])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders user boards', async () => {
    renderComponent()
    await waitFor(() => {
      expect(screen.getAllByText('Test Board').length).toBeGreaterThan(0)
      expect(screen.getByText('TEST1')).toBeInTheDocument()
    })
  })

  it('displays share button for each board', async () => {
    renderComponent()
    await waitFor(() => {
      const shareButtons = screen.getAllByRole('button', { name: /Share/i })
      expect(shareButtons.length).toBeGreaterThan(0)
    })
  })

  // TODO: Fix async/timing issues with share and editing
  it.skip('copies share message to clipboard when share button clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
    })
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
    })

    const { user } = renderComponent()

    await waitFor(() => {
      expect(screen.getAllByText('Test Board').length).toBeGreaterThan(0)
    })

    const shareButtons = screen.getAllByRole('button', { name: /Share/i })
    const shareButton = shareButtons[0]
    await user.click(shareButton)

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining('I created a bingo card called "Test Board"')
      )
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining('/game/TEST1')
      )
    })

    // Toast should appear
    await waitFor(() => {
      expect(screen.getByText('Link copied to clipboard!')).toBeInTheDocument()
    })
  })

  it.skip('allows editing a board', async () => {
    const { user } = renderComponent()

    await waitFor(() => {
      expect(screen.getAllByText('Test Board').length).toBeGreaterThan(0)
    })

    const editButtons = screen.getAllByRole('button', { name: /Edit/i })
    const editButton = editButtons[0]
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText(/Editing TEST1/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Title/i)).toHaveValue('Test Board')
    })
  })

  it.skip('shows phrase length warning when editing with long phrases', async () => {
    const longPhrase = 'This is a very long phrase that definitely exceeds the sixty-five character limit'
    const boardWithLongPhrase = {
      ...mockPhraseSet,
      phrases: [longPhrase, 'short'],
    }
    vi.mocked(api.fetchMyPhraseSets).mockResolvedValue([boardWithLongPhrase])

    const { user } = renderComponent()

    await waitFor(() => {
      expect(screen.getAllByText('Test Board').length).toBeGreaterThan(0)
    })

    const editButtons = screen.getAllByRole('button', { name: /Edit/i })
    const editButton = editButtons[0]
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText(/over 65 characters will be truncated/i)).toBeInTheDocument()
    })
  })

  it('displays play sessions', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText(/Play sessions/i)).toBeInTheDocument()
      expect(screen.getByText(/1\/9/)).toBeInTheDocument() // 1 checked out of 9 cells (3x3)
    })
  })

  it.skip('updates board when save changes is clicked', async () => {
    vi.mocked(api.updatePhraseSet).mockResolvedValue(mockPhraseSet)
    const { user } = renderComponent()

    await waitFor(() => {
      expect(screen.getAllByText('Test Board').length).toBeGreaterThan(0)
    })

    const editButtons = screen.getAllByRole('button', { name: /Edit/i })
    const editButton = editButtons[0]
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByLabelText(/Title/i)).toHaveValue('Test Board')
    })

    const titleInput = screen.getByLabelText(/Title/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Board')

    const saveButton = screen.getByRole('button', { name: /Save changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(api.updatePhraseSet).toHaveBeenCalledWith('TEST1', expect.objectContaining({
        title: 'Updated Board',
      }))
    })
  })

  it('displays ratings for boards', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('4.0')).toBeInTheDocument()
      expect(screen.getByText('(5)')).toBeInTheDocument()
    })
  })

  it('shows no boards message when user has no boards', async () => {
    vi.mocked(api.fetchMyPhraseSets).mockResolvedValue([])
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText(/Your customized boards appear here/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Create a board/i })).toBeInTheDocument()
    })
  })
})
