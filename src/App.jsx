/* Provisional Result Search — 100% frontend. No backend, no API, no cloud DB. */
import { useCallback, useEffect, useState } from 'react'
import PrivacyBanner from './components/PrivacyBanner.jsx'
import Home from './views/Home.jsx'
import Import from './views/Import.jsx'
import Processing from './views/Processing.jsx'
import Stats from './views/Stats.jsx'
import Settings from './views/Settings.jsx'
import { processPdf, processResultImages } from './lib/processEngine.js'
import { clearCandidates, clearResults, clearMeta } from './lib/db.js'

const TABS = [
  ['home', '🔍 Search'],
  ['import', '📥 Import'],
  ['stats', '📊 Database'],
  ['settings', '⚙️ Settings'],
]

function initialTheme() {
  try {
    return localStorage.getItem('prs-theme') || 'light'
  } catch {
    return 'light'
  }
}

export default function App() {
  const [view, setView] = useState('home')
  const [theme, setThemeState] = useState(initialTheme)
  const [adminMode, setAdminMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [statsKey, setStatsKey] = useState(0)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('prs-theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const setTheme = (t) => setThemeState(t)

  const startProcessing = useCallback(async (job) => {
    // job === null means data was loaded another way (sample/import) -> stats
    if (!job) {
      setStatsKey((k) => k + 1)
      setView('stats')
      return
    }
    setError('')
    setBusy(true)
    setView('processing')
    try {
      // clear previous dataset first
      await clearCandidates()
      await clearResults()
      await clearMeta()

      setProgress({ stage: 'pdf', percent: 0, pagesDone: 0 })
      await processPdf(job.pdfFile, (p) => setProgress(p))

      setProgress({ stage: 'images', percent: 0, imagesDone: 0 })
      await processResultImages(job.imageFiles, (p) => setProgress(p))

      setProgress({ stage: 'matching', percent: 100 })
      const { setMeta } = await import('./lib/db.js')
      await setMeta('processedAt', new Date().toISOString())

      setStatsKey((k) => k + 1)
      setView('stats')
    } catch (err) {
      console.error(err)
      setError(
        'Processing failed: ' + (err?.message || String(err)) +
          ' — your previous data was cleared; please try again with valid files.'
      )
      setView('import')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <PrivacyBanner />

      {error && (
        <div className="no-print mx-auto mt-3 max-w-3xl rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
          <button onClick={() => setError('')} className="ml-3 underline">
            dismiss
          </button>
        </div>
      )}

      <main className="pb-24">
        {view === 'home' && <Home adminMode={adminMode} />}
        {view === 'import' && <Import onProcess={startProcessing} busy={busy} />}
        {view === 'processing' && <Processing progress={progress} />}
        {view === 'stats' && <Stats adminMode={adminMode} refreshKey={statsKey} />}
        {view === 'settings' && (
          <Settings
            theme={theme}
            setTheme={setTheme}
            adminMode={adminMode}
            setAdminMode={setAdminMode}
            onDataChanged={() => setStatsKey((k) => k + 1)}
          />
        )}
      </main>

      {/* bottom tab bar — mobile-first */}
      <nav className="no-print fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => !busy && setView(key)}
              disabled={busy && key !== 'processing'}
              className={`px-2 py-3 text-sm font-medium ${
                view === key || (busy && key === 'import')
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
