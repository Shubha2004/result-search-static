/* Tesseract.js OCR wrapper. The OCR engine (wasm + language data) loads from
   CDN at runtime — the only network use besides the initial page load. */

let workerPromise = null
let progressCb = null

export function onOcrProgress(cb) {
  progressCb = cb
}

export async function getOcrWorker() {
  if (!workerPromise) {
    const { createWorker } = await import('tesseract.js')
    workerPromise = (async () => {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (progressCb && m.status === 'recognizing text' && typeof m.progress === 'number') {
            progressCb(m.progress)
          }
        },
      })
      await worker.setParameters({
        tessedit_pageseg_mode: '3', // fully automatic page segmentation
        user_defined_dpi: '300',
        load_system_dawg: '0', // table codes like HIST1011 are not dictionary words
        load_freq_dawg: '0',
      })
      return worker
    })()
  }
  return workerPromise
}

/** OCR a preprocessed canvas -> { text, confidence }. */
export async function ocrCanvas(canvas) {
  const worker = await getOcrWorker()
  const { data } = await worker.recognize(canvas)
  return { text: data.text || '', confidence: data.confidence || 0 }
}

export async function terminateOcr() {
  if (workerPromise) {
    try {
      const w = await workerPromise
      await w.terminate()
    } catch {
      /* ignore */
    }
    workerPromise = null
  }
}
