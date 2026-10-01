import { useState } from 'react'
import { jsPDF } from 'jspdf'
import { Download, X } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, OptionRow, SectionLabel } from '../../components/ui/index'
import { checkFileSizes } from '../../lib/fileGuard'

interface ImgItem { id: string; file: File; url: string }

export default function ImgToPdf() {
  const [images, setImages] = useState<ImgItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [pageSize, setPageSize] = useState<'a4' | 'image'>('a4')
  const [margin, setMargin] = useState(20)

  const addImages = (files: File[]) => {
    const err = checkFileSizes(files)
    if (err) { setError(err); return }
    setError(''); setDone(false)
    const items = files.map(f => ({ id: `${f.name}-${Math.random()}`, file: f, url: URL.createObjectURL(f) }))
    setImages(prev => [...prev, ...items])
  }

  const convert = async () => {
    if (images.length === 0) return
    setLoading(true); setError('')
    try {
      const pdf = new jsPDF({ unit: 'pt', format: pageSize === 'a4' ? 'a4' : 'a4' })
      const A4W = 595.28, A4H = 841.89

      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        const imgEl = await new Promise<HTMLImageElement>((res, rej) => {
          const el = new Image(); el.onload = () => res(el); el.onerror = rej; el.src = img.url
        })

        if (i > 0) pdf.addPage()

        if (pageSize === 'a4') {
          const pad = margin
          const maxW = A4W - pad * 2, maxH = A4H - pad * 2
          const ratio = Math.min(maxW / imgEl.naturalWidth, maxH / imgEl.naturalHeight)
          const w = imgEl.naturalWidth * ratio, h = imgEl.naturalHeight * ratio
          const x = pad + (maxW - w) / 2, y = pad + (maxH - h) / 2
          pdf.addImage(img.url, 'JPEG', x, y, w, h)
        } else {
          const maxW = A4W - 40, maxH = A4H - 40
          const ratio = Math.min(maxW / imgEl.naturalWidth, maxH / imgEl.naturalHeight)
          const w = imgEl.naturalWidth * ratio, h = imgEl.naturalHeight * ratio
          pdf.addImage(img.url, 'JPEG', 20, 20, w, h)
        }
      }

      pdf.save('images.pdf')
      setDone(true)
    } catch (e) {
      setError('Failed to convert images. Please ensure all files are valid images.')
    } finally {
      setLoading(false)
    }
  }

  const options = (
    <>
      <SectionLabel>Page Size</SectionLabel>
      {(['a4', 'image'] as const).map(s => (
        <OptionRow key={s} label="">
          <button onClick={() => setPageSize(s)}
            className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
            style={{
              fontFamily: 'Dosis, sans-serif', fontWeight: 600,
              background: pageSize === s ? 'var(--accent-dim)' : 'transparent',
              color: pageSize === s ? 'var(--accent)' : 'var(--text-2)',
              border: pageSize === s ? '1px solid var(--accent)' : '1px solid var(--border)',
            }}>
            {s === 'a4' ? 'Fit to A4' : 'Fit to Image Size'}
            <span className="block text-xs font-normal mt-0.5" style={{ color: 'var(--text-3)' }}>
              {s === 'a4' ? '595 × 842 pt, centered' : 'Page matches image dimensions'}
            </span>
          </button>
        </OptionRow>
      ))}
      {pageSize === 'a4' && (
        <OptionRow label={`Margin: ${margin}pt`}>
          <input type="range" min={0} max={60} value={margin} onChange={e => setMargin(+e.target.value)}
            className="w-full" style={{ accentColor: 'var(--accent)' }} />
        </OptionRow>
      )}
    </>
  )

  return (
    <ToolShell title="Image to PDF" subtitle="Convert JPG, PNG images to PDF — A4 fit or original size" slug="img-to-pdf" options={options}>
      <div className="flex flex-col gap-4 max-w-2xl">
        <FileDropzone
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          onFiles={addImages}
          label="Drop images to convert"
          sublabel="JPG, PNG, WEBP · Max 50 MB each"
        />

        {images.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>
                {images.length} image{images.length > 1 ? 's' : ''}
              </p>
              <button onClick={() => { setImages([]); setDone(false) }} className="text-xs" style={{ color: 'var(--text-3)' }}>Clear all</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {images.map(img => (
                <div key={img.id} className="relative rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800">
                  <img src={img.url} alt={img.file.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {done && <Alert type="success" message="PDF created and downloaded successfully!" />}

        {images.length > 0 && (
          <button onClick={convert} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm self-start">
            {loading ? <><Spinner /> Converting...</> : <><Download size={15} /> Convert to PDF</>}
          </button>
        )}
      </div>
    </ToolShell>
  )
}
