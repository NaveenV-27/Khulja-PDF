import { ShieldCheck, Zap, WifiOff, Smartphone } from 'lucide-react'


const features = [
  { Icon: ShieldCheck, title: 'Privacy Guaranteed', desc: 'Your files are processed entirely in your browser using WebAssembly. Nothing is ever uploaded to any server.', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  { Icon: Zap,         title: 'Blazing Fast',       desc: 'All operations run client-side with native speed. No waiting for server round-trips or queues.',               color: '#FBBF24', bg: 'rgba(251,191,36,0.1)'  },
  { Icon: WifiOff,     title: 'Works Offline',      desc: 'Once loaded, PdfKholo works without internet. Perfect for sensitive documents on air-gapped machines.',        color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  { Icon: Smartphone,  title: 'Mobile Ready',       desc: 'Fully responsive on all devices. Available as an Android app from the Play Store — coming soon.',             color: '#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
]

export default function FeaturesStrip() {
  return (
    <section className="py-20 px-5 md:px-8" style={{ background: 'var(--bg-2)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}>Why PdfKholo</span>
          <h2 className="text-3xl md:text-4xl font-display font-800 mt-2 tracking-tight"
            style={{ fontFamily: 'Dosis, sans-serif', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Built different.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ Icon, title, desc, color, bg }) => (
            <div key={title} className="card-glass rounded-2xl p-6 flex flex-col gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={20} style={{ color }} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1.5" style={{ fontFamily: 'Dosis, sans-serif', color: 'var(--text)' }}>{title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
