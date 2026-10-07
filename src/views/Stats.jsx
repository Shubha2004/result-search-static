/* Database Statistics: totals, matched/unmatched, OCR-verification queue. */
import { useEffect, useState } from 'react'
import { computeStats } from '../lib/processEngine.js'
import { getMeta, getDB } from '../lib/db.js'

export default function Stats({ adminMode, refreshKey }) {
  const [stats, setStats] = useState(null)
  const [flagged, setFlagged] = useState([])
  const [meta, setMeta] = useState({})

  useEffect(() => {
    let live = true
    ;(async () => {
      const s = await computeStats()
      if (!live) return
      setStats(s)
      const db = await getDB()
      const results = await db.getAll('results')
      setFlagged(results.filter((r) => r.needsVerification).slice(0, 100))
      const keys = ['pdfFileName', 'pdfPages', 'imagesTotal', 'processedAt', 'pdfProcessedAt', 'imagesProcessedAt', 'sampleData']
      const m = {}
      for (const k of keys) m[k] = await getMeta(k)
      setMeta(m)
    })()
    return () => {
      live = false
    }
  }, [refreshKey])

  if (!stats) {
    return <p className="p-8 text-center text-slate-500">Loading statistics…</p>
  }

  const cards = [
    ['Total PDF Pages', stats.pdfPages],
    ['Candidates Extracted', stats.candidates],
    ['Result Records', stats.resultRows],
    ['Successfully Matched', stats.matched],
    ['Unmatched Candidates', stats.unmatchedCandidates],
    ['OCR Verification Required', stats.flagged],
  ]

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Database Statistics</h2>
      {meta.sampleData && (
        <p className="mt-1 inline-block rounded bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-900 dark:text-violet-200">
          SYNTHETIC SAMPLE DATA
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {(meta.pdfFileName || meta.imagesTotal) && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <p><strong>Admit-card PDF:</strong> {meta.pdfFileName || '—'}</p>
          <p><strong>Result images:</strong> {meta.imagesTotal ?? '—'}</p>
          {(meta.pdfProcessedAt || meta.processedAt) && (
            <p><strong>Processed:</strong> {new Date(meta.pdfProcessedAt || meta.processedAt).toLocaleString()}</p>
          )}
        </div>
      )}

      {adminMode && flagged.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold text-slate-900 dark:text-white">
            OCR Verification Required ({flagged.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            These rows were not auto-corrected. Check them against the source images.
          </p>
          <div className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-amber-200 dark:border-amber-800">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-amber-50 dark:bg-amber-950">
                <tr>
                  <th className="p-2">Roll</th>
                  <th className="p-2">SGPA M/A</th>
                  <th className="p-2">Code</th>
                  <th className="p-2">Image</th>
                  <th className="p-2">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {flagged.map((r) => (
                  <tr key={r.id}>
                    <td className="p-2 font-mono">{r.rollNumber}</td>
                    <td className="p-2 font-mono">{r.sgpaMajor ?? '–'} / {r.sgpaAll ?? '–'}</td>
                    <td className="p-2 font-mono">{r.resultCode ?? '?'}</td>
                    <td className="p-2">{r.sourceImage ?? '–'}</td>
                    <td className="p-2 text-amber-700 dark:text-amber-300">{r.verificationReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
