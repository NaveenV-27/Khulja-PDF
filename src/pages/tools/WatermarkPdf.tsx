import { useState } from 'react'
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import { Download, RefreshCw } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel } from '../../components/ui/index'
import { checkFileSize, formatBytes, isPdfPasswordError } from '../../lib/fileGuard'

function hexToRgb01(hex: string) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  return { r, g, b }
}

export default function WatermarkPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [rawBuf, setRawBuf] = useState<ArrayBuffer | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Blob | null>(null)

  const [text, setText] = useState('CONFIDENTIAL')
  const [fontSize, setFontSize] = useState('48')
  const [opacity, setOpacity] = useState('30')
  const [angle, setAngle] = useState('45')
  const [color, setColor] = useState('#888888')
  const [position, setPosition] = useState<'center' | 'diagonal-tiled'>('center')

  const handleFile = async (files: File[]) => {
    const f = files[0]
    const err = checkFileSize(f)
    if (err) { setError(err); return }
    const buf = await f.arrayBuffer()
    setFile(f); setRawBuf(buf); setResult(null); setError('')
  }

  const apply = async () => {
    if (!rawBuf) return
    setLoading(true); setError('')
    try {
      const pdfDoc = await PDFDocument.load(rawBuf.slice(0))
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const { r, g, b } = hexToRgb01(color)
      const size = parseInt(fontSize, 10) || 48
      const op = parseFloat(opacity) / 100
      const ang = parseFloat(angle) || 0
      const textWidth = font.widthOfTextAtSize(text, size)

      for (const page of pdfDoc.getPages()) {
        const { width, height } = page.getSize()

        if (position === 'center') {
          page.drawText(text, {
            x: width / 2 - (textWidth * Math.cos((ang * Math.PI) / 180)) / 2,
            y: height / 2,
            size, font, color: rgb(r, g, b), opacity: op, rotate: degrees(ang),
          })
        } else {
          const stepX = textWidth + 100
          const stepY = size + 100
          for (let y = -stepY; y < height + stepY; y += stepY) {
            for (let x = -stepX; x < width + stepX; x += stepX) {
              page.drawText(text, { x, y, size, font, color: rgb(r, g, b), opacity: op * 0.6, rotate: degrees(ang) })
            }
          }
        }
      }

      const bytes = await pdfDoc.save()
      setResult(new Blob([bytes as any], { type: 'application/pdf' }))
    } catch (e) {
      setError(isPdfPasswordError(e) ? 'This PDF is password-protected.' : `Watermark failed: ${String(e).slice(0, 120)}`)
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (!result || !file) return
    const url = URL.createObjectURL(result)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace('.pdf', '_watermarked.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }

  const options = (
    <>
      <SectionLabel>Watermark Text</SectionLabel>
      <input type="text" value={text} onChange={e => setText(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} />

      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Size</p>
          <input type="number" value={fontSize} onChange={e => setFontSize(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>
        <div className="flex-1">
          <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Angle</p>
          <input type="number" value={angle} onChange={e => setAngle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>
        <div className="flex-1">
          <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Color</p>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-full h-9 rounded-lg cursor-pointer" style={{ border: '1px solid var(--border)' }} />
        </div>
      </div>

      <SectionLabel>Opacity</SectionLabel>
      <input type="range" min="5" max="100" value={opacity} onChange={e => setOpacity(e.target.value)}
        className="w-full mb-1" style={{ accentColor: 'var(--accent)' }} />
      <p className="text-xs mb-3 font-mono" style={{ color: 'var(--text-3)' }}>{opacity}%</p>

      <SectionLabel>Placement</SectionLabel>
      <div className="flex items-center justify-between p-1 rounded-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {(['center', 'diagonal-tiled'] as const).map(p => (
          <button key={p} onClick={() => setPosition(p)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ fontFamily: 'Dosis, sans-serif', background: position === p ? 'var(--accent)' : 'transparent', color: position === p ? '#fff' : 'var(--text-3)' }}>
            {p === 'center' ? 'Center' : 'Tiled'}
          </button>
        ))}
      </div>
    </>
  )

  return (
    <ToolShell title="Watermark PDF" subtitle="Add a text watermark to every page" slug="watermark-pdf" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        {!file ? (
          <FileDropzone accept=".pdf,application/pdf" onFiles={handleFile} label="Drop a PDF to watermark" sublabel="Max 50 MB" />
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
                <Spinner /><p className="text-sm" style={{ color: 'var(--text-2)' }}>Applying watermark...</p>
              </div>
            )}

            {result && !loading && (
              <div className="card-glass rounded-xl p-5">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Result ready</p>
                <p className="text-sm font-mono mt-1" style={{ color: 'var(--text)' }}>{formatBytes(result.size)}</p>
              </div>
            )}

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <div className="flex gap-3 flex-wrap">
              <button onClick={apply} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                {loading ? <><Spinner /> Applying...</> : <><RefreshCw size={15} /> Apply Watermark</>}
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
