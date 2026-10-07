/* Provisional-result table row parser.
   Input: raw OCR text of one table half. Output: row records.
   - A row starts with a 12-digit roll number.
   - Wrapped cells (e.g. multi-line CREDIT RETAINED IN) produce continuation
     lines without a roll: they are merged into the previous row.
   - Rows with no recognizable result code, or duplicate rolls, are flagged
     needsVerification = true and NEVER silently corrected. */

const ROLL_RE = /^(\d{12})\s*(.*)$/
const CODE_RE = /\b(Q|SNC)\s*$/i

function cleanToken(tok) {
  return String(tok || '').replace(/^[.,;:_|\-]+/, '').replace(/[.,;:_|\-]+$/, '').trim()
}

/** Parse a single OCR line that begins with a roll number. */
export function parseResultRow(line) {
  const m = line.match(ROLL_RE)
  if (!m) return null
  const rollNumber = m[1]
  let rest = m[2].trim()

  let resultCode = null
  const codeM = rest.match(CODE_RE)
  if (codeM) {
    resultCode = codeM[1].toUpperCase()
    rest = rest.slice(0, codeM.index).trim()
  }

  // SGPA MAJOR / SGPA ALL: first two numeric-ish tokens ("8.00", "-" or "." OCR artifacts)
  const parts = rest.split(/\s+/).filter(Boolean).map(cleanToken).filter(Boolean)
  let sgpaMajor = null
  let sgpaAll = null
  let creditRetained = null
  if (parts.length >= 1) sgpaMajor = normalizeSgpa(parts[0])
  if (parts.length >= 2) sgpaAll = normalizeSgpa(parts[1])
  if (parts.length >= 3) creditRetained = parts.slice(2).join(' ') || null

  const needsVerification = !resultCode
  return {
    rollNumber,
    sgpaMajor,
    sgpaAll,
    creditRetained,
    resultCode,
    needsVerification,
    verificationReason: needsVerification ? 'result code unreadable' : null,
    rawLine: line,
  }
}

function normalizeSgpa(tok) {
  const t = cleanToken(tok)
  if (!t || t === '-' || t === '.' || t === '—') return null
  const m = t.match(/^\d\.\d{2}$/)
  // tolerate common OCR slips inside an otherwise numeric token
  const fixed = t.replace(/O/g, '0').replace(/l/g, '1').replace(/S/g, '5')
  if (m) return t
  return /^\d\.\d{2}$/.test(fixed) ? fixed : t
}

/** Merge continuation lines (wrapped credit cells) into the previous row. */
export function parseResultText(ocrText, sourceImage) {
  const lines = String(ocrText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const rows = []
  let current = null
  for (const line of lines) {
    const row = parseResultRow(line)
    if (row) {
      if (current) rows.push(finalize(current))
      current = { ...row, sourceImage }
    } else if (current) {
      // Possible continuation of the credit-retained cell. Only merge text
      // that looks like course codes; never merge something that looks like
      // a new row or a footer ("TOTAL NUMBER OF CANDIDATES").
      if (/total number of candidates/i.test(line)) continue
      if (/^\d{10,}/.test(line)) continue // looks like a (misread) roll: don't merge
      const extra = cleanToken(line)
      if (extra && /^[A-Z0-9,.\- ]+$/i.test(extra) && extra.length <= 80) {
        current.creditRetained = [current.creditRetained, extra].filter(Boolean).join(' ')
        current.rawLine += ' | ' + line
      }
    }
  }
  if (current) rows.push(finalize(current))

  // Duplicate rolls across the whole text: flag all copies, keep first usable.
  const seen = new Map()
  for (const r of rows) {
    if (seen.has(r.rollNumber)) {
      r.needsVerification = true
      r.verificationReason = 'duplicate roll number in result data'
      const first = seen.get(r.rollNumber)
      first.needsVerification = true
      first.verificationReason = 'duplicate roll number in result data'
    } else {
      seen.set(r.rollNumber, r)
    }
  }
  return rows
}

function finalize(r) {
  return r
}

/** Quick check: does this image text look like a result table at all? */
export function looksLikeResultTable(ocrText) {
  const t = String(ocrText || '').toUpperCase()
  return /ROLL\s*NO/.test(t) && /(SGPA|RESULT\s*CODE)/.test(t)
}
