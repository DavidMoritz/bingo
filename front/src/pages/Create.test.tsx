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
  Link: ({ children, to, params }: any) => <a href={`${to}/${params?.code || ''}`}>{children}</a>,
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
    expect(screen.getByLabelText(/Title/i)).toHaveValue('Bingo Bolt')
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

    const genreInput = screen.getByLabelText(/What's the card for?/i)
    await user.type(genreInput, 'space')

    const suggestForm = genreInput.closest('form')!
    const suggestButton = within(suggestForm).getByRole('button', { name: /Suggest phrases/i });
    await user.click(suggestButton)

    await waitFor(() => expect(suggestPhrases).toHaveBeenCalledWith('space'))

    await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /Phrases/i })).toHaveValue(suggested.join('\n'))
    })
  })

  it('shows warning when phrases exceed 65 characters', async () => {
    const { user } = renderComponent()
    const longPhrase = 'This is a very long phrase that definitely exceeds the sixty-five character limit'

    const phrasesTextarea = screen.getByRole('textbox', { name: /Phrases/i })
    await user.clear(phrasesTextarea)
    await user.type(phrasesTextarea, longPhrase)

    await waitFor(() => {
      expect(screen.getByText(/over 65 characters will be truncated/i)).toBeInTheDocument()
    })
  })

  it('does not show warning when all phrases are under 65 characters', async () => {
    const { user } = renderComponent()
    const shortPhrase = 'Short phrase'

    const phrasesTextarea = screen.getByRole('textbox', { name: /Phrases/i })
    await user.clear(phrasesTextarea)
    await user.type(phrasesTextarea, shortPhrase)

    expect(screen.queryByText(/over 65 characters/i)).not.toBeInTheDocument()
  })

  it('displays phrase count and grid size info', async () => {
    const { user } = renderComponent()

    const phrasesTextarea = screen.getByRole('textbox', { name: /Phrases/i })
    await user.clear(phrasesTextarea)
    await user.type(phrasesTextarea, 'one\ntwo\nthree')

    await waitFor(() => {
      expect(screen.getByText(/Currently 3 phrases: 1×1 grid/i)).toBeInTheDocument()
    })
  })

  it('allows share after creating a phrase set', async () => {
    const { user } = renderComponent()
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
    })
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
    })

    vi.mocked(createPhraseSet).mockResolvedValue({
      code: 'SHARE1',
      title: 'Shareable Board',
      phrases: ['phrase 1', 'phrase 2'],
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
    await user.type(titleInput, 'Shareable Board')

    const phrasesTextarea = screen.getByRole('textbox', { name: /Phrases/i })
    await user.clear(phrasesTextarea)
    await user.type(phrasesTextarea, 'phrase 1\nphrase 2')

    const createForm = titleInput.closest('form')!
    const createButton = within(createForm).getByRole('button', { name: /Create code/i })
    await user.click(createButton)

    await waitFor(() => {
      expect(screen.getByText('SHARE1')).toBeInTheDocument()
    })

    const shareButton = screen.getByRole('button', { name: /Share game/i })
    await user.click(shareButton)

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining("I created a bingo card called \"Shareable Board\"")
      )
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining('/game/SHARE1')
      )
    })

    // Toast should appear
    await waitFor(() => {
      expect(screen.getByText('Link copied to clipboard!')).toBeInTheDocument()
    })
  })

  it.skip('shows "Play Now!" button after creating a phrase set', async () => {
    const { user } = renderComponent()

    vi.mocked(createPhraseSet).mockResolvedValue({
      code: 'PLAY1',
      title: 'Playable Board',
      phrases: ['phrase 1'],
      createdAt: new Date().toISOString(),
      isPublic: true,
      freeSpace: true,
      ratingTotal: 0,
      ratingCount: 0,
      ratingAverage: 0,
      ownerProfileId: 'test-user',
    })

    const titleInput = screen.getByLabelText(/Title/i)
    const createForm = titleInput.closest('form')!
    const createButton = within(createForm).getByRole('button', { name: /Create code/i })
    await user.click(createButton)

    await waitFor(() => {
      expect(screen.getByText('Play Now!')).toBeInTheDocument()
    })
  })

  it('merges suggestions with existing phrases when dirty', async () => {
    const { user } = renderComponent()
    const suggested = ['new1', 'new2', 'new3']
    vi.mocked(suggestPhrases).mockResolvedValue(suggested)

    const phrasesTextarea = screen.getByRole('textbox', { name: /Phrases/i })
    await user.clear(phrasesTextarea)
    await user.type(phrasesTextarea, 'existing1\nexisting2')

    const genreInput = screen.getByLabelText(/What's the card for?/i)
    await user.type(genreInput, 'test-genre')

    const suggestForm = genreInput.closest('form')!
    const suggestButton = within(suggestForm).getByRole('button', { name: /Suggest phrases/i })
    await user.click(suggestButton)

    await waitFor(() => {
      const phrasesValue = (screen.getByRole('textbox', { name: /Phrases/i }) as HTMLTextAreaElement).value
      expect(phrasesValue).toContain('existing1')
      expect(phrasesValue).toContain('existing2')
      expect(phrasesValue).toContain('new1')
      expect(phrasesValue).toContain('new2')
    })
  })

  it('updates title when genre is entered and title is not dirty', async () => {
    const { user } = renderComponent()
    vi.mocked(suggestPhrases).mockResolvedValue(['phrase1', 'phrase2'])

    const titleInput = screen.getByLabelText(/Title/i)
    expect(titleInput).toHaveValue('Bingo Bolt')

    const genreInput = screen.getByLabelText(/What's the card for?/i)
    await user.type(genreInput, 'unicorns')

    const suggestForm = genreInput.closest('form')!
    const suggestButton = within(suggestForm).getByRole('button', { name: /Suggest phrases/i })
    await user.click(suggestButton)

    await waitFor(() => {
      expect(titleInput).toHaveValue('Unicorns')
    })
  })

  it('phrases textarea has required attribute', () => {
    renderComponent()
    const phrasesTextarea = screen.getByRole('textbox', { name: /Phrases/i })
    expect(phrasesTextarea).toBeRequired()
  })

  it('suggest button lights up with CTA colors when text is entered', async () => {
    const { user } = renderComponent()

    const genreInput = screen.getByLabelText(/What's the card for?/i)
    const suggestForm = genreInput.closest('form')!
    const suggestButton = within(suggestForm).getByRole('button', { name: /Suggest phrases/i })

    // Initially should have border styling (plain)
    expect(suggestButton).toHaveClass('border-white/15')
    expect(suggestButton).not.toHaveClass('bg-teal-400')

    // After typing, should have CTA styling
    await user.type(genreInput, 'test')
    expect(suggestButton).toHaveClass('bg-teal-400')
    expect(suggestButton).not.toHaveClass('border-white/15')
  })

  it('suggest button returns to plain styling after clicking', async () => {
    const { user } = renderComponent()
    vi.mocked(suggestPhrases).mockResolvedValue(['phrase1'])

    const genreInput = screen.getByLabelText(/What's the card for?/i)
    const suggestForm = genreInput.closest('form')!
    const suggestButton = within(suggestForm).getByRole('button', { name: /Suggest phrases/i })

    // Type text
    await user.type(genreInput, 'test')
    expect(suggestButton).toHaveClass('bg-teal-400')

    // Click button
    await user.click(suggestButton)

    // Should return to plain styling
    await waitFor(() => {
      expect(suggestButton).toHaveClass('border-white/15')
      expect(suggestButton).not.toHaveClass('bg-teal-400')
    })
  })
})