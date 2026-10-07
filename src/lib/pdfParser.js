/* Admit-card PDF parsing with PDF.js.
   Strategy per page: (1) extract selectable text; if empty/insufficient -> (2)
   render page to canvas and OCR it (handled by the caller via onNeedOcr).
   Defensive regexes: multiple patterns per field, no hard positional assumptions. */
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export async function openPdf(file) {
  const buf = await file.arrayBuffer()
  return pdfjsLib.getDocument({ data: buf, useSystemFonts: true }).promise
}

export async function getPageText(pdf, pageNum) {
  const page = await pdf.getPage(pageNum)
  try {
    const tc = await page.getTextContent()
    return tc.items.map((it) => it.str).join('\n')
  } finally {
    page.cleanup()
  }
}

/** Render a page to a canvas (for the OCR fallback). Caller releases it. */
export async function renderPageToCanvas(pdf, pageNum, scale = 2) {
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  await page.render({ canvasContext: ctx, viewport }).promise
  page.cleanup()
  return canvas
}

const normRoll = (s) => String(s || '').replace(/[\s\-]/g, '')

function firstMatch(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m
  }
  return null
}

/**
 * Extract one candidate from a page's text. Returns { ..., problems: [] }.
 * problems entries: 'bad-or-missing-roll' | 'missing-name'
 */
export function extractCandidate(pageText, pageNum, sourceFile) {
  const t = String(pageText || '').replace(/\u00a0/g, ' ')
  const problems = []

  // --- name: prefer a "Name :" label that is NOT "College Name"
  const namePatterns = [
    /(?:^|\n|\s)Name\s*:\s*([A-Z][A-Z .'\-]{1,60}?)(?=\s{2,}|Gender:?|\n|$)/,
    /(?<!College\s)Name\s*:\s*([A-Z][A-Z .'\-]{1,60}?)(?=\s{2,}|Gender:?|\n|$)/,
    /Candidate\s*Name\s*:\s*([A-Z][A-Z .'\-]{1,60}?)(?=\s{2,}|\n|$)/i,
  ]
  const nameM = firstMatch(t, namePatterns)
  const name = nameM ? nameM[1].replace(/\s+/g, ' ').trim() : null

  // --- roll number
  const rollPatterns = [
    /Roll\s*No\.?\s*:\s*(\d[\d\s\-]{8,16})/i,
    /Roll\s*Number\s*:\s*(\d[\d\s\-]{8,16})/i,
  ]
  const rollM = firstMatch(t, rollPatterns)
  const rollNumber = rollM ? normRoll(rollM[1]) : null

  // --- registration / application number
  const regM = t.match(
    /(?:Registration|Application)\s*No\.?\s*:\s*([A-Z0-9][A-Z0-9\s\-/]*\d)(?:\s*of\s*(\d{4}-\d{2}))?/i
  )
  const registrationNumber = regM
    ? regM[0].replace(/^(?:Registration|Application)\s*No\.?\s*:\s*/i, '').trim().replace(/\s+/g, ' ')
    : null

  // --- college
  const collegeM = t.match(
    /College\s*Name\s*:\s*([A-Z][A-Z .'\-()]{2,80}?)(?=\s{2,}|Chance|\n|$)/i
  )
  const college = collegeM ? collegeM[1].trim().replace(/\s+/g, ' ') : null

  const genderM = t.match(/Gender\s*:\s*(Male|Female|Other)/i)

  if (!rollNumber || !/^\d{6,15}$/.test(rollNumber)) problems.push('bad-or-missing-roll')
  if (!name) problems.push('missing-name')

  const normalizedName = (name || '')
    .toUpperCase()
    .replace(/[^A-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    rollNumber,
    name,
    normalizedName,
    registrationNumber,
    college,
    gender: genderM ? genderM[1] : null,
    pdfPage: pageNum,
    sourceFile: sourceFile || null,
    rawText: t.slice(0, 500),
    problems,
  }
}
