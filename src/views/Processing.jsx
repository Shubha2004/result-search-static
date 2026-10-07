/* Processing view: live progress for PDF pages + result images. */
export default function Processing({ progress, onCancel }) {
  const p = progress || { stage: 'starting', percent: 0 }

  const stageLabel = {
    starting: 'Starting…',
    pdf: 'Processing PDF pages…',
    'pdf-ocr': 'OCR on scanned PDF page…',
    images: 'OCR on result images…',
    matching: 'Matching candidates with results…',
    done: 'Done',
  }[p.stage] || p.stage

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h2 className="text-center text-xl font-bold text-slate-900 dark:text-white">
        Processing Files
      </h2>
      <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
        {stageLabel} — keep this tab open.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, p.percent || 0))}%` }}
          />
        </div>
        <p className="mt-2 text-center text-2xl font-bold text-slate-900 dark:text-white">
          {p.percent || 0}%
        </p>

        <dl className="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
          {p.stage === 'pdf' || p.stage === 'pdf-ocr' ? (
            <>
              <Stat label="PDF Processing" value={`${p.pagesDone || 0} / ${p.pagesTotal || '?'}`} mono />
              <Stat label="Candidates extracted" value={p.candidatesFound || 0} mono />
            </>
          ) : null}
          {p.stage === 'images' ? (
            <>
              <Stat label="Result images processed" value={`${p.imagesDone || 0} / ${p.imagesTotal || '?'}`} mono />
              <Stat label="Result records extracted" value={p.rowsFound || 0} mono />
            </>
          ) : null}
          {p.note ? (
            <p className="truncate pt-1 text-xs text-slate-400">{p.note}</p>
          ) : null}
        </dl>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Large PDFs are processed page-by-page so the browser stays responsive.
      </p>
    </div>
  )
}

function Stat({ label, value, mono }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd className={mono ? 'font-mono font-semibold' : 'font-semibold'}>{value}</dd>
    </div>
  )
}
