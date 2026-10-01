import { useState, useRef } from 'react'
import { ScanText, Upload, Download, Loader2 } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { createWorker } from 'tesseract.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export default function OcrPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState({ page: 0, total: 0 })
  const [extractedText, setExtractedText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setStatus('idle')
    setExtractedText('')
    setErrorMsg('')
    setProgress({ page: 0, total: 0 })
  }

  const handleFile = (f: File | null) => {
    if (!f) return
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Please upload a valid PDF file.')
      setStatus('error')
      return
    }
    setFile(f)
    setStatus('idle')
    setExtractedText('')
    setErrorMsg('')
  }

  const runOcr = async () => {
    if (!file) return
    setStatus('processing')
    setErrorMsg('')
    setExtractedText('')
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setProgress({ page: 0, total: pdf.numPages })

      const worker = await createWorker('eng')
      let fullText = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport, canvas }).promise

        const { data } = await worker.recognize(canvas)
        fullText += `--- Page ${i} ---\n${data.text.trim()}\n\n`
        setProgress({ page: i, total: pdf.numPages })
      }

      await worker.terminate()
      setExtractedText(fullText.trim())
      setStatus('done')
    } catch (err) {
      console.error(err)
      setErrorMsg('OCR failed. Try a smaller PDF or fewer pages.')
      setStatus('error')
    }
  }

  const download = () => {
    if (!extractedText || !file) return
    const blob = new Blob([extractedText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace(/\.pdf$/i, '') + '-ocr.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-5 md:px-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10 animate-fade-up">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(139,92,246,0.1)' }}>
            <ScanText size={24} style={{ color: '#8B5CF6' }} />
          </div>
          <h1 className="text-3xl md:text-4xl font-800 tracking-tight" style={{ fontFamily: 'Dosis, sans-serif', fontWeight: 800, color: 'var(--text)' }}>
            OCR PDF
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-2)' }}>
            Extract text from scanned or image-based PDFs, right in your browser.
          </p>
        </div>

        <div className="card-glass rounded-2xl p-6 animate-fade-up-delay">
          {!file && (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] ?? null) }}
              className="flex flex-col items-center justify-center gap-3 rounded-xl py-14 cursor-pointer"
              style={{ border: '2px dashed var(--border)' }}
            >
              <Upload size={28} style={{ color: 'var(--text-3)' }} />
              <p className="text-sm" style={{ color: 'var(--text-2)', fontFamily: 'Dosis, sans-serif' }}>Click or drag a PDF file here</p>
              <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => handleFile(e.target.files?.[0] ?? null)} />
            </div>
          )}

          {file && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <ScanText size={18} style={{ color: '#8B5CF6' }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{file.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={reset} className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Remove</button>
              </div>

              {status === 'idle' && (
                <button onClick={runOcr} className="w-full py-3 rounded-xl text-sm font-semibold transition-all" style={{ background: '#8B5CF6', color: '#fff', fontFamily: 'Dosis, sans-serif' }}>
                  Run OCR
                </button>
              )}

              {status === 'processing' && (
                <div className="flex flex-col items-center gap-2 py-3">
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                    <Loader2 size={16} className="animate-spin" />
                    Reading page {progress.page} of {progress.total}...
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-card)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress.total ? (progress.page / progress.total) * 100 : 0}%`, background: '#8B5CF6' }}
                    />
                  </div>
                </div>
              )}

              {status === 'done' && (
                <div className="flex flex-col gap-3">
                  <textarea
                    readOnly
                    value={extractedText}
                    className="w-full h-48 rounded-lg p-3 text-xs resize-none outline-none"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'monospace' }}
                  />
                  <button onClick={download} className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{ background: '#10B981', color: '#0A0F1C', fontFamily: 'Dosis, sans-serif' }}>
                    <Download size={16} /> Download .txt
                  </button>
                </div>
              )}

              {status === 'error' && <p className="text-xs text-center" style={{ color: '#EF4444' }}>{errorMsg}</p>}
            </div>
          )}
        </div>

        <p className="text-xs text-center mt-6" style={{ color: 'var(--text-3)' }}>
          Runs fully offline using Tesseract.js. Larger PDFs take longer — everything stays in your browser.
        </p>
      </div>
    </main>
  )
}
