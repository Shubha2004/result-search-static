/* Search logic. Queries IndexedDB only — never re-runs OCR.
   Flow: roll number (primary) -> candidate -> name verification -> result.
   Returns a discriminated result object; the UI maps it to spec states. */
import { getCandidatesByRoll, getResultsByRoll } from './db.js'
import { normalizeRoll, normalizeName, nameMatches } from './normalize.js'

/**
 * @returns one of:
 *  { status: 'found', candidate, result, nameCheck }
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

  const results = await getResultsByRoll(roll)
  if (results.length === 0) {
    return { status: 'result_unavailable', candidate, nameCheck, duplicateRolls }
  }
  if (results.length > 1) {
    // Same roll in multiple result rows: ambiguous, needs human verification.
    return { status: 'ambiguous_results', candidate, results, nameCheck, duplicateRolls }
  }
  const result = results[0]
  if (result.needsVerification) {
    return {
      status: 'found_unverified',
      candidate,
      result,
      nameCheck,
      duplicateRolls,
    }
  }
  return { status: 'found', candidate, result, nameCheck, duplicateRolls }
}

/** Name-only helper: find candidate suggestions by name prefix (for "similar names" UX). */
export async function suggestByName(nameRaw, limit = 8) {
  const { getCandidatesByNamePrefix } = await import('./db.js')
  const norm = normalizeName(nameRaw)
  if (!norm) return []
  return getCandidatesByNamePrefix(norm, limit)
}
