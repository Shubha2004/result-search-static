/* Unit tests for search/matching logic. Run: node test_search.tmp.mjs */
import 'fake-indexeddb/auto'

const { addCandidates, addResults, clearCandidates, clearResults, clearMeta } =
  await import('../src/lib/db.js')
const { searchCandidate } = await import('../src/lib/search.js')
const { searchByName } = await import('../src/lib/search.js')
const { normalizeRoll, normalizeName, nameMatches } = await import('../src/lib/normalize.js')

await clearCandidates(); await clearResults(); await clearMeta()

await addCandidates([
  { rollNumber: '990000000001', name: 'Test Candidate One', normalizedName: 'TEST CANDIDATE ONE' },
  { rollNumber: '990000000002', name: 'Test Candidate Two', normalizedName: 'TEST CANDIDATE TWO' },
  { rollNumber: '990000000003', name: 'Rahul Kumar', normalizedName: 'RAHUL KUMAR' },
  { rollNumber: '990000000004', name: 'Rahul Kumari', normalizedName: 'RAHUL KUMARI' },
  { rollNumber: '990000000005', name: 'No Result Person', normalizedName: 'NO RESULT PERSON' },
])
await addResults([
  { rollNumber: '990000000001', resultCode: 'Q', sgpaAll: '7.60' },
  { rollNumber: '990000000002', resultCode: 'SNC' },
  { rollNumber: '990000000003', resultCode: 'Q', sgpaAll: '6.10' },
  { rollNumber: '990000000004', resultCode: 'Q', sgpaAll: '5.90' },
  // 990000000005: no result -> result_unavailable
])

let pass = 0, fail = 0
function check(label, cond, extra = '') {
  if (cond) { pass++; console.log('PASS', label) }
  else { fail++; console.log('FAIL', label, extra) }
}

// normalization
check('normalizeRoll strips spaces', normalizeRoll('9900 0000 0001') === '990000000001')
check('normalizeName case/space', normalizeName('  rahul   kumar ') === 'RAHUL KUMAR')
check('nameMatches exact', nameMatches('Rahul Kumar', 'RAHUL KUMAR').match)
check('nameMatches case+spaces', nameMatches('  rahul   KUMAR ', 'Rahul Kumar').match)
check('nameMatches rejects different', !nameMatches('Amit Singh', 'Rahul Kumar').match)
check('nameMatches partial tokens', nameMatches('Rahul', 'Rahul Kumar').match)
check('nameMatches rejects equal-count prefix (Kumar vs Kumari)', !nameMatches('Rahul Kumar', 'Rahul Kumari').match)

// search
let r = await searchCandidate('990000000001', '')
check('exact roll, no name -> found', r.status === 'found' && r.result.resultCode === 'Q')
r = await searchCandidate('990000000001', 'Test Candidate One')
check('roll + exact name -> found', r.status === 'found')
r = await searchCandidate('9900 0000 0001', '  test candidate ONE ')
check('roll+name whitespace/case variants -> found', r.status === 'found')
r = await searchCandidate('990000000099', '')
check('wrong roll -> not_found', r.status === 'not_found')
r = await searchCandidate('990000000001', 'Some Other Person')
check('wrong name -> name_mismatch', r.status === 'name_mismatch')
// CRITICAL: similar names must never cross-contaminate
r = await searchCandidate('990000000003', 'Rahul Kumari')
check('roll of Rahul Kumar + name of Rahul Kumari -> name_mismatch (no cross result)',
  r.status === 'name_mismatch')
r = await searchCandidate('990000000004', 'Rahul Kumar')
check('reverse similar-name check -> name_mismatch', r.status === 'name_mismatch')
r = await searchCandidate('990000000004', 'Rahul')
check('partial name (fewer tokens) -> found', r.status === 'found')
r = await searchCandidate('990000000005', '')
check('candidate with no result -> result_unavailable', r.status === 'result_unavailable')
r = await searchCandidate('', 'Rahul Kumar')
check('empty roll -> not_found', r.status === 'not_found')

// name-only search
r = await searchByName('Test Candidate One')
check('name-only exact unique -> found', r.status === 'found' && r.result.resultCode === 'Q')
r = await searchByName('test candidate two')
check('name-only case-insensitive -> found', r.status === 'found' && r.result.resultCode === 'SNC')
r = await searchByName('Rahul Kumar')
check('name-only exact full name -> found (unique exact match)', r.status === 'found')
r = await searchByName('Rahul')
check('name-only "Rahul" matches Kumar+Kumari -> name_ambiguous, user picks',
  r.status === 'name_ambiguous' && r.candidates.length === 2)
check('ambiguous list shows rolls, no result leaked',
  r.status === 'name_ambiguous' && !('result' in r) && r.candidates.every((c) => c.rollNumber))
r = await searchByName('Kumari')
check('name-only "Kumari" -> exact-token match, unique -> found',
  r.status === 'found' && r.candidate.rollNumber === '990000000004')
r = await searchByName('No Result Person')
check('name-only, candidate with no result -> result_unavailable', r.status === 'result_unavailable')
r = await searchByName('ZZZ Nobody Here')
check('name-only no match -> not_found', r.status === 'not_found')
r = await searchByName('')
check('name-only empty -> not_found', r.status === 'not_found')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
