import { useState, useRef, useEffect } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes } from '../../lib/fileGuard'

type Preset = 'none' | 'grayscale' | 'sepia' | 'invert'

interface FilterState {
  brightness: number // 0-200, 100 = normal
  contrast: number    // 0-200, 100 = normal
  saturation: number  // 0-200, 100 = normal
  preset: Preset
}

const DEFAULT_FILTERS: FilterState = { brightness: 100, contrast: 100, saturation: 100, preset: 'none' }

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function buildCssFilter(f: FilterState): string {
  const parts = [
    `brightness(${f.brightness}%)`,
    `contrast(${f.contrast}%)`,
    `saturate(${f.saturation}%)`,
  ]
  if (f.preset === 'grayscale') parts.push('grayscale(100%)')
  if (f.preset === 'sepia') parts.push('sepia(100%)')
  if (f.preset === 'invert') parts.push('invert(100%)')
  return parts.join(' ')
}

async function applyFilters(img: HTMLImageElement, filters: FilterState, mimeType: string): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.filter = buildCssFilter(filters)
  ctx.drawImage(img, 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
      mimeType,
      0.92
    )
  })
}

export default function ImageFilters() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Blob | null>(null)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)

  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const handleFile = async (files: File[]) => {
    const f = files[0]
    const err = checkFileSize(f)
    if (err) { setError(err); return }

    try {
      const loaded = await loadImage(f)
      setFile(f)
      setImg(loaded)
      setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : '')
      setFilters(DEFAULT_FILTERS)
      setResult(null)
      setError('')
    } catch {
      setError('Could not read this image file.')
    }
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  const applyAndDownload = async () => {
    if (!file || !img) return
    setLoading(true); setError('')
    try {
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const blob = await applyFilters(img, filters, mimeType)
      setResult(blob)
    } catch (e) {
      setError(`Filter apply failed: ${String(e).slice(0, 120)}`)
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
    const base = file.name.replace(/\.[^.]+$/, '')
    a.download = `${base}_filtered.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const slider = (label: string, key: 'brightness' | 'contrast' | 'saturation') => (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-3)' }}>
        <span>{label}</span>
        <span className="font-mono" style={{ color: 'var(--text-2)' }}>{filters[key]}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="200"
        value={filters[key]}
        onChange={e => setFilters(prev => ({ ...prev, [key]: +e.target.value }))}
        className="w-full"
        style={{ accentColor: 'var(--accent)' }}
      />
    </div>
  )

  const options = (
    <>
      <SectionLabel>Adjustments</SectionLabel>
      {slider('Brightness', 'brightness')}
      {slider('Contrast', 'contrast')}
      {slider('Saturation', 'saturation')}

      <SectionLabel>Presets</SectionLabel>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {(['none', 'grayscale', 'sepia', 'invert'] as Preset[]).map(p => (
          <button key={p} onClick={() => setFilters(prev => ({ ...prev, preset: p }))}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              fontFamily: 'Dosis, sans-serif',
              background: filters.preset === p ? 'var(--accent-dim)' : 'var(--bg-card)',
              color: filters.preset === p ? 'var(--accent)' : 'var(--text-2)',
              border: filters.preset === p ? '1.5px solid var(--accent)' : '1px solid var(--border)',
            }}>
            {p === 'none' ? 'None' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <button onClick={reset} className="btn-ghost w-full text-xs py-2 mt-2">Reset all</button>
    </>
  )

  return (
    <ToolShell title="Image Filters" subtitle="Adjust brightness, contrast, saturation, or apply a preset" slug="image-filters" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        {!file ? (
          <FileDropzone accept="image/*" onFiles={handleFile} label="Drop an image to edit" sublabel="JPG, PNG, WEBP — Max 50 MB" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="card-glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}>
                IMG
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>{file.name}</p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>{formatBytes(file.size)}</p>
              </div>
              <button onClick={() => { setFile(null); setImg(null); setResult(null); setPreviewUrl('') }} className="btn-ghost px-3 py-1.5 text-xs">Change</button>
            </div>

            {/* Live CSS-filter preview — cheap, no canvas re-render on every slider tick */}
            {previewUrl && (
              <div className="card-glass rounded-xl p-4 flex items-center justify-center" style={{ maxHeight: 400, overflow: 'hidden' }}>
                <img
                  src={previewUrl}
                  alt="preview"
                  style={{ maxWidth: '100%', maxHeight: 360, filter: buildCssFilter(filters), borderRadius: 8 }}
                />
              </div>
            )}

            {loading && (
              <div className="card-glass rounded-xl p-4 flex items-center gap-3">
                <Spinner />
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>Applying filters...</p>
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
              <button onClick={applyAndDownload} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                {loading ? <><Spinner /> Applying...</> : <><RefreshCw size={15} /> Apply Filters</>}
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
