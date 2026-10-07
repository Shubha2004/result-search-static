/* Professional result card — only fields that actually exist are shown. */
export default function ResultCard({ candidate, result, adminMode }) {
  const rows = [
    ['Candidate Name', candidate.name],
    ['Roll Number', candidate.rollNumber],
    ['Registration Number', candidate.registrationNumber],
    ['College', candidate.college],
    ['Result Status', resultLabel(result.resultCode)],
    ['SGPA (Major)', result.sgpaMajor],
    ['SGPA (All)', result.sgpaAll],
    ['Credit Retained In', result.creditRetained],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '')

  const qualified = result.resultCode === 'Q'

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div
        className={`px-5 py-3 text-center text-lg font-bold tracking-wide text-white ${
          qualified ? 'bg-emerald-600' : 'bg-amber-600'
        }`}
      >
        PROVISIONAL RESULT
      </div>
      <dl className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3 px-5 py-2.5 text-sm sm:text-base">
            <dt className="w-40 shrink-0 font-medium text-slate-500 dark:text-slate-400">
              {label}
            </dt>
            <dd className="font-semibold text-slate-900 dark:text-slate-100">
              {label === 'Result Status' ? (
                <span
                  className={`inline-block rounded-full px-3 py-0.5 text-sm font-bold ${
                    qualified
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                  }`}
                >
                  {value}
                </span>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-slate-100 px-5 py-2 text-xs text-slate-400 dark:border-slate-800">
        Source: Provisional Result
      </div>
      {adminMode && (
        <details className="border-t border-slate-100 px-5 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <summary className="cursor-pointer font-medium">View Source</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-2 dark:bg-slate-800">
            {JSON.stringify(
              {
                admitCardPage: candidate.pdfPage,
                admitCardFile: candidate.sourceFile,
                resultImage: result.sourceImage,
                resultFile: result.sourceFile,
                rawResultLine: result.rawLine,
              },
              null,
              2
            )}
          </pre>
        </details>
      )}
    </div>
  )
}

function resultLabel(code) {
  if (code === 'Q') return 'QUALIFIED'
  if (code === 'SNC') return 'SEMESTER NOT QUALIFIED'
  return code
}
