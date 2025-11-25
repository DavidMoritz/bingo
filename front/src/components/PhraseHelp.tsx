import { useState } from 'react'

export function PhraseHelp() {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setShowHelp(true)}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/10"
        aria-label="Phrase input help"
      >
        ?
      </button>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur">
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-950/90 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Phrases</p>
                <h3 className="text-2xl font-bold text-white">Formatting tips</h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
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
                  <span className="font-semibold text-white">Showcase:</span> The first three entries are previewed when players search public boards.
                </li>
                <li>
                  <span className="font-semibold text-white">Priority:</span> Start a line with an asterisk to force it onto the board, (e.g.{' '}
                  <code className="rounded bg-slate-800 px-1 py-0.5">*Front row seats</code>).
                </li>
                <li>
                  <span className="font-semibold text-white">OR options:</span> Use a pipe <code className="rounded bg-slate-800 px-1 py-0.5">|</code>{' '}
                  to randomize variety within a single phrase, <br />(e.g. <code className="rounded bg-slate-800 px-1 py-0.5">Melting snow cone | Melting ice cream)</code>. <br />The player will see one of the OR options on their board, but not both.
                </li>
                <li>
                  Aim for at least 30 phrases to increase variety.
                </li>
                <li>
                  <span className="font-semibold text-white">Grid scales with phrase count:</span>
                  <table className="mx-auto mt-2 w-[70%] border-collapse border border-white/20">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="border border-white/20 px-3 py-2 text-center">Phrases</th>
                        <th className="border border-white/20 px-3 py-2 text-center">Grid</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-white/20 px-3 py-2 text-center">1-4</td>
                        <td className="border border-white/20 px-3 py-2 text-center">1×1</td>
                      </tr>
                      <tr>
                        <td className="border border-white/20 px-3 py-2 text-center">5-8</td>
                        <td className="border border-white/20 px-3 py-2 text-center">2×2</td>
                      </tr>
                      <tr>
                        <td className="border border-white/20 px-3 py-2 text-center">9-15</td>
                        <td className="border border-white/20 px-3 py-2 text-center">3×3</td>
                      </tr>
                      <tr>
                        <td className="border border-white/20 px-3 py-2 text-center">16-23</td>
                        <td className="border border-white/20 px-3 py-2 text-center">4×4</td>
                      </tr>
                      <tr>
                        <td className="border border-white/20 px-3 py-2 text-center">24+</td>
                        <td className="border border-white/20 px-3 py-2 text-center">5×5</td>
                      </tr>
                    </tbody>
                  </table>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
