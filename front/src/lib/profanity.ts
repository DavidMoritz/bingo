import * as filter from 'leo-profanity'

// Initialize the profanity filter
filter.loadDictionary('en')

/**
 * Check if text contains profanity
 */
export function containsProfanity(text: string): boolean {
  const hasProfanity = filter.check(text)
  if (hasProfanity) {
    console.warn('[Profanity Filter] Blocked text:', filter.clean(text))
  }
  return hasProfanity
}

/**
 * Check if any phrases in an array contain profanity
 */
export function anyPhrasesContainProfanity(phrases: string[]): boolean {
  const profanePhrases = phrases.filter(phrase => filter.check(phrase))
  if (profanePhrases.length > 0) {
    console.warn('[Profanity Filter] Blocked phrases:', profanePhrases.map(p => filter.clean(p)))
  }
  return profanePhrases.length > 0
}

/**
 * Clean profanity from text (replace with asterisks)
 */
export function cleanProfanity(text: string): string {
  return filter.clean(text)
}

/**
 * Check if content (title + phrases) has any profanity
 */
export function contentHasProfanity(title: string, phrases: string[]): boolean {
  let hasProfanity = false

  if (filter.check(title)) {
    console.warn('[Profanity Filter] Blocked title:', filter.clean(title))
    hasProfanity = true
  }

  const profanePhrases = phrases.filter(phrase => filter.check(phrase))
  if (profanePhrases.length > 0) {
    console.warn('[Profanity Filter] Blocked phrases:', profanePhrases.map(p => filter.clean(p)))
    hasProfanity = true
  }

  return hasProfanity
}
