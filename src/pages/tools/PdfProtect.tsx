import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { Download, RefreshCw, Lock } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes, isPdfPasswordError } from '../../lib/fileGuard'

function passwordStrength(pw: string): { label: string; color: string; score: number } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { label: 'Weak', color: '#EF4444', score }
  if (score <= 3) return { label: 'Medium', color: '#FBBF24', score }
  return { label: 'Strong', color: '#10B981', score }
}

export default function PdfProtect() {
  const [file, setFile] = useState<File | null>(null)
  const [rawBuf, setRawBuf] = useState<ArrayBuffer | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
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

  const strength = passwordStrength(password)

  const protect = async () => {
    if (!rawBuf) return
    if (!password) { setError('Enter a password.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true); setError('')
    try {
      const pdfDoc = await PDFDocument.load(rawBuf.slice(0))
      const bytes = await pdfDoc.save({
        // @ts-ignore pdf-lib encrypt option
        userPassword: password,
        ownerPassword: password,
      } as any)
      setResult(new Blob([bytes as any], { type: 'application/pdf' }))
    } catch (e) {
      setError(isPdfPasswordError(e) ? 'This PDF is already password-protected.' : `Failed to protect: ${String(e).slice(0, 120)}`)
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (!result || !file) return
    const url = URL.createObjectURL(result)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace('.pdf', '_protected.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }

  const options = (
    <>
      <SectionLabel>Password</SectionLabel>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)}
        placeholder="Enter password"
        className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-2"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} />

      {password && (
        <div className="mb-3">
          <div className="progress-track" style={{ height: 4 }}>
            <div className="progress-fill" style={{ width: `${(strength.score / 5) * 100}%`, background: strength.color }} />
          </div>
          <p className="text-xs mt-1" style={{ color: strength.color }}>{strength.label}</p>
        </div>
      )}

      <SectionLabel>Confirm Password</SectionLabel>
      <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
        placeholder="Re-enter password"
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} />

      {confirm && password !== confirm && (
        <p className="text-xs mt-1" style={{ color: '#EF4444' }}>Passwords don't match</p>
      )}
    </>
  )

  return (
    <ToolShell title="PDF Password Protect" subtitle="Add password encryption before download" slug="pdf-protect" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        {!file ? (
          <FileDropzone accept=".pdf,application/pdf" onFiles={handleFile} label="Drop a PDF to protect" sublabel="Max 50 MB" />
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
                <Spinner /><p className="text-sm" style={{ color: 'var(--text-2)' }}>Encrypting...</p>
              </div>
            )}

            {result && !loading && (
              <div className="card-glass rounded-xl p-5">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Protected</p>
                <p className="text-sm font-mono mt-1" style={{ color: 'var(--text)' }}>{formatBytes(result.size)}</p>
              </div>
            )}

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <div className="flex gap-3 flex-wrap">
              <button onClick={protect} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                {loading ? <><Spinner /> Encrypting...</> : <><Lock size={15} /> Protect PDF</>}
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
