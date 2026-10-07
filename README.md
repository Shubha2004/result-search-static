# Provisional Result Search — 100% Frontend

A **zero-backend, zero-server, zero-database-server** web app that lets users search
a candidate's provisional result by **Roll Number + Name**. Everything — PDF parsing,
OCR, image preprocessing, matching, storage — runs locally in the user's browser.

## How it works

```
Admit Card PDF ──▶ PDF.js (text layer; OCR fallback per page) ──┐
                                                                ├─▶ IndexedDB (browser) ──▶ instant search
Result images ──▶ canvas preprocess ──▶ Tesseract.js OCR ──▶ row parser ──┘
```

- **PDF**: every page is scanned via PDF.js text extraction. Pages with no selectable
  text are rendered to canvas and OCR'd automatically. Candidate fields (roll number,
  name, registration number, college) are extracted with defensive regexes.
- **Result images**: each photo is split into table halves, then
  grayscale → autocontrast → 2× upscale → binarized on a canvas before Tesseract.js
  OCR. Rows are parsed by 12-digit roll number; wrapped table cells are merged;
  rows with unreadable result codes or duplicate rolls are flagged
  **"OCR verification required"** — never silently corrected.
- **Storage**: IndexedDB (`provisionalResultDB`) with indexes on `rollNumber` and
  `normalizedName`. Search queries the DB only — OCR never re-runs.
- **Matching**: roll number is the primary key (exact after normalization). The name
  is verified against the admit-card record (case/space/punctuation tolerant, plus
  safe partial-name search). A similar name can **never** return another candidate's
  result.
- **Privacy**: files never leave the browser. No backend, no analytics, no tracking.

## Quick start (local)

```bash
npm install
npm run dev
```

Open the printed URL, go to **Import Data**, upload your admit-card PDF + result
images, press **PROCESS FILES**. Or press **LOAD SYNTHETIC SAMPLE DATASET** to try
the app instantly with fake data (try roll `990000000001`).

> Tesseract.js downloads its OCR engine (~a few MB) from CDN on first use —
> an internet connection is required for OCR, but your files stay local.

## Tests

```bash
# matching logic: 17 unit tests (exact/partial/wrong/similar names, states)
node test/search.test.mjs

# PDF parser validation against a real admit-card PDF (edit path first)
node scripts/validate-pdf.mjs
```

## Build & deploy (static hosting)

```bash
npm run build        # outputs dist/
```

`dist/` is a plain static site — deploy it to **GitHub Pages**, **Netlify**,
**Vercel**, or **Cloudflare Pages** as-is.

Configurable base path (for GitHub Pages project subpaths):

```bash
VITE_BASE=/result-search-static/ npm run build
```

## Project layout

```
src/
  lib/
    db.js               IndexedDB layer (idb): candidates, results, meta
    pdfParser.js        PDF.js candidate extraction (defensive regexes)
    imagePreprocess.js  canvas: split halves, grayscale, autocontrast, 2x, binarize
    ocr.js              tesseract.js worker wrapper
    resultParser.js     OCR text -> result rows (continuation merge, flags)
    processEngine.js    orchestrates PDF + image processing with progress
    normalize.js        roll/name normalization + conservative name matching
    search.js           search states (found / not_found / name_mismatch / result_unavailable)
    sampleData.js       clearly-labeled SYNTHETIC dataset (fake names)
    exportImport.js     JSON / CSV export, JSON import
  views/      Home, Import, Processing, Stats (Database), Settings
  components/ PrivacyBanner, ResultCard
```

## Limitations (honest notes)

- **OCR needs internet** on first run (tesseract.js CDN for the wasm engine + language data).
- **Large PDFs**: pages are processed sequentially with per-page memory release and
  progress, but a 500+ page PDF with OCR fallback can take many minutes and needs a
  desktop-class browser tab. Keep the tab open during processing.
- **OCR is imperfect**: ambiguous rows are flagged for human review in Database
  Statistics (admin mode) — the app never guesses a result.
- **IndexedDB is per-browser**: data imported on your phone won't appear on your
  desktop. Use Export/Import JSON to move datasets between devices.
- The bundled sample dataset is **synthetic** (names like "Test Candidate 1").
  The app ships with **zero real candidate data**.
