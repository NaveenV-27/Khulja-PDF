import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { ImageDown } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel, OptionRow } from '../../components/ui/index'
import { checkFileSize, formatBytes, isPdfPasswordError } from '../../lib/fileGuard'

type Format = 'png' | 'jpeg' | 'webp'
type Scale = '1' | '1.5' | '2' | '3'

const FORMAT_MIME: Record<Format, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export default function SplitPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [rawBytes, setRawBytes] = useState<Uint8Array | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [format, setFormat] = useState<Format>('png')
  const [scale, setScale] = useState<Scale>('2')
  const [quality, setQuality] = useState(92)
  const [previews, setPreviews] = useState<string[]>([])

  const handleFile = async (files: File[]) => {
    const f = files[0]
    const err = checkFileSize(f)
    if (err) { setError(err); return }
    setError(''); setDone(''); setPreviews([])
    setLoading(true)
    try {
      const buf = await f.arrayBuffer()
      const bytes = new Uint8Array(buf)
      const doc = await PDFDocument.load(bytes)
      const count = doc.getPageCount()
      setFile(f); setRawBytes(bytes); setPageCount(count)
      setSelectedPages(new Set(Array.from({ length: count }, (_, i) => i + 1)))
    } catch (e) {
      setError(isPdfPasswordError(e) ? 'PDF is password-protected.' : 'Could not read PDF.')
    } finally { setLoading(false) }
  }

  const convert = async () => {
    if (!rawBytes) return
    const pages = [...selectedPages].sort((a, b) => a - b)
    if (pages.length === 0) { setError('Select at least one page.'); return }

    setLoading(true); setError(''); setDone(''); setProgress(0); setPreviews([])
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url
      ).href

      const pdfDoc = await pdfjsLib.getDocument({ data: rawBytes.slice(0) }).promise
      const baseName = file?.name.replace('.pdf', '') ?? 'page'
      const newPreviews: string[] = []

      for (let i = 0; i < pages.length; i++) {
        const pg = pages[i]
        const page = await pdfDoc.getPage(pg)
        const viewport = page.getViewport({ scale: parseFloat(scale) })

        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')!

        await (page.render as any)({ canvasContext: ctx, viewport }).promise

        const mime = FORMAT_MIME[format]
        const q = format === 'png' ? undefined : quality / 100
        const dataUrl = canvas.toDataURL(mime, q)

        // Download
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${baseName}_page_${String(pg).padStart(3, '0')}.${format}`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)

        // Keep preview (max 6)
        if (newPreviews.length < 6) newPreviews.push(dataUrl)
        setPreviews([...newPreviews])
        setProgress(Math.round(((i + 1) / pages.length) * 100))
        await new Promise(r => setTimeout(r, 100))
      }

      setDone(`✓ Converted ${pages.length} page${pages.length > 1 ? 's' : ''} to ${format.toUpperCase()}. Check Downloads.`)
    } catch (e) {
      setError(`Conversion failed: ${String(e).slice(0, 120)}`)
    } finally { setLoading(false); setProgress(0) }
  }

  const options = (
    <>
      <SectionLabel>Output Format</SectionLabel>
      <div className="flex gap-2 mb-4">
        {(['png', 'jpeg', 'webp'] as Format[]).map(f => (
          <button key={f} onClick={() => setFormat(f)}
            className="flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all"
            style={{
              fontFamily: 'Dosis, sans-serif',
              background: format === f ? 'var(--accent)' : 'var(--bg-card)',
              color: format === f ? '#fff' : 'var(--text-3)',
              border: `1px solid ${format === f ? 'var(--accent)' : 'var(--border)'}`,
            }}>
            {f}
          </button>
        ))}
      </div>

      <SectionLabel>Resolution</SectionLabel>
      {(['1', '1.5', '2', '3'] as Scale[]).map(s => (
        <button key={s} onClick={() => setScale(s)}
          className="w-full text-left px-3 py-2.5 rounded-xl mb-2 text-xs transition-all"
          style={{
            fontFamily: 'Dosis, sans-serif', fontWeight: 600,
            background: scale === s ? 'var(--accent-dim)' : 'var(--bg-card)',
            color: scale === s ? 'var(--accent)' : 'var(--text-2)',
            border: scale === s ? '1.5px solid var(--accent)' : '1px solid var(--border)',
          }}>
          {s}× {s === '1' ? '— Screen (72 dpi)' : s === '1.5' ? '— Good (108 dpi)' : s === '2' ? '— High (144 dpi) ★' : '— Print (216 dpi)'}
        </button>
      ))}

      {format !== 'png' && (
        <OptionRow label={`Quality: ${quality}%`}>
          <input type="range" min={50} max={100} value={quality}
            onChange={e => setQuality(+e.target.value)}
            className="w-full" style={{ accentColor: 'var(--accent)' }} />
        </OptionRow>
      )}

      <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-3)' }}>
        PNG = lossless. JPEG/WEBP = smaller file. 2× recommended for sharp text.
      </p>
    </>
  )

  return (
    <ToolShell title="PDF to Images" subtitle="Convert PDF pages to PNG, JPEG or WEBP — one image per page" slug="split" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        {!file ? (
          <>
            <FileDropzone accept=".pdf,application/pdf" onFiles={handleFile} label="Drop a PDF to convert to images" sublabel="Max 50 MB" />
            {loading && <div className="flex items-center gap-3"><Spinner /><span className="text-sm" style={{ color: 'var(--text-2)' }}>Reading PDF...</span></div>}
          </>
        ) : (
          <div className="flex flex-col gap-4">
            {/* File card */}
            <div className="card-glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(249,115,22,0.12)', color: '#F97316', fontFamily: 'Dosis, sans-serif' }}>
                PDF
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>{file.name}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-3)' }}>{formatBytes(file.size)} · {pageCount} page{pageCount !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => { setFile(null); setRawBytes(null); setPageCount(0); setDone(''); setPreviews([]) }}
                className="btn-ghost px-3 py-1.5 text-xs">Change</button>
            </div>

            {/* Page selector */}
            <div className="card-glass rounded-xl p-4">
              <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>
                Select pages to convert —{' '}
                <strong style={{ color: 'var(--accent)' }}>{selectedPages.size} of {pageCount} selected</strong>
                {selectedPages.size < pageCount && (
                  <button onClick={() => setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)))}
                    className="ml-2 underline" style={{ color: 'var(--text-3)' }}>Select all</button>
                )}
                {selectedPages.size > 0 && (
                  <button onClick={() => setSelectedPages(new Set())}
                    className="ml-2 underline" style={{ color: 'var(--text-3)' }}>Clear</button>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: Math.min(pageCount, 100) }, (_, i) => {
                  const pg = i + 1
                  const sel = selectedPages.has(pg)
                  return (
                    <button key={pg}
                      onClick={() => setSelectedPages(prev => { const n = new Set(prev); sel ? n.delete(pg) : n.add(pg); return n })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{
                        background: sel ? 'var(--accent)' : 'var(--bg-2)',
                        border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                        color: sel ? '#fff' : 'var(--text-3)',
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                      }}>
                      {pg}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Progress */}
            {loading && (
              <div className="card-glass rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Spinner />
                  <span className="text-sm" style={{ color: 'var(--text-2)' }}>Converting... {progress}%</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              </div>
            )}

            {/* Image previews */}
            {previews.length > 0 && !loading && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>
                  Preview (first {previews.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((src, i) => (
                    <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: '#fff', aspectRatio: '3/4' }}>
                      <img src={src} alt={`Page ${i + 1}`} className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
            {done && <Alert type="success" message={done} />}

            <button onClick={convert} disabled={loading || selectedPages.size === 0}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm self-start">
              {loading ? <><Spinner /> Converting...</> : <><ImageDown size={15} /> Convert to {format.toUpperCase()}</>}
            </button>
          </div>
        )}
      </div>
    </ToolShell>
  )
}