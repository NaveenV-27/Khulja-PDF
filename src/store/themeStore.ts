import { create } from 'zustand'

interface ThemeStore { isDark: boolean; toggle: () => void }

const apply = (dark: boolean) => {
  document.documentElement.classList.toggle('dark', dark)
  localStorage.setItem('pdfkholo-theme', dark ? 'dark' : 'light')
}

const getInitial = () => {
  const saved = localStorage.getItem('pdfkholo-theme')
  if (saved) return saved === 'dark'
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
