import { useState, useRef } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes } from '../../lib/fileGuard'

type RatioKey = 'free' | '1:1' | '4:3' | '16:9' | 'passport'
const RATIOS: Record<RatioKey, number | null> = {
  free: null, '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9, passport: 35 / 45,
}

interface Rect { x: number; y: number; w: number; h: number }

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export default function ImageCrop() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [displayScale, setDisplayScale] = useState(1)
  const [ratio, setRatio] = useState<RatioKey>('free')
  const [rect, setRect] = useState<Rect | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Blob | null>(null)

  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)

  const MAX_DISPLAY_W = 640

  const handleFile = async (files: File[]) => {
    const f = files[0]
    const err = checkFileSize(f)
    if (err) { setError(err); return }
    try {
      const loaded = await loadImage(f)
      const scale = loaded.naturalWidth > MAX_DISPLAY_W ? MAX_DISPLAY_W / loaded.naturalWidth : 1
      setFile(f); setImg(loaded); setDisplayScale(scale)
      setRect(null); setResult(null); setError('')
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
    let h = pos.y - startPos.current.y
    const r = RATIOS[ratio]
    if (r) {
      h = Math.sign(h || 1) * Math.abs(w) / r
    }
    const x = w < 0 ? startPos.current.x + w : startPos.current.x
    const y = h < 0 ? startPos.current.y + h : startPos.current.y
    setRect({ x, y, w: Math.abs(w), h: Math.abs(h) })
  }

  const onMouseUp = () => { setDragging(false); startPos.current = null }

  const crop = async () => {
    if (!file || !img || !rect || rect.w < 5 || rect.h < 5) {
      setError('Draw a crop area first.'); return
    }
    setLoading(true); setError('')
    try {
      const invScale = 1 / displayScale
      const sx = rect.x * invScale, sy = rect.y * invScale
      const sw = rect.w * invScale, sh = rect.h * invScale

      const canvas = document.createElement('canvas')
      canvas.width = Math.round(sw)
      canvas.height = Math.round(sh)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Export failed'))), mimeType, 0.92)
      )
      setResult(blob)
    } catch (e) {
      setError(`Crop failed: ${String(e).slice(0, 120)}`)
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (!result || !file) return
    const url = URL.createObjectURL(result)
    const a = document.createElement('a')
    a.href = url
    const ext = file.type === 'image/png' ? 'png' : 'jpg'
    a.download = `${file.name.replace(/\.[^.]+$/, '')}_cropped.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const options = (
    <>
      <SectionLabel>Aspect Ratio</SectionLabel>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {(Object.keys(RATIOS) as RatioKey[]).map(r => (
          <button key={r} onClick={() => { setRatio(r); setRect(null) }}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              fontFamily: 'Dosis, sans-serif',
              background: ratio === r ? 'var(--accent-dim)' : 'var(--bg-card)',
              color: ratio === r ? 'var(--accent)' : 'var(--text-2)',
              border: ratio === r ? '1.5px solid var(--accent)' : '1px solid var(--border)',
            }}>
            {r === 'free' ? 'Freehand' : r === 'passport' ? 'Passport' : r}
          </button>
        ))}
      </div>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-3)' }}>
        Click and drag on the image to select the crop area.
      </p>
    </>
  )

  return (
    <ToolShell title="Image Cropper" subtitle="Crop images freehand or with fixed-ratio presets" slug="image-crop" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        {!file ? (
          <FileDropzone accept="image/*" onFiles={handleFile} label="Drop an image to crop" sublabel="JPG, PNG, WEBP — Max 50 MB" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="card-glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}>IMG</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>{file.name}</p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>{formatBytes(file.size)}</p>
              </div>
              <button onClick={() => { setFile(null); setImg(null); setRect(null); setResult(null) }} className="btn-ghost px-3 py-1.5 text-xs">Change</button>
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
                <Spinner /><p className="text-sm" style={{ color: 'var(--text-2)' }}>Cropping...</p>
              </div>
            )}

            {result && !loading && (
              <div className="card-glass rounded-xl p-5 flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Result</p>
                <p className="text-sm font-mono" style={{ color: 'var(--text)' }}>{formatBytes(result.size)}</p>
              </div>
            )}

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <div className="flex gap-3 flex-wrap">
              <button onClick={crop} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                {loading ? <><Spinner /> Cropping...</> : <><RefreshCw size={15} /> Crop Image</>}
              </button>
              {result && !loading && (
                <button onClick={download} className="btn-ghost flex items-center gap-2 px-5 py-2.5 text-sm">
                  <Download size={15} /> Download
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  )
}
