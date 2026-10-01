import { useState, useRef, useEffect } from 'react'
import { PenTool, Upload, Download, Loader2, Type, Image as ImageIcon, Pencil } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PDFDocument } from 'pdf-lib'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

type SigMode = 'draw' | 'type' | 'upload'

export default function SignPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [pageImg, setPageImg] = useState<string | null>(null)
  const [pageDims, setPageDims] = useState({ width: 0, height: 0 })
  const [numPages, setNumPages] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)

  const [mode, setMode] = useState<SigMode>('draw')
  const [typedText, setTypedText] = useState('')
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null)
  const [sigPos, setSigPos] = useState({ x: 30, y: 70 }) // percentage of page
  const [sigWidth, setSigWidth] = useState(160)

  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [signedBlob, setSignedBlob] = useState<Blob | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadSigRef = useRef<HTMLInputElement>(null)
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)

  const reset = () => {
    setFile(null)
    setPageImg(null)
    setSigDataUrl(null)
    setStatus('idle')
    setSignedBlob(null)
    setErrorMsg('')
  }

  const loadPdf = async (f: File) => {
    const arrayBuffer = await f.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise
    setNumPages(pdf.numPages)
    await renderPage(f, 0)
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
    setPageDims({ width: viewport.width, height: viewport.height })
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
    await loadPdf(f)
  }

  // --- Signature drawing pad ---
  const startDraw = (e: React.PointerEvent) => {
    isDrawing.current = true
    draw(e)
  }
  const draw = (e: React.PointerEvent) => {
    if (!isDrawing.current) return
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(e.clientX - rect.left, e.clientY - rect.top, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }
  const endDraw = () => {
    isDrawing.current = false
    const canvas = drawCanvasRef.current
    if (canvas) setSigDataUrl(canvas.toDataURL())
  }
  const clearDraw = () => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSigDataUrl(null)
  }

  // --- Type mode: render text to canvas as signature ---
  useEffect(() => {
    if (mode !== 'type' || !typedText) return
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 120
    const ctx = canvas.getContext('2d')!
    ctx.font = 'italic 48px "Segoe Script", cursive'
    ctx.fillStyle = '#000'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedText, 10, 60)
    setSigDataUrl(canvas.toDataURL())
  }, [typedText, mode])

  const handleSigUpload = (f: File | null) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setSigDataUrl(reader.result as string)
    reader.readAsDataURL(f)
  }

  // --- Place signature by clicking preview ---
  const placeSig = (e: React.MouseEvent) => {
    if (!previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    setSigPos({ x: Math.max(0, Math.min(90, xPct)), y: Math.max(0, Math.min(95, yPct)) })
  }

  const applySignature = async () => {
    if (!file || !sigDataUrl) return
    setStatus('processing')
    setErrorMsg('')
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pages = pdfDoc.getPages()
      const targetPage = pages[pageIndex]
      const { width: pw, height: ph } = targetPage.getSize()

      const pngBytes = await (await fetch(sigDataUrl)).arrayBuffer()
      const pngImage = await pdfDoc.embedPng(pngBytes)
      const scale = sigWidth / pngImage.width
      const drawW = sigWidth
      const drawH = pngImage.height * scale

      const x = (sigPos.x / 100) * pw
      const yFromTop = (sigPos.y / 100) * ph
      const y = ph - yFromTop - drawH

      targetPage.drawImage(pngImage, { x, y, width: drawW, height: drawH })

      const bytes = await pdfDoc.save()
      const outBuffer = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(outBuffer).set(bytes)
      setSignedBlob(new Blob([outBuffer], { type: 'application/pdf' }))
      setStatus('done')
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to embed signature. Please try again.')
      setStatus('error')
    }
  }

  const download = () => {
    if (!signedBlob || !file) return
    const url = URL.createObjectURL(signedBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace(/\.pdf$/i, '') + '-signed.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-5 md:px-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 animate-fade-up">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <PenTool size={24} style={{ color: '#F59E0B' }} />
          </div>
          <h1 className="text-3xl md:text-4xl font-800 tracking-tight" style={{ fontFamily: 'Dosis, sans-serif', fontWeight: 800, color: 'var(--text)' }}>
            Sign PDF
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-2)' }}>
            Draw, type, or upload a signature and place it anywhere on your PDF.
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
            {/* Page nav */}
            {numPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                {Array.from({ length: numPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setPageIndex(i); file && renderPage(file, i) }}
                    className="w-8 h-8 rounded-lg text-xs font-medium"
                    style={{
                      background: i === pageIndex ? '#F59E0B' : 'var(--bg-card)',
                      color: i === pageIndex ? '#0A0F1C' : 'var(--text-2)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* PDF preview with draggable placement */}
            <div className="card-glass rounded-2xl p-4">
              <p className="text-xs mb-2 text-center" style={{ color: 'var(--text-3)' }}>Click anywhere on the page to place your signature</p>
              <div
                ref={previewRef}
                onClick={placeSig}
                className="relative mx-auto rounded-lg overflow-hidden cursor-crosshair"
                style={{ maxWidth: '100%', border: '1px solid var(--border)' }}
              >
                {pageImg && <img src={pageImg} alt="PDF page" className="w-full block" />}
                {sigDataUrl && (
                  <img
                    src={sigDataUrl}
                    alt="signature"
                    className="absolute pointer-events-none"
                    style={{ left: `${sigPos.x}%`, top: `${sigPos.y}%`, width: `${(sigWidth / pageDims.width) * 100}%` }}
                  />
                )}
              </div>
            </div>

            {/* Signature builder */}
            <div className="card-glass rounded-2xl p-5">
              <div className="flex gap-2 mb-4">
                {[
                  { key: 'draw', label: 'Draw', icon: Pencil },
                  { key: 'type', label: 'Type', icon: Type },
                  { key: 'upload', label: 'Upload', icon: ImageIcon },
                ].map(m => (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key as SigMode)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium"
                    style={{
                      background: mode === m.key ? '#F59E0B' : 'var(--bg-card)',
                      color: mode === m.key ? '#0A0F1C' : 'var(--text-2)',
                      border: '1px solid var(--border)',
                      fontFamily: 'Dosis, sans-serif',
                    }}
                  >
                    <m.icon size={13} /> {m.label}
                  </button>
                ))}
              </div>

              {mode === 'draw' && (
                <div className="flex flex-col gap-2">
                  <canvas
                    ref={drawCanvasRef}
                    width={400}
                    height={120}
                    onPointerDown={startDraw}
                    onPointerMove={draw}
                    onPointerUp={endDraw}
                    onPointerLeave={endDraw}
                    className="w-full rounded-lg touch-none"
                    style={{ background: '#fff', maxWidth: 400 }}
                  />
                  <button onClick={clearDraw} className="text-xs self-start" style={{ color: 'var(--text-3)' }}>Clear</button>
                </div>
              )}

              {mode === 'type' && (
                <input
                  type="text"
                  value={typedText}
                  onChange={e => setTypedText(e.target.value)}
                  placeholder="Type your name"
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}
                />
              )}

              {mode === 'upload' && (
                <div>
                  <button
                    onClick={() => uploadSigRef.current?.click()}
                    className="w-full py-3 rounded-lg text-sm font-medium"
                    style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', color: 'var(--text-2)' }}
                  >
                    Upload signature image (PNG)
                  </button>
                  <input ref={uploadSigRef} type="file" accept="image/png" className="hidden" onChange={e => handleSigUpload(e.target.files?.[0] ?? null)} />
                </div>
              )}

              <div className="mt-4">
                <label className="text-xs" style={{ color: 'var(--text-3)' }}>Signature size</label>
                <input
                  type="range"
                  min={60}
                  max={320}
                  value={sigWidth}
                  onChange={e => setSigWidth(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {status === 'idle' && (
              <button
                onClick={applySignature}
                disabled={!sigDataUrl}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: '#F59E0B', color: '#0A0F1C', fontFamily: 'Dosis, sans-serif' }}
              >
                Apply Signature
              </button>
            )}

            {status === 'processing' && (
              <div className="flex items-center justify-center gap-2 py-3 text-sm" style={{ color: 'var(--text-2)' }}>
                <Loader2 size={16} className="animate-spin" /> Embedding signature...
              </div>
            )}

            {status === 'done' && (
              <button onClick={download} className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{ background: '#10B981', color: '#0A0F1C', fontFamily: 'Dosis, sans-serif' }}>
                <Download size={16} /> Download Signed PDF
              </button>
            )}

            {status === 'error' && <p className="text-xs text-center" style={{ color: '#EF4444' }}>{errorMsg}</p>}

            <button onClick={reset} className="text-xs text-center" style={{ color: 'var(--text-3)' }}>Start over</button>
          </div>
        )}
      </div>
    </main>
  )
}
