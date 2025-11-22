import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreatePage } from './Create'
import { createPhraseSet, suggestPhrases, listAvailableGenres } from '../lib/api'

// Mocks
vi.mock('../lib/api')
vi.mock('@aws-amplify/ui-react', () => ({
  useAuthenticator: () => ({ user: { username: 'test-user' } }),
}))
vi.mock('../contexts/UserContext', () => ({
  useUserInfo: () => ({ displayName: 'Test User' }),
}))
vi.mock('@tanstack/react-router', () => ({
  useSearch: () => ({}),
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // disable retries for tests
    },
  },
})

const renderComponent = () => {
  const user = userEvent.setup()
  const queryClient = createTestQueryClient()
  const view = render(
    <QueryClientProvider client={queryClient}>
      <CreatePage />
    </QueryClientProvider>
  )
  return { user, ...view }
}

describe('CreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listAvailableGenres).mockResolvedValue(['sci-fi', 'fantasy', 'romcom'])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the create page with default values', () => {
    renderComponent()
    expect(screen.getByLabelText(/Title/i)).toHaveValue('VC Bingo')
    expect(screen.getByRole('textbox', { name: /Phrases/i })).toBeInTheDocument()
    const titleInput = screen.getByLabelText(/Title/i)
    const createForm = titleInput.closest('form')!
    expect(within(createForm).getByRole('button', { name: /Create code/i })).toBeInTheDocument()
  })

  it('allows typing in the title and phrases fields', async () => {
    const { user } = renderComponent()

    const titleInput = screen.getByLabelText(/Title/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'My Custom Bingo')
    expect(titleInput).toHaveValue('My Custom Bingo')

    const phrasesTextarea = screen.getByRole('textbox', { name: /Phrases/i })
    await user.clear(phrasesTextarea)
    await user.type(phrasesTextarea, 'First line\nSecond line')
    expect(phrasesTextarea).toHaveValue('First line\nSecond line')
  })

  it('calls createPhraseSet mutation on form submission', async () => {
    const { user } = renderComponent()
    vi.mocked(createPhraseSet).mockResolvedValue({
      code: 'NEWCODE',
      title: 'My Custom Bingo',
      phrases: ['First line', 'Second line'],
      createdAt: new Date().toISOString(),
      isPublic: true,
      freeSpace: true,
      ratingTotal: 0,
      ratingCount: 0,
      ratingAverage: 0,
      ownerProfileId: 'test-user',
    })

    const titleInput = screen.getByLabelText(/Title/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'My Custom Bingo')

    const phrasesTextarea = screen.getByRole('textbox', { name: /Phrases/i })
    await user.clear(phrasesTextarea)
    await user.type(phrasesTextarea, 'First line\nSecond line')

    const createForm = titleInput.closest('form')!
    const createButton = within(createForm).getByRole('button', { name: /Create code/i })
    await user.click(createButton)

    await waitFor(() => expect(createPhraseSet).toHaveBeenCalledWith({
      title: 'My Custom Bingo',
      phrases: ['First line', 'Second line'],
      isPublic: true,
      freeSpace: true,
      ownerProfileId: 'test-user',
      ownerDisplayName: 'Test User',
    }))

    expect(await screen.findByText('NEWCODE')).toBeInTheDocument()
  })

  it('calls suggestPhrases and replaces phrases if not dirty', async () => {
    const { user } = renderComponent()
    const suggested = ['suggestion 1', 'suggestion 2']
    vi.mocked(suggestPhrases).mockResolvedValue(suggested)
  
    const genreInput = screen.getByLabelText(/Genre/i)
    await user.type(genreInput, 'space')
  
    const suggestForm = genreInput.closest('form')!
    const suggestButton = within(suggestForm).getByRole('button', { name: /Suggest phrases/i });
    await user.click(suggestButton)
  
    await waitFor(() => expect(suggestPhrases).toHaveBeenCalledWith('space'))
    
    await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /Phrases/i })).toHaveValue(suggested.join('\n'))
    })
  })
})