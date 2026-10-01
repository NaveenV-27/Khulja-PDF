import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes } from '../../lib/fileGuard'

interface QueueItem { file: File; status: 'pending' | 'done' | 'error'; resultBlob?: Blob }

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

async function resizeOne(file: File, targetW: number, targetH: number): Promise<Blob> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(targetW)
  canvas.height = Math.round(targetH)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Export failed'))), mimeType, 0.9)
  )
}

export default function BulkResize() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [width, setWidth] = useState('800')
  const [height, setHeight] = useState('600')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [zipReady, setZipReady] = useState(false)
  const [zipBlob, setZipBlob] = useState<Blob | null>(null)

  const handleFiles = (files: File[]) => {
    for (const f of files) {
      const err = checkFileSize(f)
      if (err) { setError(err); return }
    }
    setQueue(files.map(f => ({ file: f, status: 'pending' as const })))
    setZipReady(false); setZipBlob(null); setError('')
  }

  const processAll = async () => {
    const w = parseFloat(width), h = parseFloat(height)
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      setError('Enter valid width and height.'); return
    }
    setLoading(true); setError(''); setProgress(0)

    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const updated = [...queue]

      for (let i = 0; i < updated.length; i++) {
        try {
          const blob = await resizeOne(updated[i].file, w, h)
          updated[i] = { ...updated[i], status: 'done', resultBlob: blob }
          const ext = updated[i].file.type === 'image/png' ? 'png' : 'jpg'
          zip.file(`${updated[i].file.name.replace(/\.[^.]+$/, '')}_resized.${ext}`, blob)
        } catch {
          updated[i] = { ...updated[i], status: 'error' }
        }
        setProgress(Math.round(((i + 1) / updated.length) * 100))
        setQueue([...updated])
      }

      const zipBlobResult = await zip.generateAsync({ type: 'blob' })
      setZipBlob(zipBlobResult)
      setZipReady(true)
    } catch (e) {
      setError(`Bulk resize failed: ${String(e).slice(0, 120)}`)
    } finally {
      setLoading(false)
    }
  }

  const downloadZip = () => {
    if (!zipBlob) return
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'resized_images.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  const options = (
    <>
      <SectionLabel>Target Size (applied to all)</SectionLabel>
      <div className="flex gap-2 items-center mb-2">
        <input type="number" min="1" value={width} onChange={e => setWidth(e.target.value)} placeholder="Width"
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none font-mono"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        <span style={{ color: 'var(--text-3)' }} className="text-xs">×</span>
        <input type="number" min="1" value={height} onChange={e => setHeight(e.target.value)} placeholder="Height"
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none font-mono"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
      </div>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-3)' }}>
        Same dimensions applied to every image in the batch. Aspect ratio is not preserved automatically — set values matching your images if needed.
      </p>
    </>
  )

  return (
    <ToolShell title="Bulk Image Resize" subtitle="Resize multiple images at once and download as ZIP" slug="bulk-resize" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        {queue.length === 0 ? (
          <FileDropzone accept="image/*" onFiles={handleFiles} label="Drop multiple images here" sublabel="JPG, PNG, WEBP — Max 50 MB each" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="card-glass rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>
                {queue.length} file{queue.length > 1 ? 's' : ''} queued
              </p>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {queue.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5" style={{ borderBottom: i < queue.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span className="truncate flex-1" style={{ color: 'var(--text-2)' }}>{item.file.name}</span>
                    <span className="font-mono ml-2" style={{
                      color: item.status === 'done' ? '#10B981' : item.status === 'error' ? '#EF4444' : 'var(--text-3)'
                    }}>
                      {item.status === 'done' ? 'Done' : item.status === 'error' ? 'Failed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
              <button onClick={() => { setQueue([]); setZipReady(false); setZipBlob(null) }} className="btn-ghost text-xs mt-3 px-3 py-1.5">Clear queue</button>
            </div>

            {loading && (
              <div className="card-glass rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Spinner /><p className="text-sm" style={{ color: 'var(--text-2)' }}>Processing... {progress}%</p>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <div className="flex gap-3 flex-wrap">
              <button onClick={processAll} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                {loading ? <><Spinner /> Processing...</> : <><RefreshCw size={15} /> Resize All</>}
              </button>
              {zipReady && !loading && (
                <button onClick={downloadZip} className="btn-ghost flex items-center gap-2 px-5 py-2.5 text-sm">
                  <Download size={15} /> Download ZIP
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  )
}
