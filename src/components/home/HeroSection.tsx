import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Zap, Globe } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="hero-mesh relative flex flex-col items-center justify-center overflow-hidden" style={{ paddingTop: 100, paddingBottom: 48 }}>

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />

      {/* Content */}
      <div className="relative z-10 text-center px-5 max-w-3xl mx-auto flex flex-col items-center gap-4">

        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#FCD34D', fontFamily: 'Dosis, sans-serif', letterSpacing: '0.1em' }}>
            ALL TOOLS · FREE · PRIVATE
          </span>
        </div>

        <h1 className="animate-fade-up-delay leading-none tracking-tight"
          style={{ fontFamily: 'Dosis, sans-serif', fontWeight: 800, fontSize: 'clamp(2.4rem,6vw,4.5rem)', color: '#F0F0F0', letterSpacing: '-0.02em' }}>
          Open any PDF.
          <span className="block" style={{ color: 'var(--accent)' }}>Instantly.</span>
        </h1>

        <p className="animate-fade-up-delay2 text-sm md:text-base max-w-md leading-relaxed"
          style={{ color: 'rgba(240,240,240,0.5)', fontFamily: 'Dosis, sans-serif', fontWeight: 400 }}>
          
        </p>

        <div className="animate-fade-up-delay3 flex flex-col sm:flex-row items-center gap-3 mt-1">
          <Link to="/tools" className="btn-primary flex items-center gap-2 px-6 py-3 text-sm" style={{ fontFamily: 'Dosis, sans-serif', fontWeight: 700 }}>
            Explore All Tools <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
          <Link to="/tools/compress"
            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-[10px] transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0F0F0', fontFamily: 'Dosis, sans-serif' }}>
            Try Compressor
          </Link>
        </div>

      </div>

      {/* Bottom strip */}
      <div className="relative z-10 flex items-center justify-center gap-8 mt-8 pt-6 px-5"
        style={{ borderTop: '1px solid rgba(146, 146, 146, 0.06)' }}>
        {[[Shield,'Files stay on your device'],[Zap,'Instant processing'],[Globe,'Works everywhere']].map(([Icon, text]) => (
          <div key={text as string} className="hidden sm:flex items-center gap-2">
            <Icon size={13} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 12, color: 'rgba(240,240,240,0.4)', fontFamily: 'Dosis, sans-serif' }}>{text as string}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
