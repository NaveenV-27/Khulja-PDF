import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'

const toolLinks = [
  { label: 'Compress PDF',      href: '/tools/compress'   },
  { label: 'Merge PDF',         href: '/tools/merge'      },
  { label: 'Split PDF',         href: '/tools/split'      },
  { label: 'PDF Editor',        href: '/tools/pdf-editor' },
  { label: 'Image to PDF',      href: '/tools/img-to-pdf' },
  { label: 'Remove Background', href: '/tools/bg-remove'  },
  { label: 'QR Tools',          href: '/tools/qr'         },
  { label: 'Resume Builder',    href: '/tools/resume'     },
]

export default function Footer() {
  return (
    <footer style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border)' }}>
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 2h7l3 3v9H3V2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M10 2v3h3" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M5 8h6M5 11h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ fontFamily: 'Dosis, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Pdf<span style={{ color: 'var(--accent)' }}>Kholo</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)', maxWidth: '260px' }}>
              Free PDF & image tools that run entirely in your browser. No uploads, no servers, no sign-up required.
            </p>
          </div>

          {/* Tools */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Tools</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {toolLinks.map(l => (
                <Link key={l.href} to={l.href} className="text-sm transition-colors duration-150"
                  style={{ color: 'var(--text-2)', fontFamily: 'Dosis, sans-serif' }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--accent)'}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-2)'}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Privacy First</p>
            <div className="flex flex-col gap-3">
              {[
                ['', 'Files never leave your device'],
                ['', 'All processing is client-side'],
                ['', 'No account required'],
                ['', 'Works offline too'],
              ].map(([icon, text]) => (
                <div key={text} className="flex items-center gap-2.5">
                  <span className="text-base">{icon}</span>
                  <span className="text-sm" style={{ color: 'var(--text-2)', fontFamily: 'Dosis, sans-serif' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>
            Made with <Heart size={11} fill="currentColor" style={{ color: 'var(--accent)' }} /> — PdfKholo © {new Date().getFullYear()}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>100% free · Open source · No ads</p>
        </div>
      </div>
    </footer>
  )
}
