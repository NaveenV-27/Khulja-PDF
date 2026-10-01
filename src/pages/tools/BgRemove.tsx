import { useState } from 'react'
import { Download } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner } from '../../components/ui/index'
import { checkFileSize } from '../../lib/fileGuard'

export default function BgRemove() {
  const [original, setOriginal] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [bgColor, setBgColor] = useState('#ffffff')
  const [error, setError] = useState('')

  const handleFile = async (files: File[]) => {
    const f = files[0]
    const err = checkFileSize(f)
    if (err) { setError(err); return }

    // Auto-resize if > 2000px wide
    const imgEl = await new Promise<HTMLImageElement>((res) => {
      const img = new Image(); img.onload = () => res(img); img.src = URL.createObjectURL(f)
    })

    let blob: Blob = f
    if (imgEl.naturalWidth > 2000) {
      const canvas = document.createElement('canvas')
      const ratio = 2000 / imgEl.naturalWidth
      canvas.width = 2000; canvas.height = imgEl.naturalHeight * ratio
      canvas.getContext('2d')!.drawImage(imgEl, 0, 0, canvas.width, canvas.height)
      blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.92))
    }

    setOriginal(URL.createObjectURL(blob))
    setResult(''); setError(''); setLoading(true); setProgress(10)

    try {
      const { removeBackground } = await import('@imgly/background-removal')
      setProgress(40)
      const resultBlob = await removeBackground(blob, {
        progress: (_key: string, cur: number, total: number) => {
          setProgress(Math.round(40 + (cur / total) * 55))
        },
      })
      setProgress(100)
      setResult(URL.createObjectURL(resultBlob))
    } catch (e) {
      setError('Background removal failed. Try a clearer image with a distinct subject.')
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (!result) return
    const a = document.createElement('a'); a.href = result; a.download = 'no_background.png'; a.click()
  }

  return (
    <ToolShell title="Remove Background" subtitle="AI-powered background removal — runs entirely in your browser" slug="bg-remove">
      <div className="flex flex-col gap-4 max-w-2xl">
        {!original ? (
          <FileDropzone
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onFiles={handleFile}
            label="Drop an image to remove its background"
            sublabel="JPG, PNG, WEBP · Max 50 MB · Large images auto-resized"
          />
        ) : (
          <div className="flex flex-col gap-4">
            {loading && (
              <div className="card-glass rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Spinner />
                  <p className="text-sm" style={{ color: 'var(--text-2)', fontFamily: 'Dosis, sans-serif' }}>
                    {progress < 40 ? 'Loading AI model...' : progress < 90 ? 'Removing background...' : 'Finishing up...'}
                  </p>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{progress}%</p>
              </div>
            )}

            {/* Comparison view */}
            <div className={`grid gap-4 ${result ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Original</p>
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                  <img src={original} alt="Original" className="w-full h-48 object-contain" />
                </div>
              </div>
              {result && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#10B981', fontFamily: 'Dosis, sans-serif' }}>Result</p>
                  <div className="rounded-2xl overflow-hidden" style={{ background: bgColor, border: '1px solid var(--border)' }}>
                    <img src={result} alt="Background removed" className="w-full h-48 object-contain" />
                  </div>
                  {/* BG colour picker */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Preview bg:</span>
                    {['transparent','#ffffff', '#000000', '#f87171', '#60a5fa'].map(col => (
                      <button
                        key={col}
                        onClick={() => setBgColor(col)}
                        title={col}
                        style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                          background: col === 'transparent'
                            ? 'repeating-conic-gradient(#aaa 0% 25%, #fff 0% 50%)'
                            : col,
                          backgroundSize: '8px 8px',
                          border: bgColor === col ? '2px solid var(--accent)' : '2px solid var(--border)',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                    <input type="color" value={bgColor === 'transparent' ? '#ffffff' : bgColor}
                      onChange={e => setBgColor(e.target.value)}
                      title="Custom colour"
                      style={{ width: 22, height: 22, borderRadius: 6, border: '2px solid var(--border)', cursor: 'pointer', padding: 0 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <div className="flex gap-3">
              {result && (
                <button onClick={download} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                  <Download size={15} /> Download PNG
                </button>
              )}
              <button onClick={() => { setOriginal(''); setResult(''); setProgress(0) }} className="btn-ghost px-4 py-2.5 text-sm">
                Try another image
              </button>
            </div>
          </div>
        )}

        <div className="card-glass rounded-xl p-4 flex items-start gap-3">
          <span style={{ fontSize: 18 }}>ℹ</span>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            First use may take 10–30 seconds to download. After that, processing is instant and completely private.
          </p>
        </div>
      </div>
    </ToolShell>
  )
}