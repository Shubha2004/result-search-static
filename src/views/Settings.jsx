/* Settings: export/import, delete DB, dark mode, admin mode. */
import { useRef, useState } from 'react'
import { exportJSON, exportCSV, readJsonFile, downloadFile } from '../lib/exportImport.js'
import { importAll, deleteDatabase } from '../lib/db.js'

export default function Settings({ theme, setTheme, adminMode, setAdminMode, onDataChanged }) {
  const [msg, setMsg] = useState('')
  const [confirming, setConfirming] = useState(false)
  const fileRef = useRef(null)

  const doImport = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setMsg('')
    try {
      const data = await readJsonFile(f)
      await importAll(data)
      setMsg(`Imported ${data.candidates.length} candidates and ${data.results.length} results.`)
      onDataChanged()
    } catch (err) {
      setMsg('Import failed: ' + err.message)
    }
    e.target.value = ''
  }

  const doDelete = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    await deleteDatabase()
    setConfirming(false)
    setMsg('Local database deleted.')
    onDataChanged()
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
      {msg && (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          {msg}
        </div>
      )}

      {/* Appearance */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="font-semibold text-slate-900 dark:text-white">Appearance</p>
        <div className="mt-2 flex gap-2">
          {[
            ['light', '☀️ Light Mode'],
            ['dark', '🌙 Dark Mode'],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTheme(v)}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium ${
                theme === v
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200'
                  : 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Admin mode */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="font-semibold text-slate-900 dark:text-white">Admin mode</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Reveals source-traceability ("View Source") and the OCR verification queue.
        </p>
        <button
          onClick={() => setAdminMode(!adminMode)}
          className={`mt-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold ${
            adminMode
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : 'border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200'
          }`}
        >
          {adminMode ? 'Admin mode: ON (tap to turn off)' : 'Turn on admin mode'}
        </button>
      </section>

      {/* Import / Export */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="font-semibold text-slate-900 dark:text-white">Import / Export</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Export the processed dataset, or import a previously exported{' '}
          <code>result-database.json</code>.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            onClick={() => exportJSON().then(() => setMsg('Exported result-database.json'))}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            EXPORT JSON
          </button>
          <button
            onClick={() => exportCSV().then(() => setMsg('Exported result-database.csv'))}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            EXPORT CSV
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
          >
            IMPORT DATA
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={doImport} />
      </section>

      {/* Danger zone */}
      <section className="mt-4 rounded-xl border border-red-200 bg-white p-4 dark:border-red-800 dark:bg-slate-900">
        <p className="font-semibold text-red-700 dark:text-red-300">Delete Local Database</p>
        {!confirming ? (
          <button
            onClick={doDelete}
            className="mt-2 w-full rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 dark:border-red-700 dark:text-red-300"
          >
            DELETE LOCAL DATABASE
          </button>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-red-700 dark:text-red-300">
              Are you sure? This will remove all locally stored candidate and result data.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={doDelete}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Yes, delete everything
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium dark:border-slate-600 dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-slate-400">
        Provisional Result Search — 100% static. No backend, no tracking.
      </p>
    </div>
  )
}
