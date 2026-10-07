/* Import Data: upload Admit Card PDF + result images, then PROCESS FILES.
   Also offers the clearly-labeled synthetic sample dataset. */
import { useRef, useState } from 'react'
import { loadSampleData } from '../lib/sampleData.js'

export default function Import({ onProcess, busy }) {
  const [pdfFile, setPdfFile] = useState(null)
  const [imageFiles, setImageFiles] = useState([])
  const [error, setError] = useState('')
  const [sampleLoading, setSampleLoading] = useState(false)
  const pdfRef = useRef(null)
  const imgRef = useRef(null)

  const pickPdf = (e) => {
    setError('')
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF file for the admit card.')
      return
    }
    if (f.size > 500 * 1024 * 1024) {
      setError('PDF is larger than 500 MB — please use a smaller file.')
      return
    }
    setPdfFile(f)
  }

  const pickImages = (e) => {
    setError('')
    const files = Array.from(e.target.files || []).filter((f) =>
      /image\/(jpeg|png)/.test(f.type) || /\.(jpe?g|png)$/i.test(f.name)
    )
    if (files.length === 0) {
      setError('Please choose JPG/JPEG/PNG image files.')
      return
    }
    const tooBig = files.filter((f) => f.size > 50 * 1024 * 1024)
    if (tooBig.length) {
      setError(`These files exceed 50 MB each: ${tooBig.map((f) => f.name).join(', ')}`)
      return
    }
    setImageFiles(files)
  }

  const canProcess = pdfFile && imageFiles.length > 0 && !busy

  const loadSample = async () => {
    setError('')
    setSampleLoading(true)
    try {
      await loadSampleData()
      onProcess(null) // signal: data ready, go to stats
    } catch (err) {
      setError('Could not load sample data: ' + err.message)
    } finally {
      setSampleLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Import Data</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Step 1 — upload your files. Step 2 — press PROCESS FILES. Everything runs in
        this browser; nothing is uploaded anywhere.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {/* PDF upload */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="font-semibold text-slate-900 dark:text-white">Upload Admit Card PDF</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Every page will be scanned — not just the first page.
        </p>
        <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={pickPdf} />
        <button
          onClick={() => pdfRef.current?.click()}
          className="mt-3 w-full rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-300"
        >
          {pdfFile ? `📄 ${pdfFile.name} (${(pdfFile.size / 1048576).toFixed(1)} MB)` : 'Choose PDF file'}
        </button>
      </div>

      {/* Images upload */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="font-semibold text-slate-900 dark:text-white">Upload Provisional Result Images</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          JPG, JPEG or PNG. Select all result photos at once.
        </p>
        <input
          ref={imgRef}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          multiple
          className="hidden"
          onChange={pickImages}
        />
        <button
          onClick={() => imgRef.current?.click()}
          className="mt-3 w-full rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-300"
        >
          {imageFiles.length > 0
            ? `🖼️ ${imageFiles.length} image(s) selected`
            : 'Choose image files'}
        </button>
        {imageFiles.length > 0 && (
          <ul className="mt-2 max-h-28 overflow-y-auto text-xs text-slate-500 dark:text-slate-400">
            {imageFiles.map((f, i) => (
              <li key={i}>• {f.name}</li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={() => canProcess && onProcess({ pdfFile, imageFiles })}
        disabled={!canProcess}
        className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 text-lg font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Processing…' : 'PROCESS FILES'}
      </button>
      {!pdfFile || imageFiles.length === 0 ? (
        <p className="mt-2 text-center text-xs text-slate-400">
          Select the admit-card PDF and at least one result image to enable processing.
        </p>
      ) : null}

      {/* Sample dataset */}
      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="font-semibold text-slate-900 dark:text-white">
          Try with sample data <span className="ml-1 rounded bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-900 dark:text-violet-200">SYNTHETIC</span>
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Loads 5 fake candidates ("Test Candidate 1…5") with fake results — obviously
          not real data. Useful to explore the app without your own files. Try roll{' '}
          <code>990000000001</code>.
        </p>
        <button
          onClick={loadSample}
          disabled={sampleLoading || busy}
          className="mt-3 w-full rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
        >
          {sampleLoading ? 'Loading…' : 'LOAD SYNTHETIC SAMPLE DATASET'}
        </button>
      </div>
    </div>
  )
}
