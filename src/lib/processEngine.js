/* Processing engine: PDF admit cards + result images -> IndexedDB.
   - Pages processed SEQUENTIALLY with progress callbacks (no UI freeze).
   - Canvas/image memory released after each page.
   - OCR fallback for PDF pages without selectable text.
   - Ambiguous records are flagged, never silently corrected. */

import { openPdf, getPageText, renderPageToCanvas, extractCandidate } from './pdfParser.js'
import { loadImageFile, splitTableHalves, releaseCanvas } from './imagePreprocess.js'
import { ocrCanvas, onOcrProgress } from './ocr.js'
import { parseResultText, looksLikeResultTable } from './resultParser.js'
import { addCandidates, addResults, setMeta } from './db.js'

const tick = () => new Promise((r) => setTimeout(r, 0))

/**
 * @param {File} pdfFile
 * @param {(p:{stage:string, pagesDone:number, pagesTotal:number, candidatesFound:number, percent:number, note?:string})=>void} onProgress
 */
export async function processPdf(pdfFile, onProgress) {
  const pdf = await openPdf(pdfFile)
  const total = pdf.numPages
  let candidatesFound = 0
  let ocrPages = 0
  const problemPages = []
  const batch = []

  for (let i = 1; i <= total; i++) {
    let text = ''
    try {
      text = await getPageText(pdf, i)
    } catch {
      text = ''
    }
    // Insufficient selectable text -> render + OCR fallback
    if (text.replace(/\s/g, '').length < 40) {
      ocrPages++
      onProgress({
        stage: 'pdf-ocr',
        pagesDone: i,
        pagesTotal: total,
        candidatesFound,
        percent: Math.round((i / total) * 100),
        note: `OCR fallback on page ${i}`,
      })
      try {
        const canvas = await renderPageToCanvas(pdf, i, 2)
        const { text: ocrText } = await ocrCanvas(canvas)
        releaseCanvas(canvas)
        text = ocrText
      } catch {
        text = ''
      }
    }

    const c = extractCandidate(text, i, pdfFile.name)
    if (c.problems.length > 0) problemPages.push(i)
    else candidatesFound++
    batch.push(c)

    // write in chunks to keep memory flat
    if (batch.length >= 50 || i === total) {
      await addCandidates(batch.splice(0))
    }

    if (i % 5 === 0 || i === total) {
      onProgress({
        stage: 'pdf',
        pagesDone: i,
        pagesTotal: total,
        candidatesFound,
        percent: Math.round((i / total) * 100),
      })
      await tick() // let the UI breathe
    }
  }

  await setMeta('pdfProcessedAt', new Date().toISOString())
  await setMeta('pdfPages', total)
  await setMeta('pdfFileName', pdfFile.name)
  await setMeta('pdfOcrFallbackPages', ocrPages)
  await setMeta('pdfProblemPages', problemPages)
  return { total, candidatesFound, ocrPages, problemPages }
}

/**
 * @param {File[]} imageFiles
 * @param {(p:{stage:string, imagesDone:number, imagesTotal:number, rowsFound:number, percent:number, note?:string})=>void} onProgress
 */
export async function processResultImages(imageFiles, onProgress) {
  const total = imageFiles.length
  let rowsFound = 0
  let flagged = 0
  const batch = []

  onOcrProgress((p) =>
    onProgress({
      stage: 'images',
      imagesDone: 0,
      imagesTotal: total,
      rowsFound,
      percent: 0,
      ocrProgress: p,
    })
  )

  for (let n = 0; n < total; n++) {
    const file = imageFiles[n]
    const img = await loadImageFile(file)
    const halves = splitTableHalves(img)

    let combinedText = ''
    for (const half of halves) {
      const { text } = await ocrCanvas(half)
      combinedText += '\n' + text
      releaseCanvas(half)
      await tick()
    }

    const rows = parseResultText(combinedText, n + 1)
    if (rows.length === 0 && !looksLikeResultTable(combinedText)) {
      // Not a recognizable result table: keep going, record the miss.
      await setMeta(`image${n + 1}Warning`, `No result table detected in ${file.name}`)
    }
    for (const r of rows) {
      if (r.needsVerification) flagged++
      rowsFound++
      batch.push({ ...r, sourceFile: file.name })
    }
    if (batch.length >= 100) await addResults(batch.splice(0))

    onProgress({
      stage: 'images',
      imagesDone: n + 1,
      imagesTotal: total,
      rowsFound,
      percent: Math.round(((n + 1) / total) * 100),
      note: `${file.name}: ${rows.length} rows`,
    })
    await tick()
  }
  if (batch.length) await addResults(batch)

  await setMeta('imagesProcessedAt', new Date().toISOString())
  await setMeta('imagesTotal', total)
  await setMeta('resultRows', rowsFound)
  await setMeta('resultRowsFlagged', flagged)
  return { total, rowsFound, flagged }
}

/** Compute match statistics after processing. */
export async function computeStats() {
  const { countCandidates, countResults, getMeta } = await import('./db.js')
  const { getCandidatesByRoll } = await import('./db.js')
  const db = (await import('./db.js')).getDB
  const database = await db()
  const results = await database.getAll('results')

  let matched = 0
  for (const r of results) {
    const c = await getCandidatesByRoll(r.rollNumber)
    if (c.length > 0) matched++
  }
  const [candidates, resultRows] = await Promise.all([countCandidates(), countResults()])
  const flagged = results.filter((r) => r.needsVerification).length
  await setMeta('matchedResults', matched)
  return {
    candidates,
    resultRows,
    matched,
    unmatchedCandidates: Math.max(0, candidates - matched),
    flagged,
    pdfPages: (await getMeta('pdfPages')) || 0,
  }
}
