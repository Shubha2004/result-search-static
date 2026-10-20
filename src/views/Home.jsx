/* Home: search by Roll Number + Candidate Name. Queries IndexedDB only. */
import { useState } from 'react'
import { searchCandidate, searchByName } from '../lib/search.js'
import { countCandidates } from '../lib/db.js'
import ResultCard from '../components/ResultCard.jsx'

export default function Home({ adminMode }) {
  const [roll, setRoll] = useState('')
  const [name, setName] = useState('')
  const [state, setState] = useState({ phase: 'idle' }) // idle|loading|done
  const [dbEmpty, setDbEmpty] = useState(null)

  const doSearch = async (e) => {
    e?.preventDefault()
    const hasRoll = roll.trim().length > 0
    const hasName = name.trim().length > 0
    if (!hasRoll && !hasName) {
      setState({ phase: 'done', outcome: { status: 'not_found', reason: 'empty_both' } })
      return
    }
    setState({ phase: 'loading' })
    try {
      const outcome = hasRoll
        ? await searchCandidate(roll, name)
        : await searchByName(name)
      setState({ phase: 'done', outcome })
    } catch (err) {
      setState({ phase: 'done', outcome: { status: 'error', message: String(err?.message || err) } })
    }
  }

  const viewCandidate = async (candidate) => {
    setState({ phase: 'loading' })
    try {
      const outcome = await searchCandidate(candidate.rollNumber, '')
      setState({ phase: 'done', outcome })
    } catch (err) {
      setState({ phase: 'done', outcome: { status: 'error', message: String(err?.message || err) } })
    }
  }

  const clear = () => {
    setRoll('')
    setName('')
    setState({ phase: 'idle' })
  }

  const checkEmpty = async () => {
    const n = await countCandidates()
    setDbEmpty(n === 0)
  }
  if (dbEmpty === null) checkEmpty()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          PROVISIONAL RESULT SEARCH
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          Search your result using Roll Number, or by Name alone
        </p>
      </header>

      {dbEmpty && (
        <div className="no-print mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          No data yet. Go to <strong>Import Data</strong> to process your files, or
          load the sample dataset to try the app.
        </div>
      )}

      <form onSubmit={doSearch} className="no-print mt-6 space-y-4">
        <div>
          <label htmlFor="roll" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Roll Number
          </label>
          <input
            id="roll"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Enter Roll Number"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Candidate Name <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="name"
            autoComplete="off"
            placeholder="Enter Candidate Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={state.phase === 'loading'}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-lg font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {state.phase === 'loading' ? 'Searching…' : 'SEARCH RESULT'}
          </button>
          <button
            type="button"
            onClick={clear}
            className="rounded-lg border border-slate-300 px-6 py-3 text-lg font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            CLEAR
          </button>
        </div>
      </form>

      <div className="mt-6" aria-live="polite">
        {state.phase === 'done' && (
          <Outcome
            outcome={state.outcome}
            onRetry={clear}
            adminMode={adminMode}
            onSelectCandidate={viewCandidate}
          />
        )}
      </div>
    </div>
  )
}

function Outcome({ outcome, onRetry, adminMode, onSelectCandidate }) {
  switch (outcome.status) {
    case 'found':
      return (
        <div>
          <p className="mb-3 text-center font-semibold text-emerald-700 dark:text-emerald-300">
            ✓ Candidate found
          </p>
          <ResultCard candidate={outcome.candidate} result={outcome.result} adminMode={adminMode} />
          {outcome.duplicateRolls && <DupNote />}
        </div>
      )
    case 'found_unverified':
      return (
        <div>
          <p className="mb-3 text-center font-semibold text-amber-700 dark:text-amber-300">
            ✓ Candidate found — result needs verification
          </p>
          <ResultCard candidate={outcome.candidate} result={outcome.result} adminMode={adminMode} />
          <p className="mt-2 text-center text-sm text-amber-700 dark:text-amber-300">
            ⚠ OCR verification required: {outcome.result.verificationReason || 'unreadable fields'}.
            Please cross-check against the source image.
          </p>
        </div>
      )
    case 'ambiguous_results':
      return (
        <Notice tone="amber" title="Multiple result rows for this roll number">
          The roll number appears in more than one result row. Please verify against the
          source images before relying on a result.
          {adminMode && (
            <pre className="mt-2 overflow-x-auto text-left text-xs">
              {JSON.stringify(outcome.results, null, 2)}
            </pre>
          )}
        </Notice>
      )
    case 'name_ambiguous':
      return (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <p className="font-semibold">
            {outcome.candidates.length} candidates match that name
          </p>
          <p className="mt-1 text-sm">Select your record to view the result:</p>
          <ul className="mt-3 space-y-2">
            {outcome.candidates.map((c) => (
              <li
                key={c.rollNumber}
                className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-white px-3 py-2 dark:border-blue-800 dark:bg-slate-800"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Roll: {c.rollNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectCandidate(c)}
                  className="no-print shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  View result
                </button>
              </li>
            ))}
          </ul>
        </div>
      )
    case 'name_mismatch':
      return (
        <Notice tone="red" title="Name does not match">
          The name you entered does not match the admit-card record for roll number{' '}
          <strong>{outcome.candidate.rollNumber}</strong>. For privacy, no result is shown.
          <Suggestions />
        </Notice>
      )
    case 'result_unavailable':
      return (
        <div>
          <p className="mb-3 text-center font-semibold text-blue-700 dark:text-blue-300">
            ✓ Candidate found ({outcome.candidate.name})
          </p>
          <Notice tone="blue" title="Result not available">
            Candidate found, but provisional result information is not available in the
            provided result data.
          </Notice>
          {outcome.duplicateRolls && <DupNote />}
        </div>
      )
    case 'not_found':
    default:
      return (
        <Notice tone="red" title="No matching candidate was found.">
          {outcome.reason === 'empty_both'
            ? 'Please enter a roll number or a name.'
            : outcome.reason === 'name'
              ? 'No candidate matches that name. Please check the spelling and try again.'
              : 'Please check your Roll Number and Name and try again.'}
          <Suggestions />
          <button
            onClick={onRetry}
            className="no-print mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-600"
          >
            Search again
          </button>
        </Notice>
      )
  }
}

function Suggestions() {
  return (
    <ul className="mt-2 list-disc pl-5 text-left text-sm">
      <li>Check the Roll Number</li>
      <li>Check the spelling of the Name</li>
      <li>Try searching with Roll Number only</li>
    </ul>
  )
}

function DupNote() {
  return (
    <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">
      ⚠ This roll number appears more than once in the admit-card data — flagged for review.
    </p>
  )
}

function Notice({ tone, title, children }) {
  const styles = {
    red: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
    blue: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
  }
  return (
    <div className={`rounded-lg border p-4 ${styles[tone]}`}>
      <p className="font-semibold">{title}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  )
}
