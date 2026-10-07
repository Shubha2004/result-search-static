/* Canvas-based preprocessing for result-table photos.
   Mirrors the validated pipeline: crop table halves -> grayscale ->
   autocontrast -> 2x upscale -> binarize. Releases canvases after use. */

/** Load an image File into an HTMLImageElement. */
export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not decode image: ' + (file.name || 'file')))
    }
    img.src = url
  })
}

/**
 * Crop the table region of a result page and split into left/right halves.
 * Returns [canvasLeft, canvasRight]. Caller must release them (width=0).
 * Table area heuristics: header occupies ~top 10%, footer/notes ~bottom 10%.
 */
export function splitTableHalves(img) {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const top = Math.floor(h * 0.08)
  const bottom = Math.floor(h * 0.92)

  const halves = []
  for (const [x0, x1] of [
    [0, 0.5],
    [0.5, 1],
  ]) {
    const src = document.createElement('canvas')
    src.width = Math.floor(w * (x1 - x0))
    src.height = bottom - top
    const sctx = src.getContext('2d', { willReadFrequently: true })
    sctx.drawImage(
      img,
      w * x0,
      top,
      w * (x1 - x0),
      bottom - top,
      0,
      0,
      src.width,
      src.height
    )
    halves.push(preprocessForOcr(src))
    // release intermediate
    src.width = 0
    src.height = 0
  }
  return halves
}

/** grayscale -> autocontrast -> 2x -> threshold(160). Returns new canvas. */
export function preprocessForOcr(srcCanvas) {
  const w = srcCanvas.width
  const h = srcCanvas.height
  const sctx = srcCanvas.getContext('2d', { willReadFrequently: true })
  const imgData = sctx.getImageData(0, 0, w, h)
  const px = imgData.data

  // grayscale + histogram for autocontrast
  const gray = new Uint8ClampedArray(w * h)
  const hist = new Array(256).fill(0)
  for (let i = 0; i < w * h; i++) {
    const g = Math.round(0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2])
    gray[i] = g
    hist[g]++
  }
  // 1% cutoff autocontrast
  const total = w * h
  let lo = 0
  let acc = 0
  while (lo < 255 && acc < total * 0.01) acc += hist[lo++]
  let hi = 255
  acc = 0
  while (hi > 0 && acc < total * 0.01) acc += hist[hi--]

  const out = document.createElement('canvas')
  const SCALE = 2
  out.width = w * SCALE
  out.height = h * SCALE
  const octx = out.getContext('2d')
  const oimg = octx.createImageData(out.width, out.height)
  const opx = oimg.data
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      let g = gray[Math.floor(y / SCALE) * w + Math.floor(x / SCALE)]
      g = hi > lo ? Math.round(((g - lo) / (hi - lo)) * 255) : g
      const v = g > 160 ? 255 : 0
      const o = (y * out.width + x) * 4
      opx[o] = opx[o + 1] = opx[o + 2] = v
      opx[o + 3] = 255
    }
  }
  octx.putImageData(oimg, 0, 0)
  return out
}

export function releaseCanvas(c) {
  if (c) {
    c.width = 0
    c.height = 0
  }
}
