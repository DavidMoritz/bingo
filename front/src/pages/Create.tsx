import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { createPhraseSet, suggestPhrases } from '../lib/api'
import type { PhraseSet } from '../types'
import { useUserInfo } from '../contexts/UserContext'

export function CreatePage() {
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
  const [genre, setGenre] = useState('Christmas')
  const [isPublic, setIsPublic] = useState(false)
  const [freeSpace, setFreeSpace] = useState(true)
  const [phrasesText, setPhrasesText] = useState(
    ['AI-powered', 'Runway', 'Synergy', 'Pivot', 'We are different', 'Let me circle back', 'Can we park this?'].join(
      '\n'
    )
  )
  const [result, setResult] = useState<PhraseSet | null>(null)
  const [showPhraseHelp, setShowPhraseHelp] = useState(false)
  const [isPhraseDirty, setIsPhraseDirty] = useState(false)

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
      if (isPhraseDirty) {
        const existing = parseLines(phrasesText)
        const merged = mergeSuggestions(existing, phrases, 30)
        setPhrasesText(merged.join('\n'))
      } else {
        setPhrasesText(phrases.join('\n'))
      }
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
        ownerDisplayName: displayName || undefined,
      })
    } catch {
      console.log('Error creating phrase set')
      // handled by mutation.error
    }
  }

  async function handleSuggest(event: React.FormEvent) {
    event.preventDefault()
    suggestMutation.reset()

    if (!genre.trim()) return
    try {
      await suggestMutation.mutateAsync({ genre: genre.trim() })
    } catch {
      // handled by mutation.error
    }
  }

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

        <form onSubmit={handleSuggest} className="mb-4 space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="genre">
              Genre or vibe (AI suggestions)
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="genre"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white shadow-inner shadow-black/40 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-300/50 sm:max-w-sm"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Christmas party, startup pitch, office meeting…"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={suggestMutation.isPending}
              >
                {suggestMutation.isPending ? 'Generating…' : 'Suggest phrases'}
              </button>
            </div>
            {suggestMutation.error ? (
              <p className="text-xs text-rose-300">{(suggestMutation.error as Error).message}</p>
            ) : (
              <p className="text-xs text-slate-400">
                We’ll auto-fill about 24–30 phrases. If you’ve typed your own, we’ll only add until you hit 30.
              </p>
            )}
          </div>
        </form>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white shadow-inner shadow-black/40 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-300/50"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              Currently {phrases.length} phrase{phrases.length === 1 ? '' : 's'}: {gridSize}×{gridSize} grid &mdash;{' '}
              {nextThreshold ? `${neededForNext} needed for ${gridSize + 1}×${gridSize + 1}.` : 'Max size reached.'}
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
                  Center is FREE, so aim for at least 24 phrases to fill the grid.
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
