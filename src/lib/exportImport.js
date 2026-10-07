/* Export (JSON/CSV) + import helpers. Files are downloaded / read locally —
   nothing leaves the browser. */

export function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export async function exportJSON() {
  const { exportAll } = await import('./db.js')
  const data = await exportAll()
  downloadFile(
    'result-database.json',
    JSON.stringify(data, null, 2),
    'application/json'
  )
}

function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function exportCSV() {
  const { getDB } = await import('./db.js')
  const db = await getDB()
  const candidates = await db.getAll('candidates')
  const results = await db.getAll('results')

  const cHead = ['rollNumber', 'name', 'registrationNumber', 'college', 'gender', 'pdfPage', 'sourceFile']
  const cRows = candidates.map((c) => cHead.map((h) => csvCell(c[h])).join(','))
  const rHead = ['rollNumber', 'sgpaMajor', 'sgpaAll', 'creditRetained', 'resultCode', 'needsVerification', 'sourceImage', 'sourceFile']
  const rRows = results.map((r) => rHead.map((h) => csvCell(r[h])).join(','))

  const csv =
    'CANDIDATES\n' + cHead.join(',') + '\n' + cRows.join('\n') +
    '\n\nRESULTS\n' + rHead.join(',') + '\n' + rRows.join('\n') + '\n'
  downloadFile('result-database.csv', csv, 'text/csv')
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result))
      } catch {
        reject(new Error('Not a valid JSON file.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsText(file)
  })
}
