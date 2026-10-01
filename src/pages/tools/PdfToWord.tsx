import { useState, useRef } from 'react'
import { FileText, Upload, Download, Loader2 } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Document, Packer, Paragraph, TextRun } from 'docx'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export default function PdfToWord() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setStatus('idle')
    setDocxBlob(null)
    setErrorMsg('')
    setPageCount(0)
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
    setDocxBlob(null)
    setErrorMsg('')
  }

  const convert = async () => {
    if (!file) return
    setStatus('processing')
    setErrorMsg('')
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setPageCount(pdf.numPages)

      const paragraphs: Paragraph[] = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()

        // Group text items into lines based on their y-position
        const lines: Record<number, string[]> = {}
        textContent.items.forEach((item: any) => {
          const y = Math.round(item.transform[5])
          if (!lines[y]) lines[y] = []
          lines[y].push(item.str)
        })

        const sortedY = Object.keys(lines)
          .map(Number)
          .sort((a, b) => b - a)

        sortedY.forEach(y => {
          const lineText = lines[y].join(' ').trim()
          if (lineText.length > 0) {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun(lineText)],
              })
            )
          }
        })

        if (i !== pdf.numPages) {
          paragraphs.push(new Paragraph({ children: [new TextRun('')] })) // page break spacer
        }
      }

      if (paragraphs.length === 0) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun('No selectable text found in this PDF (it may be scanned/image-based). Try OCR PDF instead.')],
          })
        )
      }

      const doc = new Document({
        sections: [{ properties: {}, children: paragraphs }],
      })

      const blob = await Packer.toBlob(doc)
      setDocxBlob(blob)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to convert this PDF. It may be corrupted or password-protected.')
      setStatus('error')
    }
  }

  const download = () => {
    if (!docxBlob || !file) return
    const url = URL.createObjectURL(docxBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace(/\.pdf$/i, '') + '.docx'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-5 md:px-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10 animate-fade-up">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(6,182,212,0.1)' }}
          >
            <FileText size={24} style={{ color: '#06B6D4' }} />
          </div>
          <h1
            className="text-3xl md:text-4xl font-800 tracking-tight"
            style={{ fontFamily: 'Dosis, sans-serif', fontWeight: 800, color: 'var(--text)' }}
          >
            PDF to Word
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-2)' }}>
            Convert your PDF into an editable .docx file — 100% in your browser, nothing uploaded.
          </p>
        </div>

        <div className="card-glass rounded-2xl p-6 animate-fade-up-delay">
          {!file && (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                handleFile(e.dataTransfer.files?.[0] ?? null)
              }}
              className="flex flex-col items-center justify-center gap-3 rounded-xl py-14 cursor-pointer transition-all"
              style={{ border: '2px dashed var(--border)' }}
            >
              <Upload size={28} style={{ color: 'var(--text-3)' }} />
              <p className="text-sm" style={{ color: 'var(--text-2)', fontFamily: 'Dosis, sans-serif' }}>
                Click or drag a PDF file here
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={e => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {file && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={18} style={{ color: '#06B6D4' }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{file.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={reset} className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
                  Remove
                </button>
              </div>

              {status === 'idle' && (
                <button
                  onClick={convert}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: '#06B6D4', color: '#0A0F1C', fontFamily: 'Dosis, sans-serif' }}
                >
                  Convert to Word
                </button>
              )}

              {status === 'processing' && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm" style={{ color: 'var(--text-2)' }}>
                  <Loader2 size={16} className="animate-spin" />
                  Extracting text and building document...
                </div>
              )}

              {status === 'done' && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
                    Converted {pageCount} page{pageCount !== 1 ? 's' : ''} successfully.
                  </p>
                  <button
                    onClick={download}
                    className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                    style={{ background: '#10B981', color: '#0A0F1C', fontFamily: 'Dosis, sans-serif' }}
                  >
                    <Download size={16} />
                    Download .docx
                  </button>
                </div>
              )}

              {status === 'error' && (
                <p className="text-xs text-center" style={{ color: '#EF4444' }}>{errorMsg}</p>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-center mt-6" style={{ color: 'var(--text-3)' }}>
          Works best on text-based PDFs. Scanned/image PDFs need OCR PDF instead.
        </p>
      </div>
    </main>
  )
}
