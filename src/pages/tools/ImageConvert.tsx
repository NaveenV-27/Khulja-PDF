import { useState } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'
import JSZip from 'jszip'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes } from '../../lib/fileGuard'

type OutputFormat = 'jpeg' | 'png' | 'webp' | 'bmp'

const FORMAT_LABELS: Record<OutputFormat, string> = {
  jpeg: 'JPG', png: 'PNG', webp: 'WEBP', bmp: 'BMP',
}

const FORMAT_MIME: Record<OutputFormat, string> = {
  jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', bmp: 'image/bmp',
}

const FORMAT_EXT: Record<OutputFormat, string> = {
  jpeg: 'jpg', png: 'png', webp: 'webp', bmp: 'bmp',
}

interface ConvertedItem {
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

async function convertOne(file: File, format: OutputFormat): Promise<Blob> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  if (format === 'jpeg' || format === 'bmp') {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0)
  const mimeType = FORMAT_MIME[format]
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error(`This browser can't export ${FORMAT_LABELS[format]}.`))), mimeType, 0.95)
  )
}

export default function ImageConvert() {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState<OutputFormat>('png')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<ConvertedItem[]>([])

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

  const convertAll = async () => {
    if (files.length === 0) { setError('Add at least one image.'); return }
    setLoading(true); setError('')
    try {
      const out: ConvertedItem[] = []
      for (const file of files) {
        const blob = await convertOne(file, format)
        out.push({ file, blob })
      }
      setResults(out)
    } catch (e) {
      setError(`Conversion failed: ${String(e).slice(0, 120)}`)
    } finally {
      setLoading(false)
    }
  }

  const downloadSingle = (item: ConvertedItem) => {
    const url = URL.createObjectURL(item.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${item.file.name.replace(/\.[^.]+$/, '')}.${FORMAT_EXT[format]}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadAll = async () => {
    if (results.length === 0) return
    if (results.length === 1) { downloadSingle(results[0]); return }
    const zip = new JSZip()
    results.forEach(item => {
      zip.file(`${item.file.name.replace(/\.[^.]+$/, '')}.${FORMAT_EXT[format]}`, item.blob)
    })
    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = 'converted_images.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  const options = (
    <>
      <SectionLabel>Output Format</SectionLabel>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {(Object.keys(FORMAT_LABELS) as OutputFormat[]).map(f => (
          <button key={f} onClick={() => { setFormat(f); setResults([]) }}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              fontFamily: 'Dosis, sans-serif',
              background: format === f ? 'var(--accent-dim)' : 'var(--bg-card)',
              color: format === f ? 'var(--accent)' : 'var(--text-2)',
              border: format === f ? '1.5px solid var(--accent)' : '1px solid var(--border)',
            }}>
            {FORMAT_LABELS[f]}
          </button>
        ))}
      </div>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-3)' }}>
        JPG and BMP flatten transparency onto a white background.
      </p>
    </>
  )

  return (
    <ToolShell title="Image Format Converter" subtitle="Convert images between JPG, PNG, WEBP and BMP" slug="image-convert" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        <FileDropzone accept="image/*" onFiles={handleFiles} label="Drop images to convert" sublabel="JPG, PNG, WEBP, BMP — Max 50 MB each, multiple allowed" />

        {files.length > 0 && (
          <div className="flex flex-col gap-2">
            {files.map((f, idx) => {
              const convertedItem = results.find(r => r.file === f)
              return (
                <div key={`${f.name}-${idx}`} className="card-glass rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}>IMG</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>{f.name}</p>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>
                      {formatBytes(f.size)}
                      {convertedItem && <> → {FORMAT_LABELS[format]} · {formatBytes(convertedItem.blob.size)}</>}
                    </p>
                  </div>
                  {convertedItem && (
                    <button onClick={() => downloadSingle(convertedItem)} className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1">
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
            <Spinner /><p className="text-sm" style={{ color: 'var(--text-2)' }}>Converting...</p>
          </div>
        )}

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <div className="flex gap-3 flex-wrap">
          <button onClick={convertAll} disabled={loading || files.length === 0} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
            {loading ? <><Spinner /> Converting...</> : <><RefreshCw size={15} /> Convert {files.length > 1 ? 'All' : 'Image'}</>}
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