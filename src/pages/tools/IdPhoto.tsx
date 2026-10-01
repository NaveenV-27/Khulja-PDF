import { useState, useRef } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes } from '../../lib/fileGuard'

type PresetKey = 'pan' | 'aadhaar' | 'college'
type BgKey = 'white' | 'blue'

interface PresetDef { label: string; mmW: number; mmH: number }
const PRESETS: Record<PresetKey, PresetDef> = {
  pan: { label: 'PAN Card (3.5×4.5cm)', mmW: 35, mmH: 45 },
  aadhaar: { label: 'Aadhaar (3.5×4.5cm)', mmW: 35, mmH: 45 },
  college: { label: 'College ID (3.0×4.0cm)', mmW: 30, mmH: 40 },
}

const BG_COLORS: Record<BgKey, string> = { white: '#FFFFFF', blue: '#DCEBF7' }

const DPI = 300
const mmToPx = (mm: number) => Math.round((mm / 25.4) * DPI)

interface Rect { x: number; y: number; w: number; h: number }

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export default function IdPhoto() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [displayScale, setDisplayScale] = useState(1)
  const [preset, setPreset] = useState<PresetKey>('pan')
  const [bg, setBg] = useState<BgKey>('white')
  const [rect, setRect] = useState<Rect | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Blob | null>(null)

  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)

  const MAX_DISPLAY_W = 640
  const def = PRESETS[preset]
  const ratio = def.mmW / def.mmH

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
    let h = Math.sign(pos.y - startPos.current.y || 1) * Math.abs(w) / ratio
    const x = w < 0 ? startPos.current.x + w : startPos.current.x
    const y = h < 0 ? startPos.current.y + h : startPos.current.y
    setRect({ x, y, w: Math.abs(w), h: Math.abs(h) })
  }

  const onMouseUp = () => { setDragging(false); startPos.current = null }

  const generate = async () => {
    if (!file || !img || !rect || rect.w < 5 || rect.h < 5) {
      setError('Draw a crop area first.'); return
    }
    setLoading(true); setError('')
    try {
      const invScale = 1 / displayScale
      const sx = rect.x * invScale, sy = rect.y * invScale
      const sw = rect.w * invScale, sh = rect.h * invScale

      const targetW = mmToPx(def.mmW)
      const targetH = mmToPx(def.mmH)

      const canvas = document.createElement('canvas')
      canvas.width = targetW
      canvas.height = targetH
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = BG_COLORS[bg]
      ctx.fillRect(0, 0, targetW, targetH)
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH)

      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/jpeg', 0.95)
      )
      setResult(blob)
    } catch (e) {
      setError(`Generation failed: ${String(e).slice(0, 120)}`)
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (!result) return
    const url = URL.createObjectURL(result)
    const a = document.createElement('a')
    a.href = url
    a.download = `id_photo_${preset}.jpg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const options = (
    <>
      <SectionLabel>ID Type</SectionLabel>
      <div className="grid grid-cols-1 gap-2 mb-4">
        {(Object.keys(PRESETS) as PresetKey[]).map(p => (
          <button key={p} onClick={() => { setPreset(p); setRect(null); setResult(null) }}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left"
            style={{
              fontFamily: 'Dosis, sans-serif',
              background: preset === p ? 'var(--accent-dim)' : 'var(--bg-card)',
              color: preset === p ? 'var(--accent)' : 'var(--text-2)',
              border: preset === p ? '1.5px solid var(--accent)' : '1px solid var(--border)',
            }}>
            {PRESETS[p].label}
          </button>
        ))}
      </div>

      <SectionLabel>Background</SectionLabel>
      <div className="grid grid-cols-2 gap-2 mb-2">
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
      <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-3)' }}>
        Drag on the image to select the face area. Crop is locked to the preset ratio.
      </p>
    </>
  )

  return (
    <ToolShell title="ID Card Photo Maker" subtitle="Generate photos in Indian ID formats" slug="id-photo" options={options}>
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
                <Spinner /><p className="text-sm" style={{ color: 'var(--text-2)' }}>Generating...</p>
              </div>
            )}

            {result && !loading && (
              <div className="card-glass rounded-xl p-5 flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Result</p>
                <p className="text-sm font-mono" style={{ color: 'var(--text)' }}>{def.mmW}×{def.mmH}mm · {formatBytes(result.size)}</p>
              </div>
            )}

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <div className="flex gap-3 flex-wrap">
              <button onClick={generate} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                {loading ? <><Spinner /> Generating...</> : <><RefreshCw size={15} /> Generate Photo</>}
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