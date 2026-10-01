import { useState, useRef } from 'react'
import { Sheet, Upload, Download, Loader2 } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import * as XLSX from 'xlsx'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export default function PdfToExcel() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [xlsxBlob, setXlsxBlob] = useState<Blob | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setStatus('idle')
    setXlsxBlob(null)
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
    setXlsxBlob(null)
    setErrorMsg('')
  }

  // Groups text items into rows (by y) and columns (by x-gaps) to approximate a table
  const extractRows = (items: any[]): string[][] => {
    const rowMap: Record<number, any[]> = {}
    items.forEach(item => {
      const y = Math.round(item.transform[5])
      if (!rowMap[y]) rowMap[y] = []
      rowMap[y].push(item)
    })

    const sortedY = Object.keys(rowMap)
      .map(Number)
      .sort((a, b) => b - a)

    return sortedY.map(y => {
      const rowItems = rowMap[y].sort((a, b) => a.transform[4] - b.transform[4])
      const cells: string[] = []
      let lastX: number | null = null
      let current = ''

      rowItems.forEach(item => {
        const x = item.transform[4]
        if (lastX !== null && x - lastX > 15) {
          cells.push(current.trim())
          current = ''
        }
        current += item.str
        lastX = x + (item.width || 0)
      })
      if (current.trim()) cells.push(current.trim())
      return cells
    })
  }

  const convert = async () => {
    if (!file) return
    setStatus('processing')
    setErrorMsg('')
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setPageCount(pdf.numPages)

      const workbook = XLSX.utils.book_new()

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const rows = extractRows(textContent.items)
        const sheet = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [['(no text found on this page)']])
        XLSX.utils.book_append_sheet(workbook, sheet, `Page ${i}`)
      }

      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      setXlsxBlob(blob)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to convert this PDF. It may be corrupted or password-protected.')
      setStatus('error')
    }
  }

  const download = () => {
    if (!xlsxBlob || !file) return
    const url = URL.createObjectURL(xlsxBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace(/\.pdf$/i, '') + '.xlsx'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-5 md:px-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10 animate-fade-up">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <Sheet size={24} style={{ color: '#10B981' }} />
          </div>
          <h1 className="text-3xl md:text-4xl font-800 tracking-tight" style={{ fontFamily: 'Dosis, sans-serif', fontWeight: 800, color: 'var(--text)' }}>
            PDF to Excel
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-2)' }}>
            Extract tables from your PDF into a downloadable .xlsx — one sheet per page.
          </p>
        </div>

        <div className="card-glass rounded-2xl p-6 animate-fade-up-delay">
          {!file && (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] ?? null) }}
              className="flex flex-col items-center justify-center gap-3 rounded-xl py-14 cursor-pointer transition-all"
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
                  <Sheet size={18} style={{ color: '#10B981' }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{file.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={reset} className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Remove</button>
              </div>

              {status === 'idle' && (
                <button onClick={convert} className="w-full py-3 rounded-xl text-sm font-semibold transition-all" style={{ background: '#10B981', color: '#0A0F1C', fontFamily: 'Dosis, sans-serif' }}>
                  Convert to Excel
                </button>
              )}

              {status === 'processing' && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm" style={{ color: 'var(--text-2)' }}>
                  <Loader2 size={16} className="animate-spin" />
                  Extracting tables...
                </div>
              )}

              {status === 'done' && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>Converted {pageCount} sheet{pageCount !== 1 ? 's' : ''} successfully.</p>
                  <button onClick={download} className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all" style={{ background: '#10B981', color: '#0A0F1C', fontFamily: 'Dosis, sans-serif' }}>
                    <Download size={16} />
                    Download .xlsx
                  </button>
                </div>
              )}

              {status === 'error' && <p className="text-xs text-center" style={{ color: '#EF4444' }}>{errorMsg}</p>}
            </div>
          )}
        </div>

        <p className="text-xs text-center mt-6" style={{ color: 'var(--text-3)' }}>
          Works best on PDFs with clear tabular/grid layouts. Free-flowing text may not split into columns cleanly.
        </p>
      </div>
    </main>
  )
}
