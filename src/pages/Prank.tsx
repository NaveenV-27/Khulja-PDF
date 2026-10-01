import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Skull,
  Radio,
  FileWarning,
  Flame,
  ArrowLeft,
  Terminal,
  Volume2,
  VolumeX,
} from 'lucide-react'

export default function Prank() {
  const [countdown, setCountdown] = useState(15)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [logs, setLogs] = useState<string[]>([])

  // Mock terminal log stream
  useEffect(() => {
    const fakeEvents = [
      '⚡ [SYS_TRAP]: F12 / Inspect Element breached by rookie ninja...',
      '🔍 [SCANNING]: Searching user machine for sensitive intellectual property...',
      '⚠️ [RESULT]: Found 42 unopened browser tabs and a 3-year-old meme folder.',
      '📡 [DISPATCH]: Notifying your high school computer lab teacher right now...',
      '🚨 [STATUS]: Threat Level: Mild Embarrassment.',
      '🛡️ [TRUTH]: Bro, everything runs 100% in your browser. There is no server to hack! 😂',
    ]

    fakeEvents.forEach((text, i) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, text])
      }, (i + 1) * 650)
    })
  }, [])

  // Parody self-destruct countdown
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((c) => c - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  return (
    <div className="min-h-screen bg-[#030712] text-[#F3F4F6] flex items-center justify-center p-4 selection:bg-red-500 selection:text-white relative overflow-hidden font-sans">
      {/* Background Animated Hazard Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:24px_24px] opacity-15 animate-pulse pointer-events-none" />

      {/* Flashing Siren Ambient Aura */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/20 blur-[120px] rounded-full pointer-events-none animate-pulse" />

      <div className="max-w-2xl w-full border-2 border-red-500/40 rounded-3xl bg-[#090D1A]/90 backdrop-blur-2xl shadow-[0_0_60px_rgba(239,68,68,0.25)] p-6 md:p-8 relative z-10 text-center">
        {/* Top Floating Badge Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-red-500/20 text-xs font-mono text-red-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
            <span className="font-bold tracking-widest uppercase">
              BUREAU OF SUSPICIOUS CLICKS
            </span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1 hover:text-red-300 transition-colors cursor-pointer"
            title="Toggle siren vibes"
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{soundEnabled ? 'SIREN: BLARING' : 'SIREN: MUTED'}</span>
          </button>
        </div>

        {/* Big dramatic siren icon */}
        <div className="relative my-6 inline-block">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.35)] animate-bounce">
            <Skull size={44} />
          </div>
          <span className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
            CAUGHT 4K
          </span>
        </div>

        {/* Humorous Dramatic Headline */}
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
          WOAH THERE, MR. ROBOT! 🚨
        </h1>
        <p className="text-sm md:text-base text-gray-300 max-w-lg mx-auto leading-relaxed">
          Our high-tech sensors detected you opening DevTools like a seasoned hacker trying to steal the secret formula.
        </p>

        {/* Evidence Card (The Roast) */}
        <div className="my-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
          <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/20">
            <div className="flex items-center gap-2 text-red-400 font-mono text-xs mb-1">
              <FileWarning size={14} /> Offense
            </div>
            <p className="text-xs font-semibold text-gray-200">
              Aggressive Inspect Element abuse
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/20">
            <div className="flex items-center gap-2 text-yellow-400 font-mono text-xs mb-1">
              <Radio size={14} /> Loot Found
            </div>
            <p className="text-xs font-semibold text-gray-200">
              0 backend API keys (It's 100% client-side!)
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/20">
            <div className="flex items-center gap-2 text-sky-400 font-mono text-xs mb-1">
              <Flame size={14} /> Sentence
            </div>
            <p className="text-xs font-semibold text-gray-200">
              Mandatory tea break & staring our GitHub repo
            </p>
          </div>
        </div>

        {/* Fake Terminal Stream */}
        <div className="bg-[#02050B] rounded-2xl border border-gray-800 p-4 text-left font-mono text-xs mb-6 shadow-inner space-y-1.5 overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 border-b border-gray-900 pb-2 mb-2">
            <span className="flex items-center gap-1.5">
              <Terminal size={13} /> live_interception_log.sh
            </span>
            <span className="text-[10px] text-green-500">SYSTEM: UNBOTHERED</span>
          </div>

          {logs.map((log, index) => (
            <p key={index} className="text-gray-300 leading-relaxed font-mono">
              <span className="text-red-400 select-none">&gt;&gt;</span> {log}
            </p>
          ))}
        </div>

        {/* Mock Self-Destruct Notice */}
        <div className="mb-6 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs font-mono flex items-center justify-center gap-2">
          <span>⏳ Self-destruct sequence engaged in:</span>
          <span className="text-sm font-bold text-yellow-200 bg-yellow-950/80 px-2 py-0.5 rounded border border-yellow-500/40">
            {countdown > 0 ? `00:${countdown.toString().padStart(2, '0')}` : 'JUST KIDDING 😂'}
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-black font-bold text-sm shadow-[0_0_25px_rgba(56,189,248,0.35)] transition-all transform hover:scale-[1.02] active:scale-95"
          >
            <ArrowLeft size={16} /> I Promise I'll Be Good, Take Me Back
          </Link>

          <a
            href="https://github.com/ayushcmd/pdfkholo"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-700 bg-gray-900/60 hover:bg-gray-800 text-gray-300 font-semibold text-xs transition-colors"
          >
            View Real Source Code on GitHub
          </a>
        </div>

        <p className="text-[11px] text-gray-500 mt-5">
          Pro-tip: Close DevTools before navigating back, or you'll trigger the trap again! 😉
        </p>
      </div>
    </div>
  )
}