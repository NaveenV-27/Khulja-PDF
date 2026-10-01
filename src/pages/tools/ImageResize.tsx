import { useState, useRef } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes } from '../../lib/fileGuard'

type ResizeMode = 'pixels' | 'percent'

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

async function resizeImage(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
  mimeType: string,
  quality: number
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(targetW))
  canvas.height = Math.max(1, Math.round(targetH))
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
      mimeType,
      quality
    )
  })
}

export default function ImageResize() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [origDims, setOrigDims] = useState<{ w: number; h: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ blob: Blob; w: number; h: number } | null>(null)

  const [mode, setMode] = useState<ResizeMode>('pixels')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [percent, setPercent] = useState('50')
  const [lockAspect, setLockAspect] = useState(true)

  const aspectRef = useRef(1)

  const handleFile = async (files: File[]) => {
    const f = files[0]
    const err = checkFileSize(f)
    if (err) { setError(err); return }

    try {
      const loaded = await loadImage(f)
      setFile(f)
      setImg(loaded)
      setOrigDims({ w: loaded.naturalWidth, h: loaded.naturalHeight })
      aspectRef.current = loaded.naturalWidth / loaded.naturalHeight
      setWidth(String(loaded.naturalWidth))
      setHeight(String(loaded.naturalHeight))
      setResult(null)
      setError('')
    } catch {
      setError('Could not read this image file.')
    }
  }

  const onWidthChange = (v: string) => {
    setWidth(v)
    if (lockAspect && v) {
      const w = parseFloat(v)
      if (!isNaN(w)) setHeight(String(Math.round(w / aspectRef.current)))
    }
  }

  const onHeightChange = (v: string) => {
    setHeight(v)
    if (lockAspect && v) {
      const h = parseFloat(v)
      if (!isNaN(h)) setWidth(String(Math.round(h * aspectRef.current)))
    }
  }

  const resize = async () => {
    if (!file || !img || !origDims) return
    setLoading(true); setError('')

    try {
      let targetW: number, targetH: number

      if (mode === 'pixels') {
        targetW = parseFloat(width)
        targetH = parseFloat(height)
        if (isNaN(targetW) || isNaN(targetH) || targetW <= 0 || targetH <= 0) {
          setError('Enter valid width and height.'); setLoading(false); return
        }
      } else {
        const pct = parseFloat(percent)
        if (isNaN(pct) || pct <= 0) {
          setError('Enter a valid percentage.'); setLoading(false); return
        }
        targetW = origDims.w * (pct / 100)
        targetH = origDims.h * (pct / 100)
      }

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const blob = await resizeImage(img, targetW, targetH, mimeType, 0.92)
      setResult({ blob, w: Math.round(targetW), h: Math.round(targetH) })
    } catch (e) {
      setError(`Resize failed: ${String(e).slice(0, 120)}`)
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (!result || !file) return
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    const ext = file.type === 'image/png' ? 'png' : 'jpg'
    const base = file.name.replace(/\.[^.]+$/, '')
    a.download = `${base}_${result.w}x${result.h}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const options = (
    <>
      <SectionLabel>Mode</SectionLabel>
      <div className="flex items-center justify-between mb-4 p-1 rounded-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {(['pixels', 'percent'] as ResizeMode[]).map(m => {
          const active = mode === m
          return (
            <button key={m} onClick={() => setMode(m)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                fontFamily: 'Dosis, sans-serif',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text-3)',
              }}>
              {m === 'pixels' ? 'Pixels' : 'Percent'}
            </button>
          )
        })}
      </div>

      {mode === 'pixels' ? (
        <>
          <SectionLabel>Dimensions</SectionLabel>
          <div className="flex gap-2 items-center mb-2">
            <input
              type="number"
              min="1"
              value={width}
              onChange={e => onWidthChange(e.target.value)}
              placeholder="Width"
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none font-mono"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <span style={{ color: 'var(--text-3)' }} className="text-xs">×</span>
            <input
              type="number"
              min="1"
              value={height}
              onChange={e => onHeightChange(e.target.value)}
              placeholder="Height"
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none font-mono"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>
          <label className="flex items-center gap-2 text-xs mt-2 cursor-pointer" style={{ color: 'var(--text-3)' }}>
            <input type="checkbox" checked={lockAspect} onChange={e => setLockAspect(e.target.checked)} />
            Lock aspect ratio
          </label>
        </>
      ) : (
        <>
          <SectionLabel>Scale</SectionLabel>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="number"
              min="1"
              max="500"
              value={percent}
              onChange={e => setPercent(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none font-mono"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>%</span>
          </div>
          {origDims && percent && !isNaN(parseFloat(percent)) && (
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Output: <span className="font-mono" style={{ color: 'var(--text-2)' }}>
                {Math.round(origDims.w * (parseFloat(percent) / 100))} × {Math.round(origDims.h * (parseFloat(percent) / 100))}
              </span>
            </p>
          )}
        </>
      )}
    </>
  )

  return (
    <ToolShell title="Image Resizer" subtitle="Resize images by pixels or percentage" slug="image-resize" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        {!file ? (
          <FileDropzone accept="image/*" onFiles={handleFile} label="Drop an image to resize" sublabel="JPG, PNG, WEBP — Max 50 MB" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="card-glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}>
                IMG
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>{file.name}</p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>
                  {formatBytes(file.size)} · {origDims?.w}×{origDims?.h}
                </p>
              </div>
              <button onClick={() => { setFile(null); setImg(null); setOrigDims(null); setResult(null) }} className="btn-ghost px-3 py-1.5 text-xs">Change</button>
            </div>

            {loading && (
              <div className="card-glass rounded-xl p-4 flex items-center gap-3">
                <Spinner />
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>Resizing...</p>
              </div>
            )}

            {result && !loading && (
              <div className="card-glass rounded-xl p-5 flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Result</p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>New dimensions</p>
                    <p className="text-base font-bold font-mono" style={{ color: 'var(--text)' }}>{result.w} × {result.h}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>File size</p>
                    <p className="text-base font-bold font-mono" style={{ color: 'var(--text)' }}>{formatBytes(result.blob.size)}</p>
                  </div>
                </div>
              </div>
            )}

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <div className="flex gap-3 flex-wrap">
              <button onClick={resize} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                {loading ? <><Spinner /> Resizing...</> : <><RefreshCw size={15} /> Resize Image</>}
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
