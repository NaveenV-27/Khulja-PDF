import { useState } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'
import JSZip from 'jszip'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes } from '../../lib/fileGuard'

interface CompressedItem {
  file: File
  blob: Blob
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

async function compressOne(file: File, quality: number): Promise<Blob> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Compression failed'))), mimeType, quality / 100)
  )
}

export default function ImageCompress() {
  const [files, setFiles] = useState<File[]>([])
  const [quality, setQuality] = useState(70)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<CompressedItem[]>([])

  const handleFiles = (incoming: File[]) => {
    for (const f of incoming) {
      const err = checkFileSize(f)
      if (err) { setError(err); return }
    }
    setFiles(prev => [...prev, ...incoming])
    setResults([])
    setError('')
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setResults([])
  }

  const compressAll = async () => {
    if (files.length === 0) { setError('Add at least one image.'); return }
    setLoading(true); setError('')
    try {
      const out: CompressedItem[] = []
      for (const file of files) {
        const blob = await compressOne(file, quality)
        out.push({ file, blob })
      }
      setResults(out)
    } catch (e) {
      setError(`Compression failed: ${String(e).slice(0, 120)}`)
    } finally {
      setLoading(false)
    }
  }

  const downloadSingle = (item: CompressedItem) => {
    const url = URL.createObjectURL(item.blob)
    const a = document.createElement('a')
    a.href = url
    const ext = item.file.type === 'image/png' ? 'png' : 'jpg'
    a.download = `${item.file.name.replace(/\.[^.]+$/, '')}_compressed.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadAll = async () => {
    if (results.length === 0) return
    if (results.length === 1) { downloadSingle(results[0]); return }
    const zip = new JSZip()
    results.forEach(item => {
      const ext = item.file.type === 'image/png' ? 'png' : 'jpg'
      zip.file(`${item.file.name.replace(/\.[^.]+$/, '')}_compressed.${ext}`, item.blob)
    })
    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compressed_images.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalOriginal = files.reduce((s, f) => s + f.size, 0)
  const totalCompressed = results.reduce((s, r) => s + r.blob.size, 0)
  const savedPct = totalOriginal > 0 && results.length > 0
    ? Math.round((1 - totalCompressed / totalOriginal) * 100)
    : 0

  const options = (
    <>
      <SectionLabel>Quality</SectionLabel>
      <div className="flex items-center gap-3 mb-2">
        <input
          type="range"
          min="1"
          max="100"
          value={quality}
          onChange={e => { setQuality(Number(e.target.value)); setResults([]) }}
          className="flex-1"
        />
        <span className="text-sm font-mono font-semibold w-10 text-right" style={{ color: 'var(--text)' }}>{quality}</span>
      </div>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-3)' }}>
        Lower quality means smaller file size. 60–80 works well for most photos.
      </p>
    </>
  )

  return (
    <ToolShell title="Image Compressor" subtitle="Compress JPG/PNG/WEBP images with quality control" slug="image-compress" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        <FileDropzone accept="image/*" onFiles={handleFiles} label="Drop images to compress" sublabel="JPG, PNG, WEBP — Max 50 MB each, multiple allowed" />

        {files.length > 0 && (
          <div className="flex flex-col gap-2">
            {files.map((f, idx) => {
              const compressedItem = results.find(r => r.file === f)
              return (
                <div key={`${f.name}-${idx}`} className="card-glass rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}>IMG</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>{f.name}</p>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>
                      {formatBytes(f.size)}
                      {compressedItem && <> → {formatBytes(compressedItem.blob.size)}</>}
                    </p>
                  </div>
                  {compressedItem && (
                    <button onClick={() => downloadSingle(compressedItem)} className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1">
                      <Download size={13} /> Save
                    </button>
                  )}
                  <button onClick={() => removeFile(idx)} className="btn-ghost px-2 py-1.5">
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {loading && (
          <div className="card-glass rounded-xl p-4 flex items-center gap-3">
            <Spinner /><p className="text-sm" style={{ color: 'var(--text-2)' }}>Compressing...</p>
          </div>
        )}

        {results.length > 0 && !loading && (
          <div className="card-glass rounded-xl p-5 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Result</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Original</p>
                <p className="text-sm font-bold font-mono" style={{ color: 'var(--text)' }}>{formatBytes(totalOriginal)}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Compressed</p>
                <p className="text-sm font-bold font-mono" style={{ color: 'var(--text)' }}>{formatBytes(totalCompressed)}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Saved</p>
                <p className="text-sm font-bold font-mono" style={{ color: 'var(--accent)' }}>{savedPct}%</p>
              </div>
            </div>
          </div>
        )}

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <div className="flex gap-3 flex-wrap">
          <button onClick={compressAll} disabled={loading || files.length === 0} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
            {loading ? <><Spinner /> Compressing...</> : <><RefreshCw size={15} /> Compress {files.length > 1 ? 'All' : 'Image'}</>}
          </button>
          {results.length > 0 && !loading && (
            <button onClick={downloadAll} className="btn-ghost flex items-center gap-2 px-5 py-2.5 text-sm">
              <Download size={15} /> {results.length > 1 ? 'Download ZIP' : 'Download'}
            </button>
          )}
        </div>
      </div>
    </ToolShell>
  )
}