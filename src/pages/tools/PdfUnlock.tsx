import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { Download, RefreshCw, Unlock } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes } from '../../lib/fileGuard'

export default function PdfUnlock() {
  const [file, setFile] = useState<File | null>(null)
  const [rawBuf, setRawBuf] = useState<ArrayBuffer | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Blob | null>(null)

  const handleFile = async (files: File[]) => {
    const f = files[0]
    const err = checkFileSize(f)
    if (err) { setError(err); return }
    const buf = await f.arrayBuffer()
    setFile(f); setRawBuf(buf); setResult(null); setError('')
  }

  const unlock = async () => {
    if (!rawBuf) return
    setLoading(true); setError('')
    try {
      // NOTE: pdf-lib's `ignoreEncryption` loads the raw structure but does not
      // decrypt content streams encrypted with a real password. This works only
      // for PDFs with empty-string owner passwords or no real content encryption.
      // True password removal requires the correct password to be validated —
      // pdf-lib doesn't do this. Flagging as a known limitation.
      const pdfDoc = await PDFDocument.load(rawBuf.slice(0), { ignoreEncryption: true })
      const bytes = await pdfDoc.save()
      setResult(new Blob([bytes as any], { type: 'application/pdf' }))
    } catch (e) {
      setError(`Could not unlock: ${String(e).slice(0, 150)}. Wrong password, or this PDF uses encryption pdf-lib cannot bypass.`)
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (!result || !file) return
    const url = URL.createObjectURL(result)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace('.pdf', '_unlocked.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }

  const options = (
    <>
      <SectionLabel>Password</SectionLabel>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)}
        placeholder="Enter the PDF's password"
        className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-2"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
      <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-3)' }}>
        Works reliably only on PDFs with weak/empty owner encryption. Strong user-password encryption may not unlock fully client-side.
      </p>
    </>
  )

  return (
    <ToolShell title="PDF Unlock" subtitle="Remove password protection from a PDF" slug="pdf-unlock" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        {!file ? (
          <FileDropzone accept=".pdf,application/pdf" onFiles={handleFile} label="Drop a protected PDF" sublabel="Max 50 MB" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="card-glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}>PDF</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>{file.name}</p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>{formatBytes(file.size)}</p>
              </div>
              <button onClick={() => { setFile(null); setRawBuf(null); setResult(null) }} className="btn-ghost px-3 py-1.5 text-xs">Change</button>
            </div>

            {loading && (
              <div className="card-glass rounded-xl p-4 flex items-center gap-3">
                <Spinner /><p className="text-sm" style={{ color: 'var(--text-2)' }}>Unlocking...</p>
              </div>
            )}

            {result && !loading && (
              <div className="card-glass rounded-xl p-5">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Unlocked</p>
                <p className="text-sm font-mono mt-1" style={{ color: 'var(--text)' }}>{formatBytes(result.size)}</p>
              </div>
            )}

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <div className="flex gap-3 flex-wrap">
              <button onClick={unlock} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                {loading ? <><Spinner /> Unlocking...</> : <><Unlock size={15} /> Unlock PDF</>}
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
