import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Sun, Moon, Menu, X, LayoutGrid } from 'lucide-react'
import { useTheme } from '../../store/themeStore'
import logo from '../../assets/logo.svg'

export default function Navbar() {
  const { isDark, toggle } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => setMobileOpen(false), [location])

  const navBg = scrolled
    ? isDark ? 'rgba(15,15,15,0.92)' : 'rgba(250,250,250,0.92)'
    : 'transparent'

  return (
    <>
      <nav
        style={{
          background: navBg,
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          transition: 'all 0.3s ease',
        }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="PDFKholo" className="h-8 w-auto" />
          </Link>

          {/* Right */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div
            className="absolute top-16 left-4 right-4 rounded-2xl p-4 flex flex-col gap-1"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
          >
            <Link to="/tools" className="btn-primary flex justify-center items-center gap-2 py-3 text-sm w-full" style={{ fontFamily: 'Dosis, sans-serif', fontWeight: 700 }}>
              <LayoutGrid size={15} /> Dashboard
            </Link>
          </div>
        </div>
      )}
    </>
  )
}