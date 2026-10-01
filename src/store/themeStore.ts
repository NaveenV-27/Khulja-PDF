import { create } from 'zustand'

interface ThemeStore { isDark: boolean; toggle: () => void }

const NEW_KEY = 'khuljadoc-theme'
const OLD_KEY = 'pdfkholo-theme'

const apply = (dark: boolean) => {
  document.documentElement.classList.toggle('dark', dark)
  localStorage.setItem(NEW_KEY, dark ? 'dark' : 'light')
}

const getInitial = () => {
  // Try new key first
  const saved = localStorage.getItem(NEW_KEY)
  if (saved) return saved === 'dark'

  // Fallback to old key for existing users
  const legacy = localStorage.getItem(OLD_KEY)
  if (legacy) {
    // Migrate to new key
    localStorage.setItem(NEW_KEY, legacy)
    return legacy === 'dark'
  }

  // Default to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const useTheme = create<ThemeStore>((set) => {
  const isDark = getInitial()
  apply(isDark)
  return {
    isDark,
    toggle: () => set(s => { const n = !s.isDark; apply(n); return { isDark: n } }),
  }
})
