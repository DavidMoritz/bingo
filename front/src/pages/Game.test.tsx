import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GamePage } from './Game'
import * as api from '../lib/api'
import * as bingo from '../lib/bingo'
import type { PhraseSet, BingoBoard } from '../types'
import { cleanup } from '@testing-library/react'

// Mocks
vi.mock('../lib/api')
vi.mock('../lib/bingo')
vi.mock('@aws-amplify/ui-react', () => ({
  useAuthenticator: () => ({ user: { username: 'test-user' } }),
}))
vi.mock('../contexts/UserContext', () => ({
  useUserInfo: () => ({ displayName: 'Test User' }),
}))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
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
  title: 'Test Bingo',
  phrases: Array.from({ length: 25 }, (_, i) => `Phrase ${i + 1}`),
  createdAt: new Date().toISOString(),
  isPublic: true,
  freeSpace: true,
  ratingTotal: 40,
  ratingCount: 10,
  ratingAverage: 4,
  ownerProfileId: 'owner-123',
}

const mockBoard: BingoBoard = {
    code: 'TEST1',
    title: 'Test Bingo',
    gridSize: 5,
    usesFreeCenter: true,
    cells: Array.from({ length: 25 }, (_, i) => ({
        id: `cell-${i}`,
        text: `Phrase ${i + 1}`,
        selected: false,
    }))
}

const renderComponent = (phraseSet: PhraseSet | null, session?: any) => {
  const user = userEvent.setup()
  const queryClient = createTestQueryClient()
  const view = render(
    <QueryClientProvider client={queryClient}>
      <GamePage phraseSet={phraseSet} session={session} />
    </QueryClientProvider>
  )
  return { user, queryClient, ...view }
}

describe('GamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchUserRating).mockResolvedValue(null)
    vi.mocked(api.createPlaySession).mockResolvedValue({ id: 'session-123' } as any)
    vi.mocked(bingo.createBingoBoard).mockReturnValue(mockBoard)
    vi.mocked(bingo.toggleCell).mockImplementation((board, cellId) => {
        const cellIndex = board.cells.findIndex(c => c.id === cellId);
        const newCells = [...board.cells];
        newCells[cellIndex] = { ...newCells[cellIndex], selected: !newCells[cellIndex].selected };
        return { ...board, cells: newCells };
    });
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the game board with the provided phrase set', () => {
    renderComponent(mockPhraseSet)
    expect(screen.getByText('Test Bingo')).toBeInTheDocument()
    expect(screen.getByText(/Code/)).toHaveTextContent('TEST1')
    // 25 cells + New shuffle + Rebuild + 5 rating stars
    expect(screen.getAllByRole('button')).toHaveLength(25 + 2 + 5)
  })

  it('handles cell clicks and updates the board', async () => {
    const { user } = renderComponent(mockPhraseSet)
    const cellButton = screen.getByText('Phrase 5')

    expect(cellButton).not.toHaveClass('border-teal-300')
    await user.click(cellButton)
    
    await waitFor(() => {
        expect(cellButton).toHaveClass('border-teal-300')
    })
    
    expect(api.updatePlaySessionChecked).toHaveBeenCalled()
  })

  it('creates a new play session on initial load', async () => {
    renderComponent(mockPhraseSet)
    await waitFor(() => expect(api.createPlaySession).toHaveBeenCalled())
  })
  
  it('allows user to submit a rating', async () => {
    const { user, queryClient } = renderComponent(mockPhraseSet)
    vi.mocked(api.submitRating).mockResolvedValue({ ...mockPhraseSet, ratingAverage: 4.2 });
    
    // After submitting rating, the useQuery for user-rating will be invalidated and refetched
    vi.mocked(api.fetchUserRating).mockResolvedValue({ id: 'rating-1', ratingValue: 5 });

    const fiveStarButton = screen.getByRole('button', { name: /Rate 5 stars/i });
    await user.click(fiveStarButton)

    await waitFor(() => expect(api.submitRating).toHaveBeenCalledWith('test-user', 'TEST1', 5, expect.any(String)))
    
    await waitFor(() => {
      expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument()
    })
  })

  it('reshuffles the board when "New shuffle" is clicked', async () => {
    const { user } = renderComponent(mockPhraseSet);
    
    // createBingoBoard is called on initial render.
    expect(bingo.createBingoBoard).toHaveBeenCalledTimes(1);
    
    const reshuffleButton = screen.getByRole('button', { name: /New shuffle/i });
    await user.click(reshuffleButton);
  
    // It should be called a second time after the click.
    await waitFor(() => expect(bingo.createBingoBoard).toHaveBeenCalledTimes(2));
  });
})
