import { useState, useRef } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes } from '../../lib/fileGuard'

type CountryKey = 'india' | 'us' | 'uk'
type BgKey = 'white' | 'blue'
type SheetCount = 6 | 8

interface PresetDef { label: string; mmW: number; mmH: number }
const PRESETS: Record<CountryKey, PresetDef> = {
  india: { label: 'India (35×45mm)', mmW: 35, mmH: 45 },
  us: { label: 'US (51×51mm)', mmW: 51, mmH: 51 },
  uk: { label: 'UK (35×45mm)', mmW: 35, mmH: 45 },
}

const BG_COLORS: Record<BgKey, string> = { white: '#FFFFFF', blue: '#DCEBF7' }

const DPI = 300
const mmToPx = (mm: number) => Math.round((mm / 25.4) * DPI)

const A4_W_MM = 210
const A4_H_MM = 297

interface Rect { x: number; y: number; w: number; h: number }

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export default function PassportPhoto() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [displayScale, setDisplayScale] = useState(1)
  const [country, setCountry] = useState<CountryKey>('india')
  const [bg, setBg] = useState<BgKey>('white')
  const [sheetCount, setSheetCount] = useState<SheetCount>(8)
  const [rect, setRect] = useState<Rect | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photoResult, setPhotoResult] = useState<Blob | null>(null)
  const [sheetResult, setSheetResult] = useState<Blob | null>(null)

  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)

  const MAX_DISPLAY_W = 640
  const preset = PRESETS[country]
  const ratio = preset.mmW / preset.mmH

  const handleFile = async (files: File[]) => {
    const f = files[0]
    const err = checkFileSize(f)
    if (err) { setError(err); return }
    try {
      const loaded = await loadImage(f)
      const scale = loaded.naturalWidth > MAX_DISPLAY_W ? MAX_DISPLAY_W / loaded.naturalWidth : 1
      setFile(f); setImg(loaded); setDisplayScale(scale)
      setRect(null); setPhotoResult(null); setSheetResult(null); setError('')
    } catch {
      setError('Could not read this image file.')
    }
  }

  const getRelativePos = (e: React.MouseEvent) => {
    const wrap = canvasWrapRef.current!
    const b = wrap.getBoundingClientRect()
    return { x: Math.max(0, Math.min(e.clientX - b.left, b.width)), y: Math.max(0, Math.min(e.clientY - b.top, b.height)) }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    const pos = getRelativePos(e)
    startPos.current = pos
    setDragging(true)
    setRect({ x: pos.x, y: pos.y, w: 0, h: 0 })
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !startPos.current || !img) return
    const pos = getRelativePos(e)
    let w = pos.x - startPos.current.x
    let h = Math.sign(pos.y - startPos.current.y || 1) * Math.abs(w) / ratio
    const x = w < 0 ? startPos.current.x + w : startPos.current.x
    const y = h < 0 ? startPos.current.y + h : startPos.current.y
    setRect({ x, y, w: Math.abs(w), h: Math.abs(h) })
  }

  const onMouseUp = () => { setDragging(false); startPos.current = null }

  const cropToPhotoCanvas = (): HTMLCanvasElement => {
    if (!img || !rect) throw new Error('Draw a crop area first.')
    const invScale = 1 / displayScale
    const sx = rect.x * invScale, sy = rect.y * invScale
    const sw = rect.w * invScale, sh = rect.h * invScale

    const targetW = mmToPx(preset.mmW)
    const targetH = mmToPx(preset.mmH)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = BG_COLORS[bg]
    ctx.fillRect(0, 0, targetW, targetH)
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH)
    return canvas
  }

  const generate = async () => {
    if (!file || !img || !rect || rect.w < 5 || rect.h < 5) {
      setError('Draw a crop area first.'); return
    }
    setLoading(true); setError('')
    try {
      const photoCanvas = cropToPhotoCanvas()
      const photoBlob: Blob = await new Promise((resolve, reject) =>
        photoCanvas.toBlob(b => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/jpeg', 0.95)
      )
      setPhotoResult(photoBlob)

      const photoImg = await loadImage(new File([photoBlob], 'photo.jpg', { type: 'image/jpeg' }))
      const sheetCanvas = document.createElement('canvas')
      sheetCanvas.width = mmToPx(A4_W_MM)
      sheetCanvas.height = mmToPx(A4_H_MM)
      const sctx = sheetCanvas.getContext('2d')!
      sctx.fillStyle = '#FFFFFF'
      sctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height)

      const cellW = mmToPx(preset.mmW)
      const cellH = mmToPx(preset.mmH)
      const gap = mmToPx(4)
      const cols = 3
      const rows = Math.ceil(sheetCount / cols)
      const totalW = cols * cellW + (cols - 1) * gap
      const totalH = rows * cellH + (rows - 1) * gap
      const startX = (sheetCanvas.width - totalW) / 2
      const startY = (sheetCanvas.height - totalH) / 2

      for (let i = 0; i < sheetCount; i++) {
        const row = Math.floor(i / cols)
        const col = i % cols
        const x = startX + col * (cellW + gap)
        const y = startY + row * (cellH + gap)
        sctx.drawImage(photoImg, x, y, cellW, cellH)
        sctx.strokeStyle = '#CCCCCC'
        sctx.lineWidth = 1
        sctx.strokeRect(x, y, cellW, cellH)
      }

      const sheetBlob: Blob = await new Promise((resolve, reject) =>
        sheetCanvas.toBlob(b => (b ? resolve(b) : reject(new Error('Sheet export failed'))), 'image/jpeg', 0.95)
      )
      setSheetResult(sheetBlob)
    } catch (e) {
      setError(`Generation failed: ${String(e).slice(0, 120)}`)
    } finally {
      setLoading(false)
    }
  }

  const downloadPhoto = () => {
    if (!photoResult) return
    const url = URL.createObjectURL(photoResult)
    const a = document.createElement('a')
    a.href = url
    a.download = `passport_photo_${country}.jpg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadSheet = () => {
    if (!sheetResult) return
    const url = URL.createObjectURL(sheetResult)
    const a = document.createElement('a')
    a.href = url
    a.download = `passport_sheet_${country}_${sheetCount}up.jpg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const options = (
    <>
      <SectionLabel>Country Preset</SectionLabel>
      <div className="grid grid-cols-1 gap-2 mb-4">
        {(Object.keys(PRESETS) as CountryKey[]).map(c => (
          <button key={c} onClick={() => { setCountry(c); setRect(null); setPhotoResult(null); setSheetResult(null) }}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left"
            style={{
              fontFamily: 'Dosis, sans-serif',
              background: country === c ? 'var(--accent-dim)' : 'var(--bg-card)',
              color: country === c ? 'var(--accent)' : 'var(--text-2)',
              border: country === c ? '1.5px solid var(--accent)' : '1px solid var(--border)',
            }}>
            {PRESETS[c].label}
          </button>
        ))}
      </div>

      <SectionLabel>Background</SectionLabel>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(Object.keys(BG_COLORS) as BgKey[]).map(b => (
          <button key={b} onClick={() => setBg(b)}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 justify-center"
            style={{
              fontFamily: 'Dosis, sans-serif',
              background: bg === b ? 'var(--accent-dim)' : 'var(--bg-card)',
              color: bg === b ? 'var(--accent)' : 'var(--text-2)',
              border: bg === b ? '1.5px solid var(--accent)' : '1px solid var(--border)',
            }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: BG_COLORS[b], border: '1px solid var(--border)' }} />
            {b === 'white' ? 'White' : 'Light Blue'}
          </button>
        ))}
      </div>

      <SectionLabel>Print Sheet</SectionLabel>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {([6, 8] as SheetCount[]).map(n => (
          <button key={n} onClick={() => setSheetCount(n)}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              fontFamily: 'Dosis, sans-serif',
              background: sheetCount === n ? 'var(--accent-dim)' : 'var(--bg-card)',
              color: sheetCount === n ? 'var(--accent)' : 'var(--text-2)',
              border: sheetCount === n ? '1.5px solid var(--accent)' : '1px solid var(--border)',
            }}>
            {n} photos / A4
          </button>
        ))}
      </div>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-3)' }}>
        Drag on the image to select the face area. Crop is locked to the preset ratio.
      </p>
    </>
  )

  return (
    <ToolShell title="Passport Size Photo Maker" subtitle="Generate print-ready passport photos with country presets" slug="passport-photo" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        {!file ? (
          <FileDropzone accept="image/*" onFiles={handleFile} label="Drop a photo to crop" sublabel="JPG, PNG, WEBP — Max 50 MB" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="card-glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}>IMG</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>{file.name}</p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>{formatBytes(file.size)}</p>
              </div>
              <button onClick={() => { setFile(null); setImg(null); setRect(null); setPhotoResult(null); setSheetResult(null) }} className="btn-ghost px-3 py-1.5 text-xs">Change</button>
            </div>

            {img && (
              <div
                ref={canvasWrapRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                className="relative select-none rounded-xl overflow-hidden"
                style={{
                  width: img.naturalWidth * displayScale,
                  height: img.naturalHeight * displayScale,
                  maxWidth: '100%',
                  cursor: 'crosshair',
                  border: '1px solid var(--border)',
                }}
              >
                <img src={img.src} draggable={false} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />
                {rect && (
                  <div style={{
                    position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h,
                    border: '2px solid var(--accent)', background: 'rgba(245,158,11,0.15)', pointerEvents: 'none',
                  }} />
                )}
              </div>
            )}

            {loading && (
              <div className="card-glass rounded-xl p-4 flex items-center gap-3">
                <Spinner /><p className="text-sm" style={{ color: 'var(--text-2)' }}>Generating...</p>
              </div>
            )}

            {photoResult && !loading && (
              <div className="card-glass rounded-xl p-5 flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Result</p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Photo size</p>
                    <p className="text-base font-bold font-mono" style={{ color: 'var(--text)' }}>{preset.mmW}×{preset.mmH}mm</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Sheet layout</p>
                    <p className="text-base font-bold font-mono" style={{ color: 'var(--text)' }}>A4 · {sheetCount}-up</p>
                  </div>
                </div>
              </div>
            )}

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <div className="flex gap-3 flex-wrap">
              <button onClick={generate} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                {loading ? <><Spinner /> Generating...</> : <><RefreshCw size={15} /> Generate Photo</>}
              </button>
              {photoResult && !loading && (
                <button onClick={downloadPhoto} className="btn-ghost flex items-center gap-2 px-5 py-2.5 text-sm">
                  <Download size={15} /> Download Photo
                </button>
              )}
              {sheetResult && !loading && (
                <button onClick={downloadSheet} className="btn-ghost flex items-center gap-2 px-5 py-2.5 text-sm">
                  <Download size={15} /> Download A4 Sheet
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  )
}