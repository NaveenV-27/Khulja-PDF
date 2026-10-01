import { useState } from 'react'


const allTools = [
  { name: 'Compress PDF',      desc: 'Reduce file size, keep quality intact.',             href: '/tools/compress',    color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  tag: 'Popular'  },
  { name: 'Edit PDF',          desc: 'Add text, images and annotations.',                  href: '/tools/pdf-editor',  color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',   tag: 'Featured' },
  { name: 'Merge PDF',         desc: 'Combine PDFs with drag-and-drop reorder.',           href: '/tools/merge',       color: '#10B981', bg: 'rgba(16,185,129,0.1)',  tag: null },
  { name: 'Split PDF',         desc: 'Extract pages or split into separate files.',        href: '/tools/split',       color: '#F97316', bg: 'rgba(249,115,22,0.1)',  tag: null },
  { name: 'Image to PDF',      desc: 'JPG/PNG to PDF — A4 or original size.',              href: '/tools/img-to-pdf',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  tag: null },
  { name: 'DOCX to PDF',       desc: 'Convert Word (.docx) documents to PDF quickly.',     href: '/tools/docx-to-pdf', color: '#06B6D4', bg: 'rgba(6,182,212,0.1)',   tag: 'New' },
  { name: 'Remove Background', desc: 'AI-powered BG removal, fully private.',              href: '/tools/bg-remove',   color: '#EC4899', bg: 'rgba(236,72,153,0.1)',  tag: 'AI' },
  { name: 'QR Code Tools',     desc: 'Generate and scan QR codes live.',                   href: '/tools/qr',          color: '#14B8A6', bg: 'rgba(20,184,166,0.1)',  tag: null },
  { name: 'Resume Builder',    desc: 'Build and export a professional resume.',            href: '/tools/resume',      color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  tag: null },
]

export default function Tools() {
  const [query, setQuery] = useState('')
  const filtered = allTools.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.desc.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <main className="min-h-screen pt-28 pb-20 px-5 md:px-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-up">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}
          >
            All Tools
          </span>
          <h1
            className="text-4xl md:text-5xl font-display font-800 mt-3 tracking-tight"
            style={{ fontFamily: 'Dosis, sans-serif', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.025em' }}
          >
            Pick your tool.
          </h1>
          <p
            className="mt-3 text-base"
            style={{ color: 'var(--text-2)', maxWidth: '360px', margin: '12px auto 0' }}
          >
            All tools run locally in your browser — fast, private, free.
          </p>
        </div>

        <div className="max-w-xl mx-auto mb-10">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools..."
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontFamily: 'Dosis, sans-serif',
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((t) => (
            <a
              key={t.href}
              href={t.href}
              className="group rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                textDecoration: 'none',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: t.bg, color: t.color }}
                >
                
                </div>
                {t.tag && (
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full"
                    style={{
                      color: t.color,
                      background: t.bg,
                      border: `1px solid ${t.color}33`,
                      fontFamily: 'Dosis, sans-serif',
                      fontWeight: 700,
                    }}
                  >
                    {t.tag}
                  </span>
                )}
              </div>

              <h3
                className="mt-4 text-lg leading-tight"
                style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif', fontWeight: 700 }}
              >
                {t.name}
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: 'var(--text-2)', fontFamily: 'Dosis, sans-serif' }}
              >
                {t.desc}
              </p>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}