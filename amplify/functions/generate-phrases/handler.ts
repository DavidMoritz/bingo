import type { Schema } from '../../data/resource'

export const handler: Schema['generatePhrases']['functionHandler'] = async (event) => {
  const { genre } = event.arguments

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  console.log('API Key exists:', !!anthropicApiKey, 'Length:', anthropicApiKey?.length)

  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  console.log('Generating phrases for genre:', genre)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Generate exactly 30 fun, creative bingo phrases for the theme "${genre}".

Requirements:
- Each phrase should be 2-6 words
- Make them specific and memorable
- Mix obvious and unexpected items
- Keep them family-friendly
- Return ONLY a JSON array of strings, nothing else

Example for "beach": ["sunscreen application", "lost flip flop", "sandcastle competition", "seagull attack", "beach volleyball"]

Now generate 30 phrases for "${genre}":`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Anthropic API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: error,
      })
      throw new Error(`AI generation failed: ${response.status} ${response.statusText} - ${error}`)
    }

    const data = await response.json()
    const content = data.content?.[0]?.text

    if (!content) {
      throw new Error('No content returned from AI')
    }

    // Parse the JSON array from the response
    // Claude sometimes wraps it in markdown, so clean it first
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const phrases: string[] = JSON.parse(cleaned)

    if (!Array.isArray(phrases) || phrases.length === 0) {
      throw new Error('Invalid phrase list returned from AI')
    }

    return {
      genre: genre.toLowerCase(),
      phrases: phrases.slice(0, 30), // Limit to 30
    }
  } catch (error) {
    console.error('Error generating phrases:', error)
    throw new Error(`Failed to generate phrases for "${genre}": ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
