import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, SlidersHorizontal, X } from 'lucide-react'
import { ToolIcon } from '../ui/index'

const tools = [
  { slug: 'compress',   label: 'Compress PDF',     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  { slug: 'pdf-editor', label: 'PDF Editor',        color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  { slug: 'merge',      label: 'Merge PDF',         color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  { slug: 'split',      label: 'PDF to Images',     color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  { slug: 'img-to-pdf', label: 'Image to PDF',      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  { slug: 'bg-remove',  label: 'Remove Background', color: '#EC4899', bg: 'rgba(236,72,153,0.12)' },
  { slug: 'qr',         label: 'QR Tools',          color: '#14B8A6', bg: 'rgba(20,184,166,0.12)' },
  { slug: 'resume',     label: 'Resume Builder',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
]

interface Props {
  title: string
  subtitle: string
  slug: string
  options?: React.ReactNode
  children: React.ReactNode
}

export default function ToolShell({ title, subtitle, slug, options, children }: Props) {
  const current = tools.find(t => t.slug === slug)
  const [optionsOpen, setOptionsOpen] = useState(false)

  return (
    <div className="pt-16 min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Top bar with back button ── */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <Link to="/tools" className="flex items-center gap-2 text-xs font-semibold transition-all"
          style={{ color: 'var(--text-2)', fontFamily: 'Dosis, sans-serif' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}>
          <ArrowLeft size={14} /> All Tools
        </Link>

        <div className="flex items-center gap-3">
          {current && <ToolIcon label={title} color={current.color} bg={current.bg} size={28} />}
          <div>
            <h1 className="text-sm font-bold leading-tight"
              style={{ fontFamily: 'Dosis, sans-serif', fontWeight: 800, color: 'var(--text)' }}>
              {title}
            </h1>
            <p className="text-xs hidden sm:block" style={{ color: 'var(--text-3)' }}>{subtitle}</p>
          </div>
        </div>

        {/* Mobile options toggle — only shown when options exist */}
        {options && (
          <button onClick={() => setOptionsOpen(o => !o)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              fontFamily: 'Dosis, sans-serif',
              background: optionsOpen ? 'var(--accent)' : 'var(--bg-card)',
              color: optionsOpen ? '#fff' : 'var(--text-2)',
              border: '1px solid var(--border)',
            }}>
            <SlidersHorizontal size={13} /> Options
          </button>
        )}

        {/* Spacer when no options */}
        {!options && <div className="w-20" />}
      </div>

      {/* ── Mobile options drawer ── */}
      {options && optionsOpen && (
        <div className="lg:hidden mx-4 mt-3 rounded-2xl p-4 relative"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Options</p>
            <button onClick={() => setOptionsOpen(false)} style={{ color: 'var(--text-3)' }}>
              <X size={14} />
            </button>
          </div>
          {options}
        </div>
      )}

      {/* ── Main layout: content + options ── */}
      <div className="flex min-h-0">

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-6">
          {children}
        </main>

        {/* Right options panel — always visible on lg, hidden below */}
        {options && (
          <aside className="hidden lg:block shrink-0 p-5 overflow-y-auto"
            style={{
              width: 260,
              borderLeft: '1px solid var(--border)',
              background: 'var(--bg-2)',
              minHeight: 'calc(100vh - 64px - 49px)',
              position: 'sticky',
              top: 113,
              maxHeight: 'calc(100vh - 113px)',
            }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Options</p>
            {options}
          </aside>
        )}
      </div>
    </div>
  )
}