import { AlertCircle, CheckCircle, X, FileEdit, FileArchive, FilePlus2, Images, Image, Wand2, QrCode, FileText } from 'lucide-react'

function getIcon(label: string, size: number): React.ReactNode {
  const k = label.toLowerCase()
  if (k.includes('compress'))                     return <FileArchive size={size} />
  if (k.includes('edit') || k.includes('editor')) return <FileEdit size={size} />
  if (k.includes('merge'))                        return <FilePlus2 size={size} />
  if (k.includes('split') || k.includes('images') || k.includes('img-to') || k === 'image to pdf') return <Images size={size} />
  if (k.includes('image to pdf') || k === 'image to pdf') return <Image size={size} />
  if (k.includes('bg') || k.includes('background') || k.includes('remove')) return <Wand2 size={size} />
  if (k.includes('qr'))                           return <QrCode size={size} />
  if (k.includes('resume'))                       return <FileText size={size} />
  if (k.includes('image'))                        return <Image size={size} />
  return <FileText size={size} />
}

export function ToolIcon({ label, color, bg, size = 48 }: { label: string; color: string; bg: string; size?: number }) {
  const iconSize = Math.round(size * 0.42)
  return (
    <div style={{
      width: size, height: size, background: bg, color: color,
      border: `1.5px solid ${color}33`, borderRadius: size > 30 ? 14 : 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, transition: 'transform 0.2s ease',
    }}>
      {getIcon(label, iconSize)}
    </div>
  )
}

export function Spinner({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return <div className={size === 'lg' ? 'spinner-lg' : 'spinner'} />
}

export function Alert({ type, message, onClose }: { type: 'error' | 'success'; message: string; onClose?: () => void }) {
  const isErr = type === 'error'
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{
      background: isErr ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
      border: `1px solid ${isErr ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
    }}>
      {isErr ? <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: '#FBBF24' }} />
              : <CheckCircle size={16} className="shrink-0 mt-0.5" style={{ color: '#10B981' }} />}
      <span className="flex-1" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>{message}</span>
      {onClose && <button onClick={onClose} style={{ color: 'var(--text-3)' }}><X size={14} /></button>}
    </div>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>{children}</p>
}

export function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <label className="text-xs font-medium" style={{ color: 'var(--text-2)', fontFamily: 'Dosis, sans-serif' }}>{label}</label>
      {children}
    </div>
  )
}