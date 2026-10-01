import { useState, useRef } from 'react'
import { EyeOff, Upload, Download, Loader2, Trash2 } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PDFDocument, rgb } from 'pdf-lib'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

type Rect = { x: number; y: number; w: number; h: number } // percentages
type PageRects = Record<number, Rect[]>

export default function RedactPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [pageImg, setPageImg] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [rectsByPage, setRectsByPage] = useState<PageRects>({})
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<{ startX: number; startY: number } | null>(null)
  const [draftRect, setDraftRect] = useState<Rect | null>(null)

  const reset = () => {
    setFile(null)
    setPageImg(null)
    setRectsByPage({})
    setStatus('idle')
    setResultBlob(null)
    setErrorMsg('')
  }

  const renderPage = async (f: File, idx: number) => {
    const arrayBuffer = await f.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(idx + 1)
    const viewport = page.getViewport({ scale: 1.4 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    setPageImg(canvas.toDataURL())
  }

  const handleFile = async (f: File | null) => {
    if (!f) return
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Please upload a valid PDF file.')
      setStatus('error')
      return
    }
    setFile(f)
    setStatus('idle')
    setErrorMsg('')
    setPageIndex(0)
    setRectsByPage({})
    const arrayBuffer = await f.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise
    setNumPages(pdf.numPages)
    await renderPage(f, 0)
  }

  const switchPage = async (idx: number) => {
    if (!file) return
    setPageIndex(idx)
    await renderPage(file, idx)
  }

  const pctFromEvent = (e: React.PointerEvent) => {
    const rect = previewRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
  }

  const startDrag = (e: React.PointerEvent) => {
    const p = pctFromEvent(e)
    dragging.current = { startX: p.x, startY: p.y }
    setDraftRect({ x: p.x, y: p.y, w: 0, h: 0 })
  }

  const onDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const p = pctFromEvent(e)
    const { startX, startY } = dragging.current
    setDraftRect({
      x: Math.min(startX, p.x),
      y: Math.min(startY, p.y),
      w: Math.abs(p.x - startX),
      h: Math.abs(p.y - startY),
    })
  }

  const endDrag = () => {
    if (draftRect && draftRect.w > 1 && draftRect.h > 1) {
      setRectsByPage(prev => ({
        ...prev,
        [pageIndex]: [...(prev[pageIndex] || []), draftRect],
      }))
    }
    dragging.current = null
    setDraftRect(null)
  }

  const clearPageRects = () => {
    setRectsByPage(prev => ({ ...prev, [pageIndex]: [] }))
  }

  const applyRedactions = async () => {
    if (!file) return
    setStatus('processing')
    setErrorMsg('')
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pages = pdfDoc.getPages()

      Object.entries(rectsByPage).forEach(([idxStr, rects]) => {
        const idx = Number(idxStr)
        const page = pages[idx]
        if (!page) return
        const { width, height } = page.getSize()
        rects.forEach(r => {
          const x = (r.x / 100) * width
          const yTop = (r.y / 100) * height
          const w = (r.w / 100) * width
          const h = (r.h / 100) * height
          const y = height - yTop - h
          page.drawRectangle({ x, y, width: w, height: h, color: rgb(0, 0, 0) })
        })
      })

      const bytes = await pdfDoc.save()
      const outBuffer = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(outBuffer).set(bytes)
      setResultBlob(new Blob([outBuffer], { type: 'application/pdf' }))
      setStatus('done')
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to apply redactions. Please try again.')
      setStatus('error')
    }
  }

  const download = () => {
    if (!resultBlob || !file) return
    const url = URL.createObjectURL(resultBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace(/\.pdf$/i, '') + '-redacted.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const totalRects = Object.values(rectsByPage).reduce((sum, r) => sum + r.length, 0)
  const currentRects = rectsByPage[pageIndex] || []

  return (
    <main className="min-h-screen pt-28 pb-20 px-5 md:px-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 animate-fade-up">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <EyeOff size={24} style={{ color: '#EF4444' }} />
          </div>
          <h1 className="text-3xl md:text-4xl font-800 tracking-tight" style={{ fontFamily: 'Dosis, sans-serif', fontWeight: 800, color: 'var(--text)' }}>
            Redact PDF
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-2)' }}>
            Draw boxes over sensitive text or regions — permanently blacked out on export.
          </p>
        </div>

        {!file ? (
          <div className="card-glass rounded-2xl p-6 animate-fade-up-delay">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] ?? null) }}
              className="flex flex-col items-center justify-center gap-3 rounded-xl py-14 cursor-pointer"
              style={{ border: '2px dashed var(--border)' }}
            >
              <Upload size={28} style={{ color: 'var(--text-3)' }} />
              <p className="text-sm" style={{ color: 'var(--text-2)', fontFamily: 'Dosis, sans-serif' }}>Click or drag a PDF file here</p>
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => handleFile(e.target.files?.[0] ?? null)} />
            </div>
            {status === 'error' && <p className="text-xs text-center mt-4" style={{ color: '#EF4444' }}>{errorMsg}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-fade-up-delay">
            {numPages > 1 && (
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {Array.from({ length: numPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => switchPage(i)}
                    className="w-8 h-8 rounded-lg text-xs font-medium relative"
                    style={{
                      background: i === pageIndex ? '#EF4444' : 'var(--bg-card)',
                      color: i === pageIndex ? '#fff' : 'var(--text-2)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {i + 1}
                    {(rectsByPage[i]?.length ?? 0) > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444' }} />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="card-glass rounded-2xl p-4">
              <p className="text-xs mb-2 text-center" style={{ color: 'var(--text-3)' }}>Click and drag on the page to mark a region for redaction</p>
              <div
                ref={previewRef}
                onPointerDown={startDrag}
                onPointerMove={onDrag}
                onPointerUp={endDrag}
                onPointerLeave={endDrag}
                className="relative mx-auto rounded-lg overflow-hidden cursor-crosshair touch-none select-none"
                style={{ maxWidth: '100%', border: '1px solid var(--border)' }}
              >
                {pageImg && <img src={pageImg} alt="PDF page" className="w-full block pointer-events-none" draggable={false} />}
                {currentRects.map((r, i) => (
                  <div key={i} className="absolute" style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%`, background: '#000' }} />
                ))}
                {draftRect && (
                  <div className="absolute" style={{ left: `${draftRect.x}%`, top: `${draftRect.y}%`, width: `${draftRect.w}%`, height: `${draftRect.h}%`, background: 'rgba(239,68,68,0.4)', border: '1px dashed #EF4444' }} />
                )}
              </div>
              {currentRects.length > 0 && (
                <button onClick={clearPageRects} className="flex items-center gap-1 text-xs mt-3 mx-auto" style={{ color: 'var(--text-3)' }}>
                  <Trash2 size={12} /> Clear boxes on this page
                </button>
              )}
            </div>

            {status === 'idle' && (
              <button
                onClick={applyRedactions}
                disabled={totalRects === 0}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: '#EF4444', color: '#fff', fontFamily: 'Dosis, sans-serif' }}
              >
                Apply Redactions ({totalRects})
              </button>
            )}

            {status === 'processing' && (
              <div className="flex items-center justify-center gap-2 py-3 text-sm" style={{ color: 'var(--text-2)' }}>
                <Loader2 size={16} className="animate-spin" /> Applying redactions...
              </div>
            )}

            {status === 'done' && (
              <button onClick={download} className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{ background: '#10B981', color: '#0A0F1C', fontFamily: 'Dosis, sans-serif' }}>
                <Download size={16} /> Download Redacted PDF
              </button>
            )}

            {status === 'error' && <p className="text-xs text-center" style={{ color: '#EF4444' }}>{errorMsg}</p>}

            <button onClick={reset} className="text-xs text-center" style={{ color: 'var(--text-3)' }}>Start over</button>
          </div>
        )}

        <p className="text-xs text-center mt-6" style={{ color: 'var(--text-3)' }}>
          Redaction draws a permanent black box on top of the page. For maximum security on highly sensitive documents, also flatten/export as image.
        </p>
      </div>
    </main>
  )
}
