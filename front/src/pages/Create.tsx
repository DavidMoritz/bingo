import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { useSearch } from '@tanstack/react-router'
import { createPhraseSet, suggestPhrases, listAvailableGenres } from '../lib/api'
import type { PhraseSet } from '../types'
import { useUserInfo } from '../contexts/UserContext'

export function CreatePage() {
  const search = useSearch({ from: '/create' }) as any
  const { displayName } = useUserInfo()
  const { user } = useAuthenticator((context) => [context.user])
  const ownerProfileId =
    (user as any)?.attributes?.sub ||
    user?.signInDetails?.loginId ||
    (user as any)?.attributes?.email ||
    user?.username ||
    user?.userId ||
    'guest'
  const [title, setTitle] = useState('VC Bingo')
  const [isTitleDirty, setIsTitleDirty] = useState(false)
  const [genre, setGenre] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [freeSpace, setFreeSpace] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const genreInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Pre-fill form from rebuild params
  useEffect(() => {
    if (search?.rebuild) {
      const params = new URLSearchParams(search.rebuild)
      const titleParam = params.get('title')
      const phrasesParam = params.get('phrases')
      const isPublicParam = params.get('isPublic')
      const freeSpaceParam = params.get('freeSpace')

      if (titleParam) {
        setTitle(titleParam)
        setIsTitleDirty(true)
      }
      if (phrasesParam) {
        setPhrasesText(phrasesParam)
        setIsPhraseDirty(true)
      }
      if (isPublicParam) setIsPublic(isPublicParam === 'true')
      if (freeSpaceParam) setFreeSpace(freeSpaceParam === 'true')
    }
  }, [search])

  // Fetch available genres for autocomplete
  const { data: availableGenres = [] } = useQuery({
    queryKey: ['available-genres'],
    queryFn: listAvailableGenres,
  })

  // Filter genres based on input
  const filteredGenres = genre.trim()
    ? availableGenres.filter((g) => g.toLowerCase().startsWith(genre.toLowerCase()))
    : availableGenres
  const [phrasesText, setPhrasesText] = useState(
    ['AI-powered', 'Runway', 'Synergy', 'Pivot', 'We are different', 'Let me circle back', 'Can we park this?'].join(
      '\n'
    )
  )
  const [result, setResult] = useState<PhraseSet | null>(null)
  const [showPhraseHelp, setShowPhraseHelp] = useState(false)
  const [isPhraseDirty, setIsPhraseDirty] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  const mutation = useMutation({
    mutationFn: (input: {
      title: string
      phrases: string[]
      isPublic: boolean
      freeSpace: boolean
      ownerProfileId: string
      ownerDisplayName?: string
    }) => createPhraseSet(input),
    onSuccess: (data) => setResult(data),
  })

  const suggestMutation = useMutation({
    mutationFn: (input: { genre: string }) => suggestPhrases(input.genre),
    onSuccess: (phrases) => {
      // Clear progress interval and set to 100%
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setProgress(100)

      if (isPhraseDirty) {
        const existing = parseLines(phrasesText)
        const merged = mergeSuggestions(existing, phrases, 30)
        setPhrasesText(merged.join('\n'))
      } else {
        setPhrasesText(phrases.join('\n'))
      }

      // Reset progress after a brief moment
      setTimeout(() => setProgress(0), 500)
    },
    onError: () => {
      // Clear progress on error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setProgress(0)
    },
  })

  const phrases = phrasesText
    .split('\n')
    .map((phrase) => phrase.trim())
    .filter(Boolean)

  const gridSize =
    phrases.length < 4 ? 1 : phrases.length < 9 ? 2 : phrases.length < 16 ? 3 : phrases.length < 24 ? 4 : 5
  const nextThreshold =
    gridSize === 1 ? 4 : gridSize === 2 ? 9 : gridSize === 3 ? 16 : gridSize === 4 ? 24 : null
  const neededForNext = nextThreshold ? Math.max(0, nextThreshold - phrases.length) : null
  const freeSpaceLocked = phrases.length < 25
  const effectiveFreeSpace = freeSpaceLocked ? true : freeSpace

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    mutation.reset()
    setResult(null)

    if (!title.trim() || phrases.length === 0) {
      mutation.reset()
      return
    }

    try {
      await mutation.mutateAsync({
        title: title.trim(),
        phrases,
        isPublic,
        freeSpace: effectiveFreeSpace,
        ownerProfileId,
        ownerDisplayName: displayName || (ownerProfileId === 'guest' ? 'guest' : undefined),
      })
    } catch {
      console.log('Error creating phrase set')
      // handled by mutation.error
    }
  }

  async function handleSuggest(event: React.FormEvent) {
    event.preventDefault()
    suggestMutation.reset()

    const trimmedGenre = genre.trim()

    // Validate single word
    if (!trimmedGenre) return
    if (/\s/.test(trimmedGenre)) {
      alert('Please enter only one word for the genre')
      return
    }

    // Auto-populate title if not dirty
    if (!isTitleDirty) {
      // Capitalize first letter of genre for title
      const capitalizedGenre = trimmedGenre.charAt(0).toUpperCase() + trimmedGenre.slice(1)
      setTitle(capitalizedGenre)
    }

    setShowSuggestions(false)

    // Start progress bar animation (15 seconds)
    setProgress(0)
    let currentProgress = 0
    progressIntervalRef.current = setInterval(() => {
      currentProgress += 100 / 150 // Increment every 100ms for 15 seconds
      if (currentProgress >= 100) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        currentProgress = 100
      }
      setProgress(currentProgress)
    }, 100)

    try {
      await suggestMutation.mutateAsync({ genre: trimmedGenre })
    } catch {
      // handled by mutation.error
    }
  }

  function handleGenreChange(value: string) {
    // Only allow single word (no spaces)
    const singleWord = value.replace(/\s+/g, '')
    setGenre(singleWord)
    setShowSuggestions(singleWord.length > 0)
    setSelectedIndex(-1)
  }

  function selectGenre(selectedGenre: string) {
    setGenre(selectedGenre)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    genreInputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || filteredGenres.length === 0) {
      // If Tab and no suggestions, just let it behave normally
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < filteredGenres.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (selectedIndex >= 0 && selectedIndex < filteredGenres.length) {
        e.preventDefault()
        selectGenre(filteredGenres[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setShowSuggestions(false)
      setSelectedIndex(-1)
    } else if (e.key === 'Tab') {
      // Select highlighted item if exists, otherwise select first option
      if (filteredGenres.length > 0) {
        e.preventDefault()
        const indexToSelect = selectedIndex >= 0 ? selectedIndex : 0
        selectGenre(filteredGenres[indexToSelect])
      }
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const clickedOutsideInput = genreInputRef.current && !genreInputRef.current.contains(target)
      const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target)

      if (clickedOutsideInput && clickedOutsideDropdown) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  function parseLines(text: string): string[] {
    return text
      .split('\n')
      .map((phrase) => phrase.trim())
      .filter(Boolean)
  }

  function mergeSuggestions(existing: string[], suggestions: string[], limit: number): string[] {
    const seen = new Set(existing.map((p) => p.toLowerCase()))
    const combined = [...existing]

    for (const suggestion of suggestions) {
      const key = suggestion.toLowerCase()
      if (seen.has(key)) continue
      combined.push(suggestion)
      seen.add(key)
      if (combined.length >= limit) break
    }

    return combined.slice(0, limit)
  }

  async function handleShare() {
    if (!result) return

    const shareUrl = `${window.location.origin}/game/${result.code}`
    const shareText = `I created a bingo card called "${result.title}" - want to play? 🎲\n\n${shareUrl}`

    // Try Web Share API first (native share on mobile/desktop)
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
        })
        setShareStatus('idle')
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err)
          setShareStatus('error')
        }
      }
    } else {
      // Fallback: copy link to clipboard with message
      try {
        await navigator.clipboard.writeText(shareText)
        setShareStatus('copied')
        setTimeout(() => setShareStatus('idle'), 2000)
      } catch (err) {
        console.error('Copy failed:', err)
        setShareStatus('error')
        setTimeout(() => setShareStatus('idle'), 2000)
      }
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1.2fr]">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Creator</p>
            <h2 className="text-2xl font-bold text-white">Create a phrase set</h2>
            <p className="text-sm text-slate-300">Add a title and paste phrases, one per line.</p>
          </div>
          <span className="rounded-full bg-teal-400/20 px-3 py-1 text-xs font-semibold text-teal-200">
            POST /phrase-sets
          </span>
        </header>

        <form onSubmit={handleSuggest} className="mb-4 space-y-3" aria-label="Suggest Phrases Form">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="genre">
              Genre (one word)
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:max-w-sm">
                <input
                  ref={genreInputRef}
                  id="genre"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white shadow-inner shadow-black/40 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-300/50"
                  value={genre}
                  onChange={(e) => handleGenreChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowSuggestions(genre.length > 0 || availableGenres.length > 0)}
                  placeholder="unicorns, romcom, sci-fi..."
                  autoComplete="off"
                />
                {showSuggestions && filteredGenres.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/10 bg-slate-900 shadow-lg"
                  >
                    {filteredGenres.map((g, index) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => selectGenre(g)}
                        className={`w-full px-4 py-2 text-left text-sm transition ${
                          index === selectedIndex
                            ? 'bg-teal-400/20 text-teal-300'
                            : 'text-white hover:bg-white/10'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={suggestMutation.isPending}
              >
                {suggestMutation.isPending ? 'Generating…' : 'Suggest phrases'}
              </button>
            </div>
            {suggestMutation.isPending && (
              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-teal-400 to-teal-300 transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-teal-300">
                  {progress < 50
                    ? 'Contacting AI...'
                    : progress < 90
                    ? 'Generating creative phrases...'
                    : 'Almost done...'}
                </p>
              </div>
            )}
            {!suggestMutation.isPending && suggestMutation.error ? (
              <p className="text-xs text-rose-300">{(suggestMutation.error as Error).message}</p>
            ) : !suggestMutation.isPending ? (
              <p className="text-xs text-slate-400">
                Pick a cached genre or type a new one to generate with AI (first time takes ~10s)
              </p>
            ) : null}
          </div>
        </form>

        <form onSubmit={handleSubmit} className="space-y-5" aria-label="Create Phrase Set Form">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white shadow-inner shadow-black/40 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-300/50"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setIsTitleDirty(true)
              }}
              placeholder="Board title"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="phrases">
                Phrases
              </label>
              <button
                type="button"
                onClick={() => setShowPhraseHelp(true)}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/10"
                aria-label="Phrase input help"
              >
                ?
              </button>
            </div>
            <textarea
              id="phrases"
              className="min-h-[200px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white shadow-inner shadow-black/40 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-300/50"
              value={phrasesText}
              onChange={(e) => {
                setIsPhraseDirty(true)
                setPhrasesText(e.target.value)
              }}
              placeholder="Each line becomes a cell"
            />
            <p className="text-xs text-slate-400">
              Currently {phrases.length} phrase{phrases.length === 1 ? '' : 's'}: {gridSize}×{gridSize} grid
              {nextThreshold ? ` — ${neededForNext} needed for ${gridSize + 1}×${gridSize + 1}.` : ''}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 hover:border-white/20">
              <input
                type="checkbox"
                className="h-4 w-4 accent-teal-300"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              <span>
                <span className="font-semibold text-white">Public</span>
                <span className="block text-xs text-slate-400">Allow others to discover this set.</span>
              </span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 hover:border-white/20">
              <input
                type="checkbox"
                className="h-4 w-4 accent-teal-300"
                checked={effectiveFreeSpace}
                disabled={freeSpaceLocked}
                onChange={(e) => {
                  if (freeSpaceLocked) {
                    setFreeSpace(true)
                    return
                  }
                  setFreeSpace(e.target.checked)
                }}
              />
              <span>
                <span className="font-semibold text-white">Free space</span>
                <span className="block text-xs text-slate-400">
                  {freeSpaceLocked
                    ? 'Automatically enabled until you have 25+ phrases.'
                    : 'Keep the center FREE; toggle off to use another phrase.'}
                </span>
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center justify-center rounded-xl bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-400/30 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving…' : 'Create code'}
            </button>
            {mutation.error ? (
              <span className="text-sm text-rose-300">{(mutation.error as Error).message}</span>
            ) : null}
          </div>
        </form>
      </section>

      <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
        <h3 className="text-lg font-semibold text-white">Result</h3>
        {!result && <p className="text-sm text-slate-300">Submit to generate a shareable code.</p>}

        {result ? (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Share this</p>
            <div className="text-3xl font-bold text-white">{result.code}</div>
            <p className="text-sm text-slate-300">{result.title}</p>
            <p className="text-xs text-slate-400">Created at {new Date(result.createdAt).toLocaleString()}</p>
            <p className="text-xs text-slate-400">Phrases: {result.phrases.length}</p>
            <button
              onClick={handleShare}
              className="mt-2 w-full rounded-xl bg-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-400/30 transition hover:translate-y-[-1px] hover:bg-teal-300"
            >
              {shareStatus === 'copied' ? '✓ Link copied!' : shareStatus === 'error' ? 'Error sharing' : 'Share game'}
            </button>
          </div>
        ) : null}
      </aside>

      {showPhraseHelp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur">
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-950/90 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Phrases</p>
                <h3 className="text-2xl font-bold text-white">Formatting tips</h3>
              </div>
              <button
                onClick={() => setShowPhraseHelp(false)}
                className="rounded-full border border-white/15 px-3 py-1 text-sm font-semibold text-white transition hover:bg-white/10"
                aria-label="Close phrase help"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <p>Each line becomes one candidate phrase for the board.</p>
              <ul className="space-y-2">
                <li>
                  <span className="font-semibold text-white">One per line:</span> Write phrases on separate lines.
                </li>
                <li>
                  <span className="font-semibold text-white">OR options:</span> Use a pipe <code className="rounded bg-slate-800 px-1 py-0.5">|</code>{' '}
                  to randomize one choice, e.g. <code className="rounded bg-slate-800 px-1 py-0.5">Snow cone | Churro</code>.
                </li>
                <li>
                  <span className="font-semibold text-white">Priority:</span> Start a line with an asterisk to force it onto the board, e.g.{' '}
                  <code className="rounded bg-slate-800 px-1 py-0.5">*Front row seats</code>.
                </li>
                <li>
                  Aim for at least 30 phrases for a full 5×5 grid (center is FREE, so you need 24+ to fill it).
                </li>
                <li>Grid scales with phrase count: <br></br>&lt;4 → 1×1, &lt;9 → 2×2, &lt;16 → 3×3, &lt;24 → 4×4, otherwise 5×5.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default CreatePage
