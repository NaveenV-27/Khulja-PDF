import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes, isPdfPasswordError } from '../../lib/fileGuard'

type Format = 'jpg' | 'png'
type Dpi = 72 | 150 | 300

const DPI_SCALE: Record<Dpi, number> = { 72: 1, 150: 2.08, 300: 4.17 }

export default function PdfToImage() {
  const [file, setFile] = useState<File | null>(null)
  const [rawBuf, setRawBuf] = useState<ArrayBuffer | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [zipBlob, setZipBlob] = useState<Blob | null>(null)

  const [format, setFormat] = useState<Format>('jpg')
  const [dpi, setDpi] = useState<Dpi>(150)

  const handleFile = async (files: File[]) => {
    const f = files[0]
    const err = checkFileSize(f)
    if (err) { setError(err); return }
    const buf = await f.arrayBuffer()
    setFile(f); setRawBuf(buf); setZipBlob(null); setError('')

    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url
      ).href
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise
      setPageCount(doc.numPages)
    } catch (e) {
      setError(isPdfPasswordError(e) ? 'This PDF is password-protected.' : 'Could not read this PDF.')
    }
  }

  const convert = async () => {
    if (!rawBuf || !file) return
    setLoading(true); setError(''); setProgress(0)
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url
      ).href
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(rawBuf.slice(0)) }).promise
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const scale = DPI_SCALE[dpi]
      const baseName = file.name.replace('.pdf', '')

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await (page.render as any)({ canvasContext: ctx, viewport }).promise

        const mime = format === 'png' ? 'image/png' : 'image/jpeg'
        const dataUrl = canvas.toDataURL(mime, 0.92)
        const base64 = dataUrl.split(',')[1]
        zip.file(`${baseName}_page${i}.${format}`, base64, { base64: true })
        setProgress(Math.round((i / doc.numPages) * 100))
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      setZipBlob(blob)
    } catch (e) {
      setError(`Conversion failed: ${String(e).slice(0, 120)}`)
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (!zipBlob || !file) return
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file.name.replace('.pdf', '')}_images.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  const options = (
    <>
      <SectionLabel>Format</SectionLabel>
      <div className="flex items-center justify-between mb-4 p-1 rounded-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {(['jpg', 'png'] as Format[]).map(f => (
          <button key={f} onClick={() => setFormat(f)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all"
            style={{ fontFamily: 'Dosis, sans-serif', background: format === f ? 'var(--accent)' : 'transparent', color: format === f ? '#fff' : 'var(--text-3)' }}>
            {f}
          </button>
        ))}
      </div>

      <SectionLabel>Resolution</SectionLabel>
      {([72, 150, 300] as Dpi[]).map(d => (
        <button key={d} onClick={() => setDpi(d)}
          className="w-full text-left px-3 py-3 rounded-xl mb-2 text-xs transition-all"
          style={{
            fontFamily: 'Dosis, sans-serif', fontWeight: 600,
            background: dpi === d ? 'var(--accent-dim)' : 'var(--bg-card)',
            color: dpi === d ? 'var(--accent)' : 'var(--text-2)',
            border: dpi === d ? '1.5px solid var(--accent)' : '1px solid var(--border)',
          }}>
          {d} DPI
          <span className="block font-normal mt-0.5" style={{ color: 'var(--text-3)', fontSize: 10 }}>
            {d === 72 ? 'Screen quality' : d === 150 ? 'Balanced — recommended' : 'Print quality'}
          </span>
        </button>
      ))}
    </>
  )

  return (
    <ToolShell title="PDF to Image" subtitle="Export each PDF page as a JPG or PNG" slug="pdf-to-image" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        {!file ? (
          <FileDropzone accept=".pdf,application/pdf" onFiles={handleFile} label="Drop a PDF to convert" sublabel="Max 50 MB" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="card-glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}>PDF</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>{file.name}</p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>{formatBytes(file.size)} · {pageCount} pages</p>
              </div>
              <button onClick={() => { setFile(null); setRawBuf(null); setZipBlob(null) }} className="btn-ghost px-3 py-1.5 text-xs">Change</button>
            </div>

            {loading && (
              <div className="card-glass rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Spinner /><p className="text-sm" style={{ color: 'var(--text-2)' }}>Converting... {progress}%</p>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {zipBlob && !loading && (
              <div className="card-glass rounded-xl p-5">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Result ready</p>
                <p className="text-sm font-mono mt-1" style={{ color: 'var(--text)' }}>{formatBytes(zipBlob.size)} ZIP · {pageCount} images</p>
              </div>
            )}

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <div className="flex gap-3 flex-wrap">
              <button onClick={convert} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                {loading ? <><Spinner /> Converting...</> : <><RefreshCw size={15} /> Convert to Images</>}
              </button>
              {zipBlob && !loading && (
                <button onClick={download} className="btn-ghost flex items-center gap-2 px-5 py-2.5 text-sm">
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
