<p align="center">
  <img src="public/favicon.svg" width="72" height="72" alt="KhuljaDoc Logo" />
</p>

<h1 align="center">KhuljaDoc ⚡</h1>

<p align="center">
  <i>Koi bhi PDF, Abhi Khulja — Instant access. Zero upload.</i>
</p>

<p align="center">
  <a href="https://khulja-pdf.vercel.app/" target="_blank">Live Demo</a> •
  <a href="https://github.com/NaveenV-27/Khulja-PDF.git" target="_blank">Repository</a>
</p>

---

## Overview

KhuljaDoc is a futuristic, privacy-first PDF & image suite with a sky-blue glassmorphic design system. All 30+ tools run **100% in your browser** — your files never leave your device. No uploads, no accounts, no servers.

---

## ✨ Tools (30+)

| Category | Tools |
|---|---|
| **PDF** | PDF Editor, Compress PDF, Merge PDF, Split PDF, Rotate PDF, Watermark PDF, Redact PDF, Protect PDF, Unlock PDF |
| **Convert** | Image → PDF, PDF → Images, PDF → Word, PDF → Excel, DOCX → PDF |
| **Images** | Remove Background, Image Compress, Image Convert, Image Crop, Image Filters, Bulk Resize |
| **Sign & Fill** | Sign PDF, Fill PDF Form |
| **AI / OCR** | OCR PDF, ID Photo Generator, Passport Photo |
| **Utilities** | QR Tools (Generate + Scan), Resume Builder, Color Picker, Unit Converter |

---

## 🎨 Design System

- **Palette:** Sky-blue glassmorphic — light accent `#0284C7`, dark accent `#38BDF8`
- **Glass cards:** `backdrop-filter: blur(16px) saturate(180%)` with `cubic-bezier(0.16, 1, 0.3, 1)` transitions
- **Fonts:** Dosis (primary), JetBrains Mono (monospace)
- **Themes:** Light & dark modes with system preference detection; preference persisted in `localStorage`

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | React 19, TypeScript 5, Vite 8 |
| **Styling** | TailwindCSS 3, CSS custom properties |
| **State** | Zustand 5 |
| **PDF** | pdf-lib, pdfjs-dist, jsPDF |
| **Images** | @imgly/background-removal, tesseract.js, html2canvas |
| **Icons** | lucide-react |
| **Routing** | react-router-dom v7 |
| **Deployment** | Vercel |

---

## 🚀 Run Locally

```bash
git clone https://github.com/NaveenV-27/Khulja-PDF.git
cd Khulja-PDF
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Build & Deploy

```bash
npm run build   # Production build → dist/
npm run lint    # ESLint check
npm run preview # Preview production build locally
```

**Vercel settings (Vite defaults):**
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

---

## 🔒 Privacy

- All processing is client-side via WebAssembly
- Files never leave your device or touch any server
- No account, login, or sign-up required
- Works offline after initial load

---

<p align="center">Made with ❤️ — KhuljaDoc © 2026</p>
