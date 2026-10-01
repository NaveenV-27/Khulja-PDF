import { useMemo, useState } from 'react'
import { FileText, Download, Trash2, Cloud } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes } from '../../lib/fileGuard'

export default function DocxToPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')

  const apiSecret = import.meta.env.VITE_CONVERTAPI_SECRET as string

  const accept = useMemo(
    () => '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    []
  )

  const onDrop = (files: File[]) => {
    const f = files?.[0]
    if (!f) return

    const err = checkFileSize(f)
    if (err) {
      setError(err)
      return
    }

    const isDocx =
      f.name.toLowerCase().endsWith('.docx') ||
      f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    if (!isDocx) {
      setError('Please upload a valid .docx file.')
      return
    }

    setFile(f)
    setError('')
    setDone('')
    setPdfUrl('')
  }

  const clearFile = () => {
    setFile(null)
    setError('')
    setDone('')
    setPdfUrl('')
  }

  const convert = async () => {
    if (!file) return

    if (!apiSecret) {
      setError('Missing VITE_CONVERTAPI_SECRET in .env')
      return
    }

    setLoading(true)
    setError('')
    setDone('')
    setPdfUrl('')

    try {
      const fd = new FormData()
      fd.append('File', file)
      fd.append('StoreFile', 'true')

      const res = await fetch(`https://v2.convertapi.com/convert/docx/to/pdf?Secret=${apiSecret}`, {
        method: 'POST',
        body: fd,
      })

      const raw = await res.text()
      let data: any = null
      try {
        data = JSON.parse(raw)
      } catch {
        throw new Error(raw || 'Conversion failed')
      }

      if (!res.ok) {
        throw new Error(data?.Message || data?.message || 'Conversion failed')
      }

      const url = data?.Files?.[0]?.Url
      if (!url) throw new Error('PDF URL not found in ConvertAPI response')

      setPdfUrl(url)
      setDone('Conversion complete. Click Download PDF.')
    } catch (e: any) {
      setError(e?.message || 'Conversion failed.')
    } finally {
      setLoading(false)
    }
  }

  const downloadPdf = () => {
    if (!pdfUrl) return
    window.open(pdfUrl, '_blank', 'noopener,noreferrer')
  }

  const options = (
    <div className="flex flex-col gap-4">
      <SectionLabel>How it works</SectionLabel>
      <div
        className="rounded-xl p-3 text-xs leading-relaxed"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: 'var(--text-2)',
          fontFamily: 'Dosis, sans-serif',
        }}
      >
        Upload DOCX → ConvertAPI converts → Download final PDF.
      </div>
    </div>
  )

  return (
    <ToolShell
      title="DOCX to PDF"
      subtitle="Accurate conversion using ConvertAPI"
      slug="docx-to-pdf"
      options={options}
    >
      <div className="flex flex-col gap-4">
        <FileDropzone
          onFiles={onDrop}
          accept={accept}
          label="Drop your .docx file here"
        />

        {file && (
          <div
            className="rounded-2xl p-3 flex items-center gap-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--accent)' }}
            >
              <FileText size={18} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>
                {file.name}
              </p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>
                {formatBytes(file.size)}
              </p>
            </div>

            <button
              onClick={clearFile}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-3)', background: 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#FBBF24')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
              aria-label="Remove file"
              title="Remove file"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        <button
          onClick={convert}
          disabled={!file || loading}
          className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Spinner size="sm" /> : <Cloud size={14} />}
          {loading ? 'Converting...' : 'Convert to PDF'}
        </button>

        <button
          onClick={downloadPdf}
          disabled={!pdfUrl || loading}
          className="btn-secondary flex items-center justify-center gap-2 px-4 py-2.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={14} />
          Download PDF
        </button>

        {!!error && <Alert type="error" message={error} />}
        {!!done && <Alert type="success" message={done} />}
      </div>
    </ToolShell>
  )
}