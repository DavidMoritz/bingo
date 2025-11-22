import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sortSetsByBayesianScore, createPhraseSet, fetchPhraseSet, fetchPublicPhraseSets } from './api'
import type { PhraseSet } from '../types'
import { generateClient } from 'aws-amplify/data'

// Mock the Amplify Data client
vi.mock('aws-amplify/data')

const mockClient = {
  models: {
    PhraseSet: {
      create: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
    },
    Rating: {
      list: vi.fn(),
    },
    PhraseTemplate: {
      list: vi.fn(),
    },
    PlaySession: {
        create: vi.fn(),
        get: vi.fn(),
        list: vi.fn(),
        update: vi.fn(),
    }
  },
  queries: {
    generatePhrases: vi.fn(),
  }
}

// Helper to create a mock PhraseSet, reducing boilerplate in tests
const createMockSet = (
  code: string,
  ratingAverage: number,
  ratingCount: number
): PhraseSet => ({
  code,
  title: `Set ${code}`,
  ratingAverage,
  ratingCount,
  ratingTotal: ratingAverage * ratingCount,
  phrases: [],
  createdAt: new Date().toISOString(),
  isPublic: true,
  freeSpace: true,
  ownerProfileId: 'test-user',
});

describe('sortSetsByBayesianScore', () => {
  it('should return an empty array if given an empty array', () => {
    const sets: PhraseSet[] = []
    const sorted = sortSetsByBayesianScore(sets)
    expect(sorted).toEqual([])
  })

  it('should not change order if no sets are rated', () => {
    const sets: PhraseSet[] = [
      createMockSet('A', 0, 0),
      createMockSet('B', 0, 0),
    ]
    const sorted = sortSetsByBayesianScore(sets)
    expect(sorted.map((s) => s.code)).toEqual(['A', 'B'])
  })

  it('should rank a 5.0/2 review set slightly higher than a 4.5/10 review set with C=5', () => {
    const highRatedFewReviews = createMockSet('B', 5.0, 2); // total=10
    const goodRatedMoreReviews = createMockSet('A', 4.5, 10); // total=45

    const sets: PhraseSet[] = [highRatedFewReviews, goodRatedMoreReviews]
    const sorted = sortSetsByBayesianScore(sets)
    expect(sorted.map((s) => s.code)).toEqual(['B', 'A'])
  })

  it('should rank a low-rated set with many reviews poorly', () => {
    const badSetManyReviews = createMockSet('C', 2.38, 20);
    const mediocreSetFewReviews = createMockSet('D', 3.5, 5);
    const greatSetVeryFewReviews = createMockSet('E', 5.0, 2);

    const sets: PhraseSet[] = [badSetManyReviews, mediocreSetFewReviews, greatSetVeryFewReviews]
    const sorted = sortSetsByBayesianScore(sets)
    expect(sorted.map((s) => s.code)).toEqual(['E', 'D', 'C'])
  })

  it('should handle a mix of rated and unrated sets', () => {
    const ratedA = createMockSet('A', 4, 10);
    const unratedB = createMockSet('B', 0, 0);
    const ratedC = createMockSet('C', 5, 20);

    const sets: PhraseSet[] = [ratedA, unratedB, ratedC]
    const sorted = sortSetsByBayesianScore(sets)
    expect(sorted.map((s) => s.code)).toEqual(['C', 'B', 'A'])
  })

  it('should correctly rank sets with different rating distributions', () => {
    const sets: PhraseSet[] = [
      createMockSet('A', 4.5, 10),
      createMockSet('B', 5.0, 2),
      createMockSet('C', 3.0, 30),
      createMockSet('D', 4.8, 100),
      createMockSet('E', 2.0, 3),
      createMockSet('F', 0, 0),
    ];

    const sorted = sortSetsByBayesianScore(sets);
    expect(sorted.map((s) => s.code)).toEqual(['D', 'A', 'B', 'F', 'E', 'C']);
  });
});

describe('Bingo API functions', () => {
  beforeEach(() => {
    vi.mocked(generateClient).mockReturnValue(mockClient)
    vi.clearAllMocks();
  });

  describe('createPhraseSet', () => {
    it('should create a new phrase set and return it', async () => {
      const input = {
        title: 'New Set',
        phrases: ['p1', 'p2'],
        isPublic: true,
        freeSpace: false,
        ownerProfileId: 'user123',
      };
      const mockResponse = { data: { code: 'ABCDEF', ...input } };
      mockClient.models.PhraseSet.create.mockResolvedValue(mockResponse);

      const result = await createPhraseSet(input);

      expect(mockClient.models.PhraseSet.create).toHaveBeenCalledWith(expect.objectContaining(input));
      expect(result.code).toBeDefined();
      expect(result.title).toBe('New Set');
    });

    it('should throw an error if creation fails', async () => {
        const input = {
            title: 'New Set',
            phrases: ['p1', 'p2'],
            isPublic: true,
            freeSpace: false,
            ownerProfileId: 'user123',
          };
      mockClient.models.PhraseSet.create.mockResolvedValue({ errors: [new Error('Create failed')] });
      await expect(createPhraseSet(input)).rejects.toThrow('Failed to create phrase set');
    });
  });

  describe('fetchPhraseSet', () => {
    it('should fetch a phrase set by code', async () => {
      const mockSet = createMockSet('TEST', 4, 5);
      mockClient.models.PhraseSet.get.mockResolvedValue({ data: mockSet });

      const result = await fetchPhraseSet('TEST');

      expect(mockClient.models.PhraseSet.get).toHaveBeenCalledWith({ code: 'TEST' });
      expect(result).toEqual(mockSet);
    });

    it('should throw an error if not found', async () => {
      mockClient.models.PhraseSet.get.mockResolvedValue({ data: null });
      await expect(fetchPhraseSet('TEST')).rejects.toThrow('Phrase set not found');
    });
  });

  describe('fetchPublicPhraseSets', () => {
    it('should fetch public sets, filter, and sort them', async () => {
      const sets = [
        createMockSet('A', 4.5, 10), // Kept by query
        createMockSet('B', 5.0, 2), // Kept by query
        createMockSet('C', 3.0, 30), // Filtered out
      ];
      sets[0].title = "Awesome A";
      sets[1].phrases = ["awesome phrase"];
      mockClient.models.PhraseSet.list.mockResolvedValue({ data: sets });

      const result = await fetchPublicPhraseSets('awesome');

      expect(mockClient.models.PhraseSet.list).toHaveBeenCalledWith({ filter: { isPublic: { eq: true } } });
      // B is ranked higher than A due to the bayesian score
      expect(result.map(s => s.code)).toEqual(['B', 'A']);
    });
  });
});