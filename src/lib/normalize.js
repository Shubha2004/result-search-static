/* Normalization + tolerant name matching.
   Roll number is ALWAYS the primary key. Names are secondary verification only. */

/** Strip everything but digits: "1234 5678 9012" -> "123456789012" */
export function normalizeRoll(raw) {
  return String(raw || '').replace(/\D/g, '')
}

/** Canonical name form: upper-case, punctuation stripped, spaces collapsed. */
export function normalizeName(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(norm) {
  return norm.split(' ').filter(Boolean)
}

/**
 * Decide whether the user-typed name matches the admit-card name.
 * Deliberately conservative: exact normalized match, or every typed token
 * appears in the record (token may be a prefix, enabling partial search).
 * There is intentionally NO loose full-string fuzzy fallback: names like
 * "Rahul Kumar" vs "Rahul Kumari" must NEVER cross-match, because the roll
 * number is the primary key and a similar name must never return another
 * candidate's result.
 * Returns { match: boolean, method: 'exact'|'tokens'|'none' }
 */
export function nameMatches(typedRaw, recordName) {
  const typed = normalizeName(typedRaw)
  const record = normalizeName(recordName)
  if (!typed || !record) return { match: false, method: 'none' }
  if (typed === record) return { match: true, method: 'exact' }

  const tTokens = tokens(typed)
  const rTokens = tokens(record)
  // Partial search: allowed only when the typed name has FEWER tokens than the
  // record (the user typed part of the name, e.g. "Rahul" for "Rahul Kumar").
  // When token counts are equal, every token must match exactly — this keeps
  // pairs like "Rahul Kumar"/"Rahul Kumari" from cross-matching, since a
  // mistyped roll number must never slip through on a prefix.
  const tokenHit =
    tTokens.length > 0 &&
    tTokens.length < rTokens.length &&
    tTokens.every((t) =>
      rTokens.some((r) => r === t || (t.length >= 3 && r.startsWith(t)))
    )
  if (tokenHit) return { match: true, method: 'tokens' }

  return { match: false, method: 'none' }
}

/** Common OCR confusions map for flagging, not silent correction. */
export const OCR_CONFUSIONS = {
  O: '0',
  '0': 'O',
  I: '1',
  '1': 'I',
  S: '5',
  '5': 'S',
  B: '8',
  '8': 'B',
}
