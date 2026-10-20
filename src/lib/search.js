/* Search logic. Queries IndexedDB only — never re-runs OCR.
   Two entry points:
   - searchCandidate(roll, name): roll number is the primary key; the name,
     when given, is verified against the admit-card record.
   - searchByName(name): name-only search. A unique match resolves to its
     result; multiple matches return a candidate list for the user to pick
     from — a result is never auto-returned for an ambiguous name. */
import {
  getCandidatesByRoll,
  getAllCandidates,
  getResultsByRoll,
} from './db.js'
import { normalizeRoll, normalizeName, nameMatches } from './normalize.js'

/** Resolve the result outcome for one already-identified candidate. */
async function resolveCandidate(candidate, nameCheck, duplicateRolls = false) {
  const results = await getResultsByRoll(candidate.rollNumber)
  if (results.length === 0) {
    return { status: 'result_unavailable', candidate, nameCheck, duplicateRolls }
  }
  if (results.length > 1) {
    // Same roll in multiple result rows: ambiguous, needs human verification.
    return { status: 'ambiguous_results', candidate, results, nameCheck, duplicateRolls }
  }
  const result = results[0]
  if (result.needsVerification) {
    return { status: 'found_unverified', candidate, result, nameCheck, duplicateRolls }
  }
  return { status: 'found', candidate, result, nameCheck, duplicateRolls }
}

/**
 * Roll-based search.
 * @returns one of:
 *  { status: 'found', candidate, result, nameCheck }
 *  { status: 'found_unverified', candidate, result, nameCheck }
 *  { status: 'name_mismatch', candidate, nameCheck }
 *  { status: 'not_found' }
 *  { status: 'result_unavailable', candidate, nameCheck }
 *  { status: 'ambiguous_results', candidate, results }
 */
export async function searchCandidate(rollRaw, nameRaw) {
  const roll = normalizeRoll(rollRaw)
  const name = (nameRaw || '').trim()

  if (!roll) return { status: 'not_found', reason: 'empty_roll' }

  const candidates = await getCandidatesByRoll(roll)
  if (candidates.length === 0) return { status: 'not_found', reason: 'roll' }

  // Duplicates are data problems: surface, don't guess.
  const candidate = candidates[0]
  const duplicateRolls = candidates.length > 1

  let nameCheck = { match: true, method: 'skipped' }
  if (name) {
    nameCheck = nameMatches(name, candidate.name || '')
    if (!nameCheck.match) {
      return { status: 'name_mismatch', candidate, nameCheck, duplicateRolls }
    }
  }

  return resolveCandidate(candidate, nameCheck, duplicateRolls)
}

/**
 * Rank how well a typed name matches a record name, for name-only search.
 * Lower is better; -1 means no match.
 *   0 — exact normalized full name
 *   1 — every typed token equals a record token (e.g. "Kumar" -> "Rahul Kumar",
 *       but NOT "Rahul Kumari")
 *   2 — every typed token is a >=2-char prefix of some record token
 *   3 — the typed string appears inside the record name
 * Ranking only orders the candidate list; ambiguity is resolved by the user.
 */
function nameSearchRank(typedNorm, recordNorm) {
  if (!typedNorm || !recordNorm) return -1
  if (typedNorm === recordNorm) return 0
  const tTokens = typedNorm.split(' ').filter(Boolean)
  const rTokens = recordNorm.split(' ').filter(Boolean)
  if (tTokens.length === 0) return -1
  if (tTokens.every((t) => rTokens.includes(t))) return 1
  if (
    tTokens.every((t) =>
      rTokens.some((r) => r === t || (t.length >= 2 && r.startsWith(t)))
    )
  )
    return 2
  if (recordNorm.includes(typedNorm)) return 3
  return -1
}

/**
 * Name-only search.
 * @returns resolveCandidate() outcome for a unique match,
 *          { status: 'name_ambiguous', candidates } for multiple matches, or
 *          { status: 'not_found', reason: 'name' | 'empty_name' }.
 */
export async function searchByName(nameRaw, limit = 20) {
  const norm = normalizeName(nameRaw)
  if (!norm) return { status: 'not_found', reason: 'empty_name' }

  const all = await getAllCandidates()
  const ranked = []
  for (const c of all) {
    const rank = nameSearchRank(norm, c.normalizedName || normalizeName(c.name))
    if (rank >= 0) ranked.push({ candidate: c, rank })
  }
  ranked.sort(
    (a, b) =>
      a.rank - b.rank ||
      String(a.candidate.name || '').localeCompare(String(b.candidate.name || ''))
  )
  // An exact full-name match wins outright: don't let prefix/substring hits
  // dilute it (multiple identical names still stay ambiguous — user picks).
  const exact = ranked.filter((r) => r.rank === 0)
  const pool = exact.length > 0 ? exact : ranked
  const matches = pool.slice(0, limit).map((r) => r.candidate)

  if (matches.length === 0) return { status: 'not_found', reason: 'name' }
  if (matches.length === 1) {
    return resolveCandidate(matches[0], { match: true, method: 'name_only' })
  }
  return { status: 'name_ambiguous', candidates: matches }
}

/** Name-only helper: find candidate suggestions by name prefix (for "similar names" UX). */
export async function suggestByName(nameRaw, limit = 8) {
  const { getCandidatesByNamePrefix } = await import('./db.js')
  const norm = normalizeName(nameRaw)
  if (!norm) return []
  return getCandidatesByNamePrefix(norm, limit)
}
