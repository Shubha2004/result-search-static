/* IndexedDB storage layer (idb). All data stays in the user's browser.
   Database: provisionalResultDB
   Stores: candidates, results, meta. Indexes on rollNumber + normalizedName. */
import { openDB } from 'idb'

const DB_NAME = 'provisionalResultDB'
const DB_VERSION = 1

let dbPromise = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const candidates = db.createObjectStore('candidates', {
          keyPath: 'id',
          autoIncrement: true,
        })
        candidates.createIndex('rollNumber', 'rollNumber', { unique: false })
        candidates.createIndex('normalizedName', 'normalizedName', {
          unique: false,
        })

        const results = db.createObjectStore('results', {
          keyPath: 'id',
          autoIncrement: true,
        })
        results.createIndex('rollNumber', 'rollNumber', { unique: false })

        db.createObjectStore('meta', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

/* ---- candidates ---- */
export async function addCandidates(list) {
  const db = await getDB()
  const tx = db.transaction('candidates', 'readwrite')
  for (const c of list) await tx.store.add(c)
  await tx.done
}

export async function getCandidatesByRoll(rollNumber) {
  const db = await getDB()
  return db.getAllFromIndex('candidates', 'rollNumber', rollNumber)
}

export async function getCandidatesByNamePrefix(normalizedName, limit = 50) {
  const db = await getDB()
  const tx = db.transaction('candidates', 'readonly')
  const idx = tx.store.index('normalizedName')
  const out = []
  let cursor = await idx.openCursor(
    IDBKeyRange.bound(normalizedName, normalizedName + '\uffff')
  )
  while (cursor && out.length < limit) {
    out.push(cursor.value)
    cursor = await cursor.continue()
  }
  return out
}

export async function countCandidates() {
  const db = await getDB()
  return db.count('candidates')
}

export async function clearCandidates() {
  const db = await getDB()
  await db.clear('candidates')
}

/* ---- results ---- */
export async function addResults(list) {
  const db = await getDB()
  const tx = db.transaction('results', 'readwrite')
  for (const r of list) await tx.store.add(r)
  await tx.done
}

export async function getResultsByRoll(rollNumber) {
  const db = await getDB()
  return db.getAllFromIndex('results', 'rollNumber', rollNumber)
}

export async function countResults() {
  const db = await getDB()
  return db.count('results')
}

export async function clearResults() {
  const db = await getDB()
  await db.clear('results')
}

/* ---- meta ---- */
export async function setMeta(key, value) {
  const db = await getDB()
  await db.put('meta', { key, value })
}

export async function getMeta(key) {
  const db = await getDB()
  const rec = await db.get('meta', key)
  return rec ? rec.value : null
}

export async function clearMeta() {
  const db = await getDB()
  await db.clear('meta')
}

export async function deleteDatabase() {
  if (dbPromise) {
    ;(await dbPromise).close()
    dbPromise = null
  }
  const { deleteDB } = await import('idb')
  await deleteDB(DB_NAME)
}

/* ---- full export ---- */
export async function exportAll() {
  const db = await getDB()
  const [candidates, results, meta] = await Promise.all([
    db.getAll('candidates'),
    db.getAll('results'),
    db.getAll('meta'),
  ])
  return {
    exportedAt: new Date().toISOString(),
    app: 'provisional-result-search-static',
    version: 1,
    candidates,
    results,
    meta: Object.fromEntries(meta.map((m) => [m.key, m.value])),
  }
}

export async function importAll(data) {
  if (!data || !Array.isArray(data.candidates) || !Array.isArray(data.results)) {
    throw new Error('Invalid data file: expected { candidates: [], results: [] }')
  }
  await clearCandidates()
  await clearResults()
  await clearMeta()
  // strip auto-increment ids so the new DB assigns its own
  const strip = (list) => list.map(({ id, ...rest }) => rest)
  await addCandidates(strip(data.candidates))
  await addResults(strip(data.results))
  if (data.meta && typeof data.meta === 'object') {
    for (const [k, v] of Object.entries(data.meta)) await setMeta(k, v)
  }
}
