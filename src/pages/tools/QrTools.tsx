import { useState, useRef, useEffect } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { Download, Camera, CameraOff } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner } from '../../components/ui/index'

export default function QrTools() {
  const [tab, setTab] = useState<'generate' | 'scan'>('generate')

  // Generate
  const [text, setText] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [size, setSize] = useState(300)
  const [fgColor, setFgColor] = useState('#000000')

  // Scan
  const [scanResult, setScanResult] = useState('')
  const [scanError, setScanError] = useState('')
  const [webcamActive, setWebcamActive] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const generate = async () => {
    if (!text.trim()) return
    const url = await QRCode.toDataURL(text, { width: size, color: { dark: fgColor, light: '#ffffff' }, margin: 2 })
    setQrUrl(url)
  }

  useEffect(() => { if (text.trim()) generate() }, [text, size, fgColor])

  const downloadQr = () => {
    if (!qrUrl) return
    const a = document.createElement('a'); a.href = qrUrl; a.download = 'qrcode.png'; a.click()
  }

  const scanFile = (files: File[]) => {
    setScanError(''); setScanResult(''); setScanLoading(true)
    const f = files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width; canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const result = jsQR(data.data, canvas.width, canvas.height)
        setScanLoading(false)
        if (result) setScanResult(result.data)
        else setScanError('No QR code found in the image. Try a clearer photo.')
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(f)
  }

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setWebcamActive(true)
      scanLoop()
    } catch { setScanError('Could not access camera. Please allow camera permission.') }
  }

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    cancelAnimationFrame(animRef.current)
    setWebcamActive(false)
  }

  const scanLoop = () => {
    animRef.current = requestAnimationFrame(() => {
      if (!videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current
        canvas.width = video.videoWidth; canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const result = jsQR(imgData.data, canvas.width, canvas.height)
        if (result) { setScanResult(result.data); stopWebcam(); return }
      }
      scanLoop()
    })
  }

  useEffect(() => () => { stopWebcam() }, [])

  const options = (
    <div className="flex flex-col gap-4">
      {tab === 'generate' && (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Size</p>
            <input type="range" min={100} max={600} step={50} value={size} onChange={e => setSize(+e.target.value)}
              className="w-full" style={{ accentColor: 'var(--accent)' }} />
            <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-3)' }}>{size} × {size} px</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>QR Color</p>
            <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)}
              className="w-full h-10 rounded-lg cursor-pointer" style={{ border: '1px solid var(--border)' }} />
          </div>
        </>
      )}
    </div>
  )

  return (
    <ToolShell title="QR Code Tools" subtitle="Generate QR codes and scan them via image upload or live webcam" slug="qr" options={options}>
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 self-start" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        {(['generate', 'scan'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              fontFamily: 'Dosis, sans-serif',
              background: tab === t ? 'var(--bg-card)' : 'transparent',
              color: tab === t ? 'var(--text)' : 'var(--text-2)',
              boxShadow: tab === t ? 'var(--shadow-card)' : 'none',
            }}>
            {t.charAt(0).toUpperCase() + t.slice(1)} QR
          </button>
        ))}
      </div>

      {tab === 'generate' ? (
        <div className="flex flex-col gap-4 max-w-lg">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-2)', fontFamily: 'Dosis, sans-serif' }}>
              Text or URL
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="https://example.com or any text..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {qrUrl && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-2xl" style={{ background: '#fff', border: '1px solid var(--border)' }}>
                <img src={qrUrl} alt="QR Code" style={{ width: Math.min(size, 280), height: Math.min(size, 280) }} />
              </div>
              <button onClick={downloadQr} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                <Download size={15} /> Download PNG
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-w-lg">
          <FileDropzone accept="image/*" onFiles={scanFile} label="Upload QR code image to scan" sublabel="JPG, PNG, WEBP" />

          <div className="flex items-center gap-3 my-1">
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ color: 'var(--text-3)', fontSize: 12, fontFamily: 'Dosis, sans-serif' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {!webcamActive ? (
            <button onClick={startWebcam} className="btn-ghost flex items-center justify-center gap-2 py-3 text-sm">
              <Camera size={16} /> Use Live Camera
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9', background: '#000' }}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-40 rounded-2xl" style={{ border: '2px solid var(--accent)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
                </div>
              </div>
              <button onClick={stopWebcam} className="btn-ghost flex items-center justify-center gap-2 py-2.5 text-sm">
                <CameraOff size={16} /> Stop Camera
              </button>
            </div>
          )}

          {scanLoading && (
            <div className="flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
              <Spinner /> Scanning...
            </div>
          )}

          {scanResult && (
            <div className="card-glass rounded-xl p-4 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#10B981', fontFamily: 'Dosis, sans-serif' }}>✓ QR Code Decoded</p>
              <p className="text-sm break-all font-mono" style={{ color: 'var(--text)' }}>{scanResult}</p>
              {scanResult.startsWith('http') && (
                <a href={scanResult} target="_blank" rel="noreferrer" className="text-xs" style={{ color: 'var(--accent)' }}>Open link →</a>
              )}
            </div>
          )}

          {scanError && <Alert type="error" message={scanError} onClose={() => setScanError('')} />}
        </div>
      )}
    </ToolShell>
  )
}
