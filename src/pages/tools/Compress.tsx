import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { Download, RefreshCw } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes, isPdfPasswordError } from '../../lib/fileGuard'

type Quality = 'low' | 'medium' | 'high'
const QUALITY_MAP: Record<Quality, number> = { low: 0.4, medium: 0.7, high: 0.9 }
const QUALITY_SCALE: Record<Quality, number> = { low: 0.8, medium: 1.0, high: 1.2 }

async function renderPdfToJpegPages(
  arrayBuf: ArrayBuffer,
  jpgQuality: number,
  renderScale: number,
  onProgress: (pct: number) => void
): Promise<Blob> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href
  const pdfData = new Uint8Array(arrayBuf)
  const pdfJsDoc = await pdfjsLib.getDocument({ data: pdfData }).promise
  const numPages = pdfJsDoc.numPages
  const newPdf = await PDFDocument.create()

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfJsDoc.getPage(i)
    const viewport = page.getViewport({ scale: renderScale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')!
    await (page.render as any)({ canvasContext: ctx, viewport }).promise
    const dataUrl = canvas.toDataURL('image/jpeg', jpgQuality)
    const imgBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0))
    const jpg = await newPdf.embedJpg(imgBytes)
    const pg = newPdf.addPage([viewport.width, viewport.height])
    pg.drawImage(jpg, { x: 0, y: 0, width: viewport.width, height: viewport.height })
    onProgress(Math.round((i / numPages) * 100))
  }

  const bytes = await newPdf.save({ useObjectStreams: true })
  return new Blob([bytes as any], { type: 'application/pdf' })
}

export default function Compress() {
  const [file, setFile] = useState<File | null>(null)
  const [rawBuf, setRawBuf] = useState<ArrayBuffer | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [result, setResult] = useState<{ blob: Blob; originalSize: number } | null>(null)
  const [error, setError] = useState('')

  // Mode toggle
  const [customMode, setCustomMode] = useState(false)
  const [quality, setQuality] = useState<Quality>('medium')
  // Custom target size
  const [targetValue, setTargetValue] = useState('500')
  const [targetUnit, setTargetUnit] = useState<'KB' | 'MB'>('KB')

  const handleFile = async (files: File[]) => {
    const f = files[0]
    const err = checkFileSize(f)
    if (err) { setError(err); return }
    const buf = await f.arrayBuffer()
    setFile(f); setRawBuf(buf); setResult(null); setError('')
    // Suggest a sensible default target = 50% of original
    const halfKB = Math.round(f.size / 2 / 1024)
    if (halfKB >= 1024) {
      setTargetValue((halfKB / 1024).toFixed(1)); setTargetUnit('MB')
    } else {
      setTargetValue(String(halfKB)); setTargetUnit('KB')
    }
  }

  const compress = async () => {
    if (!file || !rawBuf) return
    setLoading(true); setError(''); setProgress(0)

    try {
      await PDFDocument.load(rawBuf.slice(0)) // validate

      if (!customMode) {
        setProgressLabel('Compressing...')
        const blob = await renderPdfToJpegPages(
          rawBuf.slice(0),
          QUALITY_MAP[quality],
          QUALITY_SCALE[quality],
          p => setProgress(p)
        )
        setResult({ blob, originalSize: file.size })
      } else {
        // Custom target size mode — binary search on quality
        const targetBytes =
          parseFloat(targetValue) * (targetUnit === 'MB' ? 1024 * 1024 : 1024)

        if (isNaN(targetBytes) || targetBytes <= 0) {
          setError('Please enter a valid target size.'); setLoading(false); return
        }
        if (targetBytes >= file.size) {
          setError('Target size is larger than the original file. Enter a smaller value.'); setLoading(false); return
        }

        let lo = 0.1, hi = 0.95, bestBlob: Blob | null = null
        const maxIter = 6

        for (let iter = 0; iter < maxIter; iter++) {
          const mid = (lo + hi) / 2
          setProgressLabel(`Trying quality ${Math.round(mid * 100)}%... (pass ${iter + 1}/${maxIter})`)
          setProgress(Math.round((iter / maxIter) * 90))

          const blob = await renderPdfToJpegPages(rawBuf.slice(0), mid, 1.0, () => {})
          bestBlob = blob

          if (blob.size <= targetBytes) {
            lo = mid  // too small — try higher quality (bigger file)
          } else {
            hi = mid  // too big — lower quality
          }

          // Close enough — within 10% of target
          if (Math.abs(blob.size - targetBytes) / targetBytes < 0.10) break
        }

        setProgress(100)
        setResult({ blob: bestBlob!, originalSize: file.size })
      }
    } catch (e) {
      setError(
        isPdfPasswordError(e)
          ? 'This PDF is password-protected.'
          : `Compression failed: ${String(e).slice(0, 120)}`
      )
    } finally {
      setLoading(false); setProgress(0); setProgressLabel('')
    }
  }

  const download = () => {
    if (!result) return
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (file?.name ?? 'file').replace('.pdf', '_compressed.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }

  const savings = result
    ? Math.max(0, Math.round((1 - result.blob.size / result.originalSize) * 100))
    : 0

  const options = (
    <>
      {/* Mode toggle */}
      <SectionLabel>Mode</SectionLabel>
      <div className="flex items-center justify-between mb-4 p-1 rounded-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {['Preset', 'Custom Size'].map((label, i) => {
          const active = customMode === (i === 1)
          return (
            <button key={label} onClick={() => setCustomMode(i === 1)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                fontFamily: 'Dosis, sans-serif',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text-3)',
              }}>
              {label}
            </button>
          )
        })}
      </div>

      {!customMode ? (
        <>
          <SectionLabel>Quality</SectionLabel>
          {(['low', 'medium', 'high'] as Quality[]).map(q => (
            <button key={q} onClick={() => setQuality(q)}
              className="w-full text-left px-3 py-3 rounded-xl mb-2 text-xs transition-all"
              style={{
                fontFamily: 'Dosis, sans-serif', fontWeight: 600,
                background: quality === q ? 'var(--accent-dim)' : 'var(--bg-card)',
                color: quality === q ? 'var(--accent)' : 'var(--text-2)',
                border: quality === q ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              }}>
              {q.charAt(0).toUpperCase() + q.slice(1)}
              <span className="block font-normal mt-0.5" style={{ color: 'var(--text-3)', fontSize: 10 }}>
                {q === 'low' ? 'Max compression' : q === 'medium' ? 'Balanced — recommended' : 'Best quality'}
              </span>
            </button>
          ))}
        </>
      ) : (
        <>
          <SectionLabel>Target File Size</SectionLabel>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              min="1"
              value={targetValue}
              onChange={e => setTargetValue(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none font-mono"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              placeholder="e.g. 500"
            />
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {(['KB', 'MB'] as const).map(u => (
                <button key={u} onClick={() => setTargetUnit(u)}
                  className="px-3 text-xs font-bold transition-all"
                  style={{
                    fontFamily: 'Dosis, sans-serif',
                    background: targetUnit === u ? 'var(--accent)' : 'var(--bg-card)',
                    color: targetUnit === u ? '#fff' : 'var(--text-3)',
                  }}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          {file && (
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Original: <span className="font-mono" style={{ color: 'var(--text-2)' }}>{formatBytes(file.size)}</span>
            </p>
          )}
          {/* Slider for quick pick */}
          {file && (
            <div className="mt-3">
              <input
                type="range"
                min={Math.round(file.size * 0.05 / 1024)}
                max={Math.round(file.size * 0.9 / 1024)}
                value={
                  targetUnit === 'KB'
                    ? parseFloat(targetValue) || 0
                    : (parseFloat(targetValue) || 0) * 1024
                }
                onChange={e => {
                  const kb = +e.target.value
                  if (kb >= 1024) {
                    setTargetValue((kb / 1024).toFixed(1)); setTargetUnit('MB')
                  } else {
                    setTargetValue(String(kb)); setTargetUnit('KB')
                  }
                }}
                className="w-full" style={{ accentColor: 'var(--accent)' }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
                <span>5%</span>
                <span>90%</span>
              </div>
            </div>
          )}
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-3)' }}>
            The compressor will auto-adjust quality to get as close as possible to your target. Result may vary ±10%.
          </p>
        </>
      )}
    </>
  )

  return (
    <ToolShell title="Compress PDF" subtitle="Reduce file size with preset quality or a custom target size" slug="compress" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        {!file ? (
          <FileDropzone accept=".pdf,application/pdf" onFiles={handleFile} label="Drop a PDF to compress" sublabel="Max 50 MB" />
        ) : (
          <div className="flex flex-col gap-4">
            {/* File card */}
            <div className="card-glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}>
                PDF
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>{file.name}</p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>{formatBytes(file.size)}</p>
              </div>
              <button onClick={() => { setFile(null); setRawBuf(null); setResult(null) }} className="btn-ghost px-3 py-1.5 text-xs">Change</button>
            </div>

            {/* Progress */}
            {loading && (
              <div className="card-glass rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Spinner />
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                    {progressLabel || `Compressing... ${progress}%`}
                  </p>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Result */}
            {result && !loading && (
              <div className="card-glass rounded-xl p-5 flex flex-col gap-4">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Result</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Original</p>
                    <p className="text-base font-bold font-mono" style={{ color: 'var(--text)' }}>{formatBytes(result.originalSize)}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Saved</p>
                    <p className="text-base font-bold" style={{ color: savings > 0 ? '#10B981' : '#FBBF24', fontFamily: 'Dosis, sans-serif' }}>
                      {savings > 0 ? `-${savings}%` : `+${Math.abs(savings)}%`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Output</p>
                    <p className="text-base font-bold font-mono" style={{ color: 'var(--text)' }}>{formatBytes(result.blob.size)}</p>
                  </div>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${100 - savings}%`, background: savings > 0 ? '#10B981' : 'var(--accent)' }} />
                </div>
                {customMode && (
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    Target was <span className="font-mono">{targetValue} {targetUnit}</span> — result within ±10% is expected.
                  </p>
                )}
              </div>
            )}

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <div className="flex gap-3 flex-wrap">
              <button onClick={compress} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                {loading ? <><Spinner /> Compressing...</> : <><RefreshCw size={15} /> Compress PDF</>}
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