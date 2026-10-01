import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes } from '../../lib/fileGuard'

type BgMode = 'solid' | 'gradient'

const GRADIENT_PRESETS: { name: string; from: string; to: string }[] = [
  { name: 'Sunset', from: '#F59E0B', to: '#EC4899' },
  { name: 'Ocean', from: '#06B6D4', to: '#3B82F6' },
  { name: 'Forest', from: '#10B981', to: '#065F46' },
  { name: 'Violet', from: '#8B5CF6', to: '#3B0764' },
]

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export default function AddBackground() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Blob | null>(null)

  const [mode, setMode] = useState<BgMode>('solid')
  const [solidColor, setSolidColor] = useState('#ffffff')
  const [gradient, setGradient] = useState(GRADIENT_PRESETS[0])

  const handleFile = async (files: File[]) => {
    const f = files[0]
    const err = checkFileSize(f)
    if (err) { setError(err); return }
    try {
      const loaded = await loadImage(f)
      setFile(f); setImg(loaded); setResult(null); setError('')
    } catch {
      setError('Could not read this image file.')
    }
  }

  const apply = async () => {
    if (!file || !img) return
    setLoading(true); setError('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!

      if (mode === 'solid') {
        ctx.fillStyle = solidColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      } else {
        const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
        g.addColorStop(0, gradient.from)
        g.addColorStop(1, gradient.to)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.drawImage(img, 0, 0)

      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/jpeg', 0.92)
      )
      setResult(blob)
    } catch (e) {
      setError(`Failed to add background: ${String(e).slice(0, 120)}`)
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (!result || !file) return
    const url = URL.createObjectURL(result)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file.name.replace(/\.[^.]+$/, '')}_bg.jpg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const options = (
    <>
      <SectionLabel>Background Type</SectionLabel>
      <div className="flex items-center justify-between mb-4 p-1 rounded-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {(['solid', 'gradient'] as BgMode[]).map(m => {
          const active = mode === m
          return (
            <button key={m} onClick={() => setMode(m)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ fontFamily: 'Dosis, sans-serif', background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--text-3)' }}>
              {m === 'solid' ? 'Solid Color' : 'Gradient'}
            </button>
          )
        })}
      </div>

      {mode === 'solid' ? (
        <>
          <SectionLabel>Color</SectionLabel>
          <div className="flex items-center gap-2 mb-2">
            <input type="color" value={solidColor} onChange={e => setSolidColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer" style={{ border: '1px solid var(--border)' }} />
            <input type="text" value={solidColor} onChange={e => setSolidColor(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none font-mono"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['#ffffff', '#000000', '#3B82F6', '#EF4444'].map(c => (
              <button key={c} onClick={() => setSolidColor(c)} className="w-7 h-7 rounded-full"
                style={{ background: c, border: '1.5px solid var(--border)' }} />
            ))}
          </div>
        </>
      ) : (
        <>
          <SectionLabel>Preset Gradients</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {GRADIENT_PRESETS.map(g => (
              <button key={g.name} onClick={() => setGradient(g)}
                className="rounded-lg p-3 text-xs font-semibold text-left"
                style={{
                  background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                  border: gradient.name === g.name ? '2px solid var(--text)' : '1px solid var(--border)',
                  color: '#fff', fontFamily: 'Dosis, sans-serif',
                }}>
                {g.name}
              </button>
            ))}
          </div>
        </>
      )}

      <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--text-3)' }}>
        Works best on images with a transparent background (e.g. output from Remove Background).
      </p>
    </>
  )

  return (
    <ToolShell title="Add Background" subtitle="Add a solid color or gradient behind a transparent image" slug="add-bg" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        {!file ? (
          <FileDropzone accept="image/png,image/webp" onFiles={handleFile} label="Drop a transparent PNG/WEBP" sublabel="Max 50 MB" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="card-glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}>IMG</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>{file.name}</p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>{formatBytes(file.size)}</p>
              </div>
              <button onClick={() => { setFile(null); setImg(null); setResult(null) }} className="btn-ghost px-3 py-1.5 text-xs">Change</button>
            </div>

            {loading && (
              <div className="card-glass rounded-xl p-4 flex items-center gap-3">
                <Spinner /><p className="text-sm" style={{ color: 'var(--text-2)' }}>Applying background...</p>
              </div>
            )}

            {result && !loading && (
              <div className="card-glass rounded-xl p-4 flex items-center justify-center" style={{ maxHeight: 400, overflow: 'hidden' }}>
                <img src={URL.createObjectURL(result)} alt="result" style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 8 }} />
              </div>
            )}

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <div className="flex gap-3 flex-wrap">
              <button onClick={apply} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                {loading ? <><Spinner /> Applying...</> : <><RefreshCw size={15} /> Apply Background</>}
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
