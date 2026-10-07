/* SYNTHETIC sample dataset — obviously fake, for testing the UI only.
   Names like "Test Candidate 1". Never real data. */

export function buildSampleData() {
  const candidates = [
    {
      rollNumber: '990000000001',
      name: 'Test Candidate One',
      normalizedName: 'TEST CANDIDATE ONE',
      registrationNumber: 'SAMPLE-REG-0001 of 2025-26',
      college: 'Sample College',
      gender: 'Female',
      pdfPage: 1,
      sourceFile: 'sample-admit-card.pdf',
      rawText: 'synthetic sample',
      problems: [],
    },
    {
      rollNumber: '990000000002',
      name: 'Test Candidate Two',
      normalizedName: 'TEST CANDIDATE TWO',
      registrationNumber: 'SAMPLE-REG-0002 of 2025-26',
      college: 'Sample College',
      gender: 'Male',
      pdfPage: 2,
      sourceFile: 'sample-admit-card.pdf',
      rawText: 'synthetic sample',
      problems: [],
    },
    {
      rollNumber: '990000000003',
      name: 'Test Candidate Three',
      normalizedName: 'TEST CANDIDATE THREE',
      registrationNumber: 'SAMPLE-REG-0003 of 2025-26',
      college: 'Sample College',
      gender: 'Female',
      pdfPage: 3,
      sourceFile: 'sample-admit-card.pdf',
      rawText: 'synthetic sample',
      problems: [],
    },
    {
      rollNumber: '990000000004',
      name: 'Test Candidate Four',
      normalizedName: 'TEST CANDIDATE FOUR',
      registrationNumber: 'SAMPLE-REG-0004 of 2025-26',
      college: 'Sample College',
      gender: 'Male',
      pdfPage: 4,
      sourceFile: 'sample-admit-card.pdf',
      rawText: 'synthetic sample',
      problems: [],
    },
    {
      rollNumber: '990000000005',
      name: 'Test Candidate Five',
      normalizedName: 'TEST CANDIDATE FIVE',
      registrationNumber: 'SAMPLE-REG-0005 of 2025-26',
      college: 'Sample College',
      gender: 'Female',
      pdfPage: 5,
      sourceFile: 'sample-admit-card.pdf',
      rawText: 'synthetic sample',
      problems: [],
    },
  ]

  const results = [
    {
      rollNumber: '990000000001',
      sgpaMajor: '8.00',
      sgpaAll: '7.60',
      creditRetained: 'ALL',
      resultCode: 'Q',
      needsVerification: false,
      verificationReason: null,
      sourceImage: 1,
      sourceFile: 'sample-result-1.jpg',
      rawLine: 'synthetic sample',
    },
    {
      rollNumber: '990000000002',
      sgpaMajor: '4.00',
      sgpaAll: '5.40',
      creditRetained: 'HIST1011',
      resultCode: 'Q',
      needsVerification: false,
      verificationReason: null,
      sourceImage: 1,
      sourceFile: 'sample-result-1.jpg',
      rawLine: 'synthetic sample',
    },
    {
      rollNumber: '990000000003',
      sgpaMajor: null,
      sgpaAll: null,
      creditRetained: null,
      resultCode: 'SNC',
      needsVerification: false,
      verificationReason: null,
      sourceImage: 2,
      sourceFile: 'sample-result-2.jpg',
      rawLine: 'synthetic sample',
    },
    {
      rollNumber: '990000000004',
      sgpaMajor: '6.00',
      sgpaAll: '6.70',
      creditRetained: null,
      resultCode: null,
      needsVerification: true,
      verificationReason: 'result code unreadable (sample)',
      sourceImage: 2,
      sourceFile: 'sample-result-2.jpg',
      rawLine: 'synthetic sample',
    },
    // 990000000005 intentionally has NO result -> "result unavailable" state
  ]

  return { candidates, results }
}

export async function loadSampleData() {
  const { addCandidates, addResults, setMeta, clearCandidates, clearResults, clearMeta } =
    await import('./db.js')
  await clearCandidates()
  await clearResults()
  await clearMeta()
  const { candidates, results } = buildSampleData()
  await addCandidates(candidates)
  await addResults(results)
  await setMeta('pdfPages', 5)
  await setMeta('pdfFileName', 'sample-admit-card.pdf (synthetic)')
  await setMeta('imagesTotal', 2)
  await setMeta('resultRows', results.length)
  await setMeta('resultRowsFlagged', 1)
  await setMeta('sampleData', true)
  await setMeta('processedAt', new Date().toISOString())
}
