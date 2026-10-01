import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ToolIcon } from '../ui/index'

const tools = [
  { name: 'Edit PDF',          shortDesc: 'Text, images, annotations.',    href: '/tools/pdf-editor',  color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  tag: 'Hot' },
  { name: 'Compress',          shortDesc: 'Reduce size, keep quality.',     href: '/tools/compress',    color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  tag: null },
  { name: 'Merge PDF',         shortDesc: 'Combine with drag-and-drop.',    href: '/tools/merge',       color: '#10B981', bg: 'rgba(16,185,129,0.1)',  tag: null },
  { name: 'Split PDF',         shortDesc: 'Extract or split pages.',        href: '/tools/split',       color: '#F97316', bg: 'rgba(249,115,22,0.1)',  tag: null },
  { name: 'Image to PDF',      shortDesc: 'JPG/PNG to PDF.',                href: '/tools/img-to-pdf',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  tag: null },
  { name: 'DOCX to PDF',       shortDesc: 'Convert .docx to PDF fast.',     href: '/tools/docx-to-pdf', color: '#06B6D4', bg: 'rgba(6,182,212,0.1)',   tag: 'New' },
  { name: 'Remove BG',         shortDesc: 'AI-powered removal.',            href: '/tools/bg-remove',   color: '#EC4899', bg: 'rgba(236,72,153,0.1)',  tag: 'AI' },
  { name: 'QR Tools',          shortDesc: 'Generate & scan live.',          href: '/tools/qr',          color: '#14B8A6', bg: 'rgba(20,184,166,0.1)',  tag: null },
  { name: 'Resume Builder',    shortDesc: 'Export professional resume.',    href: '/tools/resume',      color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  tag: null },
]

export default function ToolsGrid() {
  return (
    <section className="py-12 px-5 md:px-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tools.map(tool => (
            <Link key={tool.href} to={tool.href} className="card-glass rounded-2xl p-4 flex flex-col gap-3 group">
              <div className="flex items-start justify-between">
                <ToolIcon label={tool.name} color={tool.color} bg={tool.bg} />
                {tool.tag && (
                  <span className="badge" style={{ background: tool.bg, color: tool.color }}>{tool.tag}</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold" style={{ fontFamily: 'Dosis, sans-serif', fontWeight: 700, color: 'var(--text)' }}>{tool.name}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)', fontFamily: 'Dosis, sans-serif' }}>{tool.shortDesc}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold mt-auto" style={{ color: tool.color, fontFamily: 'Dosis, sans-serif' }}>
                Open <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}