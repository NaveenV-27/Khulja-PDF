import { useState, useEffect } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'
import { Download, RefreshCw, RotateCw } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes, isPdfPasswordError } from '../../lib/fileGuard'

interface PageThumb { index: number; rotation: number; dataUrl: string }

export default function RotatePdf() {
  const [file, setFile] = useState<File | null>(null)
  const [rawBuf, setRawBuf] = useState<ArrayBuffer | null>(null)
  const [pages, setPages] = useState<PageThumb[]>([])
  const [loading, setLoading] = useState(false)
  const [thumbsLoading, setThumbsLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Blob | null>(null)

  const handleFile = async (files: File[]) => {
    const f = files[0]
    const err = checkFileSize(f)
    if (err) { setError(err); return }
    const buf = await f.arrayBuffer()
    setFile(f); setRawBuf(buf); setResult(null); setError('')
    await buildThumbs(buf)
  }

  const buildThumbs = async (buf: ArrayBuffer) => {
    setThumbsLoading(true)
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url
      ).href
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise
      const thumbs: PageThumb[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const viewport = page.getViewport({ scale: 0.3 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await (page.render as any)({ canvasContext: ctx, viewport }).promise
        thumbs.push({ index: i - 1, rotation: 0, dataUrl: canvas.toDataURL('image/jpeg', 0.7) })
      }
      setPages(thumbs)
    } catch (e) {
      setError(isPdfPasswordError(e) ? 'This PDF is password-protected.' : 'Could not read this PDF.')
    } finally {
      setThumbsLoading(false)
    }
  }

  const rotatePage = (index: number) => {
    setPages(prev => prev.map(p => p.index === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
  }

  const rotateAll = () => {
    setPages(prev => prev.map(p => ({ ...p, rotation: (p.rotation + 90) % 360 })))
  }

  const apply = async () => {
    if (!rawBuf) return
    setLoading(true); setError('')
    try {
      const pdfDoc = await PDFDocument.load(rawBuf.slice(0))
      const docPages = pdfDoc.getPages()
      pages.forEach(p => {
        if (p.rotation !== 0) {
          const current = docPages[p.index].getRotation().angle
          docPages[p.index].setRotation(degrees(current + p.rotation))
        }
      })
      const bytes = await pdfDoc.save()
      setResult(new Blob([bytes as any], { type: 'application/pdf' }))
    } catch (e) {
      setError(`Rotation failed: ${String(e).slice(0, 120)}`)
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (!result || !file) return
    const url = URL.createObjectURL(result)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace('.pdf', '_rotated.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }

  const options = (
    <>
      <SectionLabel>Rotate</SectionLabel>
      <button onClick={rotateAll} disabled={pages.length === 0}
        className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm mb-2">
        <RotateCw size={15} /> Rotate All 90°
      </button>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-3)' }}>
        Click any page thumbnail to rotate it individually.
      </p>
    </>
  )

  return (
    <ToolShell title="Rotate PDF Pages" subtitle="Rotate individual or all pages by 90°" slug="rotate-pdf" options={options}>
      <div className="flex flex-col gap-4 max-w-3xl">
        {!file ? (
          <FileDropzone accept=".pdf,application/pdf" onFiles={handleFile} label="Drop a PDF to rotate" sublabel="Max 50 MB" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="card-glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}>PDF</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>{file.name}</p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>{formatBytes(file.size)} · {pages.length} pages</p>
              </div>
              <button onClick={() => { setFile(null); setRawBuf(null); setPages([]); setResult(null) }} className="btn-ghost px-3 py-1.5 text-xs">Change</button>
            </div>

            {thumbsLoading && (
              <div className="card-glass rounded-xl p-4 flex items-center gap-3">
                <Spinner /><p className="text-sm" style={{ color: 'var(--text-2)' }}>Loading pages...</p>
              </div>
            )}

            {pages.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {pages.map(p => (
                  <button key={p.index} onClick={() => rotatePage(p.index)}
                    className="rounded-lg overflow-hidden relative group"
                    style={{ border: '1px solid var(--border)' }}>
                    <img src={p.dataUrl} alt={`page ${p.index + 1}`}
                      style={{ width: '100%', display: 'block', transform: `rotate(${p.rotation}deg)`, transition: 'transform 0.2s' }} />
                    <span className="absolute bottom-1 right-1 text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>{p.index + 1}</span>
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="card-glass rounded-xl p-4 flex items-center gap-3">
                <Spinner /><p className="text-sm" style={{ color: 'var(--text-2)' }}>Applying rotation...</p>
              </div>
            )}

            {result && !loading && (
              <div className="card-glass rounded-xl p-5">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Result ready</p>
                <p className="text-sm font-mono mt-1" style={{ color: 'var(--text)' }}>{formatBytes(result.size)}</p>
              </div>
            )}

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <div className="flex gap-3 flex-wrap">
              <button onClick={apply} disabled={loading || pages.length === 0} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                {loading ? <><Spinner /> Applying...</> : <><RefreshCw size={15} /> Apply Rotation</>}
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
