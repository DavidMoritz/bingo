import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handler } from '../handler'

// Mock the global fetch
global.fetch = vi.fn()

describe('generate-phrases handler', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules() // Clear modules cache
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: 'test-key' }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  const mockEvent = (genre: string) => ({
    arguments: { genre },
  })

  it('should return a list of phrases on successful API call', async () => {
    const mockPhrases = ['phrase 1', 'phrase 2']
    const mockApiResponse = {
      content: [{ text: JSON.stringify(mockPhrases) }],
    }
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    })

    const result = await handler(mockEvent('sci-fi'))

    expect(fetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', expect.any(Object))
    expect(result.genre).toBe('sci-fi')
    expect(result.phrases).toEqual(mockPhrases)
  })

  it('should throw an error if ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY
    await expect(handler(mockEvent('fantasy'))).rejects.toThrow('ANTHROPIC_API_KEY not configured')
  })

  it('should throw an error on API failure', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve('Server exploded'),
    })

    await expect(handler(mockEvent('western'))).rejects.toThrow('AI generation failed: 500 Internal Server Error - Server exploded')
  })

  it('should throw an error if response content is missing', async () => {
    const mockApiResponse = { content: [] } // Missing text
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    })

    await expect(handler(mockEvent('pirates'))).rejects.toThrow('No content returned from AI')
  })
  
  it('should handle and clean up markdown in the AI response', async () => {
    const mockPhrases = ['clean phrase 1', 'clean phrase 2'];
    const rawContent = '```json\n' + JSON.stringify(mockPhrases) + '\n```';
    const mockApiResponse = {
      content: [{ text: rawContent }],
    };
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    const result = await handler(mockEvent('cyberpunk'));

    expect(result.phrases).toEqual(mockPhrases);
  });


  it('should throw an error if the parsed phrase list is not an array', async () => {
    const mockApiResponse = {
      content: [{ text: '{"data": "not an array"}' }],
    }
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    })

    await expect(handler(mockEvent('history'))).rejects.toThrow('Invalid phrase list returned from AI');
  });

  it('should throw an error if the parsed phrase list is empty', async () => {
    const mockApiResponse = {
      content: [{ text: '[]' }],
    }
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    })

    await expect(handler(mockEvent('nature'))).rejects.toThrow('Invalid phrase list returned from AI');
  });
})
