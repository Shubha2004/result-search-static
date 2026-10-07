/* Parser validation against the REAL admit-card PDF (read-only).
   Extracts all candidates with pdfjs-dist and reports counts. */
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const PDF_PATH = '/home/hatch/workspace/user/files/DOC-20261007-WA0013.pdf';

function extractCandidate(pageText, pageNum) {
  const t = pageText.replace(/\u00a0/g, ' ');
  // Name: first "Name :" occurrence that is NOT "College Name"
  const nameM = t.match(/(?:^|\n|\s)Name\s*:\s*([A-Z][A-Z .'\-]{1,60}?)(?=\s{2,}|Gender:?|\n|$)/);
  // Fallback: any "Name :" not preceded by "College"
  let name = nameM ? nameM[1].trim() : null;
  if (!name) {
    const m2 = t.match(/(?<!College\s)Name\s*:\s*([A-Z][A-Z .'\-]{1,60}?)(?=\s{2,}|Gender:?|\n|$)/);
    name = m2 ? m2[1].trim() : null;
  }
  const rollM = t.match(/Roll\s*No\.?\s*:\s*(\d[\d\s-]{8,16})/i);
  const regM = t.match(/Registration\s*No\.?\s*:\s*([\d][\d\s\-]*\d)(?:\s*of\s*(\d{4}-\d{2}))?/i);
  const collegeM = t.match(/College\s*Name\s*:\s*([A-Z][A-Z .'\-()]{2,80}?)(?=\s{2,}|Chance|\n|$)/i);
  const genderM = t.match(/Gender\s*:\s*(Male|Female|Other)/i);

  const normRoll = (s) => (s || '').replace(/[\s\-]/g, '');
  const roll = rollM ? normRoll(rollM[1]) : null;
  return {
    rollNumber: roll,
    name: name,
    normalizedName: (name || '').toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim(),
    registrationNumber: regM ? regM[0].replace(/^Registration\s*No\.?\s*:\s*/i, '').trim().replace(/\s+/g, ' ') : null,
    college: collegeM ? collegeM[1].trim().replace(/\s+/g, ' ') : null,
    gender: genderM ? genderM[1] : null,
    pdfPage: pageNum,
    rawText: pageText.slice(0, 400),
    problems: [],
  };
}

const loadingTask = pdfjsLib.getDocument({ url: PDF_PATH, useSystemFonts: true });
const pdf = await loadingTask.promise;
console.log('Total pages:', pdf.numPages);

const candidates = [];
const problemPages = [];
const seenRolls = new Map();

for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const tc = await page.getTextContent();
  const text = tc.items.map((it) => it.str).join('\n');
  const c = extractCandidate(text, i);
  if (!c.rollNumber || !/^\d{12}$/.test(c.rollNumber)) {
    c.problems.push('bad-or-missing-roll');
    problemPages.push(i);
  } else if (!c.name) {
    c.problems.push('missing-name');
    problemPages.push(i);
  } else if (seenRolls.has(c.rollNumber)) {
    c.problems.push('duplicate-roll');
    problemPages.push(i);
  } else {
    seenRolls.set(c.rollNumber, i);
  }
  candidates.push(c);
  if (i % 25 === 0) process.stdout.write(`...${i}`);
}
console.log('\n');

const good = candidates.filter((c) => c.problems.length === 0);
console.log('Candidates with valid 12-digit roll + name:', good.length, '/', pdf.numPages);
console.log('Problem pages:', problemPages.length, JSON.stringify(problemPages.slice(0, 20)));
console.log('Sample:', JSON.stringify(candidates[0], null, 1).slice(0, 600));
console.log('Sample page 66:', candidates[65].name, candidates[65].rollNumber);
console.log('Sample page 132:', candidates[131].name, candidates[131].rollNumber);
