import { Link } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { useState } from 'react'
import { ToolIcon } from '../components/ui/index'

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
  { name: 'Image Resizer',     desc: 'Resize images by pixels or percentage.',             href: '/tools/image-resize',color: '#22D3EE', bg: 'rgba(34,211,238,0.1)',  tag: null },
  { name: 'Image Filters',     desc: 'Adjust brightness, contrast, saturation and presets.',href: '/tools/image-filters',color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', tag: null },
  { name: 'Image Cropper',     desc: 'Crop images freehand or with fixed-ratio presets.',  href: '/tools/image-crop',  color: '#FB7185', bg: 'rgba(251,113,133,0.1)', tag: null },
  { name: 'Add Background',    desc: 'Add solid color or gradient behind transparent images.', href: '/tools/add-bg',  color: '#34D399', bg: 'rgba(52,211,153,0.1)',  tag: null },
  { name: 'Bulk Image Resize', desc: 'Resize multiple images at once, download as ZIP.',   href: '/tools/bulk-resize', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', tag: null },
  { name: 'Image Watermark',   desc: 'Add a text or logo watermark to your photos.',       href: '/tools/image-watermark', color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', tag: null },
  { name: 'Rotate PDF Pages',  desc: 'Rotate individual or all pages by 90°.',             href: '/tools/rotate-pdf',  color: '#F97316', bg: 'rgba(249,115,22,0.1)', tag: null },
  { name: 'Watermark PDF',     desc: 'Add a text watermark to every page.',                href: '/tools/watermark-pdf', color: '#EAB308', bg: 'rgba(234,179,8,0.1)', tag: null },
  { name: 'PDF to Image',      desc: 'Export each PDF page as JPG or PNG.',                href: '/tools/pdf-to-image', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', tag: null },
  { name: 'PDF Password Protect', desc: 'Add password encryption before download.',        href: '/tools/pdf-protect', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', tag: null },
  { name: 'PDF Unlock',        desc: 'Remove password protection from a PDF.',             href: '/tools/pdf-unlock',  color: '#10B981', bg: 'rgba(16,185,129,0.1)', tag: null },
  { name: 'PDF to Word',       desc: 'Convert PDF into an editable .docx file.',           href: '/tools/pdf-to-word', color: '#06B6D4', bg: 'rgba(6,182,212,0.1)', tag: 'New' },
  { name: 'PDF to Excel',      desc: 'Extract tables from PDF into an .xlsx file.',        href: '/tools/pdf-to-excel', color: '#10B981', bg: 'rgba(16,185,129,0.1)', tag: 'New' },
  { name: 'Sign PDF',          desc: 'Draw, type, or upload a signature onto your PDF.',   href: '/tools/sign-pdf',    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', tag: 'New' },
  { name: 'OCR PDF',           desc: 'Extract text from scanned or image-based PDFs.',     href: '/tools/ocr-pdf',     color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', tag: 'New' },
  { name: 'Redact PDF',        desc: 'Permanently black out sensitive text or regions.',   href: '/tools/redact-pdf',  color: '#EF4444', bg: 'rgba(239,68,68,0.1)', tag: 'New' },
  { name: 'Passport Photo Maker', desc: 'Country presets with print-ready A4 sheet.',      href: '/tools/passport-photo', color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)', tag: 'New' },
  { name: 'ID Card Photo Maker',  desc: 'PAN, Aadhaar and college ID photo presets.',      href: '/tools/id-photo',    color: '#D946EF', bg: 'rgba(217,70,239,0.1)', tag: 'New' },
  { name: 'Image Compressor',     desc: 'Compress JPG/PNG/WEBP with quality control.',     href: '/tools/image-compress', color: '#84CC16', bg: 'rgba(132,204,22,0.1)', tag: 'New' },
  { name: 'Image Format Converter', desc: 'Convert between JPG, PNG, WEBP, BMP formats.',  href: '/tools/image-convert', color: '#F472B6', bg: 'rgba(244,114,182,0.1)', tag: 'New' },
]

export default function Tools() {
  const [query, setQuery] = useState('')
  const filtered = allTools.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.desc.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <main className="min-h-screen pt-28 pb-20 px-5 md:px-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-up">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}>All Tools</span>
          <h1 className="text-4xl md:text-5xl font-display font-800 mt-3 tracking-tight"
            style={{ fontFamily: 'Dosis, sans-serif', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.025em' }}>
            Pick your tool.
          </h1>
          <p className="mt-3 text-base" style={{ color: 'var(--text-2)', maxWidth: '360px', margin: '12px auto 0' }}>
            All tools run locally in your browser — fast, private, free.
          </p>
        </div>

        <div className="relative max-w-md mx-auto mb-10 animate-fade-up-delay">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          <input
            type="text"
            placeholder="Search tools..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up-delay2">
            {filtered.map(tool => (
              <Link key={tool.href} to={tool.href} className="card-glass rounded-2xl p-5 flex flex-col gap-3 group">
                <div className="flex items-start justify-between">
                  <ToolIcon label={tool.name} color={tool.color} bg={tool.bg} />
                  {tool.tag && <span className="badge" style={{ background: tool.bg, color: tool.color }}>{tool.tag}</span>}
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1" style={{ fontFamily: 'Dosis, sans-serif', color: 'var(--text)' }}>{tool.name}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{tool.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium mt-auto" style={{ color: tool.color, fontFamily: 'Dosis, sans-serif' }}>
                  Open tool <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>No tools found for "{query}"</p>
          </div>
        )}
      </div>
    </main>
  )
}