import { useState, useRef, useCallback, useEffect } from 'react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import {
  Undo2, Redo2, Trash2, Download, ChevronLeft, ChevronRight,
  MousePointer, Type, ImageIcon, Link, ZoomIn, ZoomOut,
  AlignLeft, AlignCenter, AlignRight, Pen,
} from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner, SectionLabel, OptionRow } from '../../components/ui/index'
import { checkFileSize, isPdfPasswordError } from '../../lib/fileGuard'

// ─── Types ───────────────────────────────────────────────────────────────────
type ToolType   = 'select' | 'text' | 'image' | 'link' | 'draw'
type Align      = 'left' | 'center' | 'right'
type FilterType = 'none' | 'grayscale' | 'sepia' | 'blur' | 'brightness' | 'contrast'

interface BaseEl { id: string; x: number; y: number; page: number; rotation: number; elW: number; elH: number }

interface TextEl extends BaseEl { kind:'text'; text:string; fontSize:number; color:string; bold:boolean; italic:boolean; align:Align; opacity:number }
interface ImageEl extends BaseEl { kind:'image'; objectUrl:string; filter:FilterType; filterValue:number; opacity:number; isGif:boolean }
interface LinkEl  extends BaseEl { kind:'link';  url:string; label:string; color:string; fontSize:number }
interface DrawEl  extends BaseEl { kind:'draw';  points:string; color:string; strokeWidth:number; opacity:number }

type PdfElement = TextEl | ImageEl | LinkEl | DrawEl

// File objects stored OUTSIDE React state to avoid serialization issues
const imageFileStore = new Map<string, File>()

// ─── pdfjs singleton ─────────────────────────────────────────────────────────
let _pdfjs: any = null
async function getPdfjs() {
  if (_pdfjs) return _pdfjs
  const lib = await import('pdfjs-dist')
  lib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href
  _pdfjs = lib
  return lib
}
getPdfjs()

const uid = () => crypto.randomUUID()
const FILTER_CSS: Record<FilterType, (v:number) => string> = {
  none:()=>'', grayscale:v=>`grayscale(${v}%)`, sepia:v=>`sepia(${v}%)`,
  blur:v=>`blur(${v*0.05}px)`, brightness:v=>`brightness(${v/50})`, contrast:v=>`contrast(${v/50})`,
}

export default function PdfEditor() {
  // ── Refs (never cause re-renders) ─────────────────────────────────────────
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const svgRef        = useRef<SVGSVGElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const panelRef      = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<any>(null)
  const dragRef       = useRef<{id:string;sx:number;sy:number;ox:number;oy:number}|null>(null)
  const resizeRef     = useRef<{id:string;corner:string;sx:number;sy:number;ow:number;oh:number;ox:number;oy:number}|null>(null)

  // ── State ─────────────────────────────────────────────────────────────────
  const [rawBytes,   setRawBytes]   = useState<Uint8Array|null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [pageNum,    setPageNum]    = useState(1)
  const [rendering,  setRendering]  = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [fileName,   setFileName]   = useState('')
  const [zoom,       setZoom]       = useState(1)
  const [elements,   setElements]   = useState<PdfElement[]>([])
  const [history,    setHistory]    = useState<PdfElement[][]>([[]])
  const [histIdx,    setHistIdx]    = useState(0)
  const [selected,   setSelected]   = useState<string|null>(null)
  const [tool,       setTool]       = useState<ToolType>('select')

  // Text tool state
  const [textInput,   setTextInput]   = useState('Your text here')
  const [fontSize,    setFontSize]    = useState(20)
  const [textColor,   setTextColor]   = useState('#000000')
  const [bold,        setBold]        = useState(false)
  const [italic,      setItalic]      = useState(false)
  const [align,       setAlign]       = useState<Align>('left')
  const [textOpacity, setTextOpacity] = useState(100)

  // Image tool state
  const [imgFilter,    setImgFilter]    = useState<FilterType>('none')
  const [imgFilterVal, setImgFilterVal] = useState(50)
  const [imgOpacity,   setImgOpacity]   = useState(100)

  // Link tool state
  const [linkUrl,   setLinkUrl]   = useState('https://')
  const [linkLabel, setLinkLabel] = useState('Click here')
  const [linkColor, setLinkColor] = useState('#2563EB')

  // Draw tool state
  const [drawColor, setDrawColor] = useState('#F59E0B')
  const [drawWidth, setDrawWidth] = useState(3)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawPath,  setDrawPath]  = useState('')

  // ── History helpers ───────────────────────────────────────────────────────

  // Simpler, correct history push
  const push = (next: PdfElement[]) => {
    setElements(next)
    setHistory(prev => {
      const base = prev.slice(0, histIdx + 1).slice(-25)
      return [...base, next]
    })
    setHistIdx(prev => Math.min(prev + 1, 24))
  }

  const undo = () => {
    if (histIdx <= 0) return
    const idx = histIdx - 1
    setHistIdx(idx)
    setElements(history[idx] ?? [])
    setSelected(null)
  }

  const redo = () => {
    if (histIdx >= history.length - 1) return
    const idx = histIdx + 1
    setHistIdx(idx)
    setElements(history[idx] ?? [])
  }

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo() }
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [histIdx, history, selected, elements])

  const deleteSelected = () => {
    if (!selected) return
    const el = elements.find(e => e.id === selected)
    if (el?.kind === 'image') {
      URL.revokeObjectURL((el as ImageEl).objectUrl)
      imageFileStore.delete(el.id)
    }
    push(elements.filter(e => e.id !== selected))
    setSelected(null)
  }

  // ── PDF rendering ─────────────────────────────────────────────────────────
  const renderPage = useCallback(async (bytes: Uint8Array, page: number, z: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Cancel previous render
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel() } catch {}
      renderTaskRef.current = null
    }
    setRendering(true)
    try {
      const lib = await getPdfjs()
      const doc  = await lib.getDocument({ data: bytes.slice(0) }).promise
      const pg   = await doc.getPage(page)
      const scale = Math.min(z, 2) // never exceed 2x scale on canvas
      const vp   = pg.getViewport({ scale })
      canvas.width  = Math.floor(vp.width)
      canvas.height = Math.floor(vp.height)
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const task = (pg.render as any)({ canvasContext: ctx, viewport: vp })
      renderTaskRef.current = task
      await task.promise
      renderTaskRef.current = null
    } catch (e: any) {
      if (e?.name !== 'RenderingCancelledException') console.warn('render:', e)
    } finally {
      setRendering(false)
    }
  }, [])

  useEffect(() => {
    if (rawBytes) renderPage(rawBytes, pageNum, zoom)
  }, [rawBytes, pageNum, zoom])

  // Ctrl+scroll zoom
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      setZoom(z => parseFloat(Math.min(3, Math.max(0.3, z + (e.deltaY > 0 ? -0.1 : 0.1))).toFixed(2)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── File load ─────────────────────────────────────────────────────────────
  const handleFile = async (files: File[]) => {
    const f = files[0]
    const err = checkFileSize(f)
    if (err) { setError(err); return }
    setLoading(true); setError('')
    try {
      const buf   = await f.arrayBuffer()
      const bytes = new Uint8Array(buf)
      const doc   = await PDFDocument.load(bytes)
      // Clear old image URLs
      elements.forEach(el => {
        if (el.kind === 'image') { URL.revokeObjectURL((el as ImageEl).objectUrl); imageFileStore.delete(el.id) }
      })
      setElements([]); setHistory([[]]); setHistIdx(0); setSelected(null)
      setFileName(f.name); setPageNum(1); setTotalPages(doc.getPageCount())
      setTimeout(() => setRawBytes(bytes), 50)
    } catch (e) {
      setError(isPdfPasswordError(e) ? 'PDF is password-protected.' : 'Could not load PDF.')
    } finally { setLoading(false) }
  }

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleImageFile = (files: File[]) => {
    const f = files[0]
    if (!f) return
    const objectUrl = URL.createObjectURL(f)
    const img = new Image()
    img.onerror = () => { URL.revokeObjectURL(objectUrl); setError('Could not decode image.') }
    img.onload = () => {
      const ratio = img.naturalWidth > 0 ? img.naturalWidth / img.naturalHeight : 1
      const id    = uid()
      const elW   = 0.4
      const elH   = elW / ratio
      const newEl: ImageEl = {
        id, kind: 'image', objectUrl,
        x: 0.1, y: 0.1, page: pageNum, rotation: 0,
        elW, elH, filter: imgFilter, filterValue: imgFilterVal,
        opacity: imgOpacity, isGif: f.type === 'image/gif',
      }
      // Store File outside React state
      imageFileStore.set(id, f)
      push([...elements, newEl])
    }
    img.src = objectUrl
  }

  // ── Coordinate helper ─────────────────────────────────────────────────────
  const getFrac = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }

  // ── Place element on click ────────────────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool === 'select' || tool === 'draw' || tool === 'image') return
    const { x, y } = getFrac(e)
    const base = { id: uid(), x, y, page: pageNum, rotation: 0 }
    if (tool === 'text') {
      push([...elements, { ...base, kind:'text', text:textInput, fontSize, color:textColor, bold, italic, align, opacity:textOpacity, elW:0.35, elH:0.06 } as TextEl])
    } else if (tool === 'link') {
      push([...elements, { ...base, kind:'link', url:linkUrl, label:linkLabel, color:linkColor, fontSize:14, elW:0.25, elH:0.05 } as LinkEl])
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  const onDrawStart = (e: React.MouseEvent) => {
    if (tool !== 'draw') return
    const { x, y } = getFrac(e)
    setIsDrawing(true)
    setDrawPath(`M ${x*100} ${y*100}`)
  }
  const onDrawMove = (e: React.MouseEvent) => {
    if (!isDrawing || tool !== 'draw') return
    const { x, y } = getFrac(e)
    setDrawPath(p => p + ` L ${x*100} ${y*100}`)
  }
  const onDrawEnd = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (drawPath.length > 10) {
      push([...elements, { id:uid(), x:0, y:0, page:pageNum, rotation:0, elW:1, elH:1, kind:'draw', points:drawPath, color:drawColor, strokeWidth:drawWidth, opacity:100 } as DrawEl])
    }
    setDrawPath('')
  }

  // ── Drag to move ──────────────────────────────────────────────────────────
  const onElMouseDown = (e: React.MouseEvent, id: string) => {
    if (tool !== 'select') return
    e.stopPropagation(); e.preventDefault()
    const el = elements.find(el => el.id === id)
    if (!el) return
    dragRef.current = { id, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y }
    setSelected(id)
  }

  // ── Resize handle ─────────────────────────────────────────────────────────
  const onResizeDown = (e: React.MouseEvent, id: string, corner: string) => {
    e.stopPropagation(); e.preventDefault()
    const el = elements.find(el => el.id === id)
    if (!el) return
    resizeRef.current = { id, corner, sx: e.clientX, sy: e.clientY, ow: el.elW, oh: el.elH, ox: el.x, oy: el.y }
  }

  // ── Mouse move ────────────────────────────────────────────────────────────
  const onMouseMove = (e: React.MouseEvent) => {
    if (isDrawing && tool === 'draw') { onDrawMove(e); return }
    const c = containerRef.current
    if (!c) return
    const { width: cw, height: ch } = c.getBoundingClientRect()

    if (resizeRef.current) {
      const { id, corner, sx, sy, ow, oh, ox, oy } = resizeRef.current
      const dx = (e.clientX - sx) / cw
      const dy = (e.clientY - sy) / ch
      const nw = Math.max(0.05, ow + (corner.includes('e') ? dx : corner.includes('w') ? -dx : 0))
      const nh = Math.max(0.03, oh + (corner.includes('s') ? dy : corner.includes('n') ? -dy : 0))
      const nx = Math.max(0, ox + (corner.includes('w') ? ow - nw : 0))
      const ny = Math.max(0, oy + (corner.includes('n') ? oh - nh : 0))
      setElements(prev => prev.map(el => el.id === id ? { ...el, elW: nw, elH: nh, x: nx, y: ny } : el))
      return
    }

    if (dragRef.current) {
      const { id, sx, sy, ox, oy } = dragRef.current
      const nx = Math.max(0, Math.min(0.95, ox + (e.clientX - sx) / cw))
      const ny = Math.max(0, Math.min(0.95, oy + (e.clientY - sy) / ch))
      setElements(prev => prev.map(el => el.id === id ? { ...el, x: nx, y: ny } : el))
    }
  }

  const onMouseUp = () => {
    if (resizeRef.current || dragRef.current) {
      // Commit current elements to history once on release
      push([...elements])
    }
    resizeRef.current = null
    dragRef.current   = null
    onDrawEnd()
  }

  // ── Update selected element ───────────────────────────────────────────────
  const updateEl = (id: string, patch: Partial<PdfElement>) => {
    push(elements.map(el => el.id === id ? { ...el, ...patch } : el) as PdfElement[])
  }

  const selectedEl = elements.find(e => e.id === selected) ?? null
  const pageEls    = elements.filter(e => e.page === pageNum)

  // ── Export ────────────────────────────────────────────────────────────────
  const exportPdf = async () => {
    if (!rawBytes) return
    setLoading(true)
    try {
      const doc   = await PDFDocument.load(rawBytes.slice(0))
      const pages = doc.getPages()
      const font  = await doc.embedFont(StandardFonts.Helvetica)
      const fontB = await doc.embedFont(StandardFonts.HelveticaBold)

      for (const el of elements) {
        const pg = pages[el.page - 1]; if (!pg) continue
        const { width: pgW, height: pgH } = pg.getSize()

        if (el.kind === 'text') {
          const [r,g,b] = [el.color.slice(1,3),el.color.slice(3,5),el.color.slice(5,7)].map(h=>parseInt(h,16)/255)
          pg.drawText(el.text, { x:el.x*pgW, y:pgH-el.y*pgH-el.fontSize, size:el.fontSize, font:el.bold?fontB:font, color:rgb(r,g,b), opacity:el.opacity/100 })
        }
        if (el.kind === 'link') {
          const [r,g,b] = [el.color.slice(1,3),el.color.slice(3,5),el.color.slice(5,7)].map(h=>parseInt(h,16)/255)
          pg.drawText(el.label, { x:el.x*pgW, y:pgH-el.y*pgH-el.fontSize, size:el.fontSize, font, color:rgb(r,g,b) })
        }
        if (el.kind === 'image' && !el.isGif) {
          try {
            const file = imageFileStore.get(el.id)
            if (!file) continue
            const buf   = await file.arrayBuffer()
            const bytes = new Uint8Array(buf)
            const isPng = file.type === 'image/png'
            const emb   = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
            pg.drawImage(emb, { x:el.x*pgW, y:pgH-el.y*pgH-el.elH*pgH, width:el.elW*pgW, height:el.elH*pgH, opacity:el.opacity/100 })
          } catch {}
        }
      }

      const out  = await doc.save()
      const blob = new Blob([out as any], { type:'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a'); a.href=url; a.download=fileName.replace('.pdf','_edited.pdf'); a.click()
      URL.revokeObjectURL(url)
    } catch { setError('Export failed.') }
    finally { setLoading(false) }
  }

  // ── Resize handle UI ──────────────────────────────────────────────────────
  const corners = ['nw','n','ne','e','se','s','sw','w']
  const cornerStyle = (c: string): React.CSSProperties => ({
    position:'absolute', width:10, height:10,
    background:'white', border:'2px solid var(--accent)', borderRadius:2, zIndex:30,
    ...(c==='nw'?{top:-5,left:-5,cursor:'nw-resize'}:c==='n'?{top:-5,left:'calc(50% - 5px)',cursor:'n-resize'}:
        c==='ne'?{top:-5,right:-5,cursor:'ne-resize'}:c==='e'?{top:'calc(50% - 5px)',right:-5,cursor:'e-resize'}:
        c==='se'?{bottom:-5,right:-5,cursor:'se-resize'}:c==='s'?{bottom:-5,left:'calc(50% - 5px)',cursor:'s-resize'}:
        c==='sw'?{bottom:-5,left:-5,cursor:'sw-resize'}:{top:'calc(50% - 5px)',left:-5,cursor:'w-resize'}),
  })

  const ResizeHandles = ({ id }: { id: string }) => (
    <>{corners.map(c => <div key={c} style={cornerStyle(c)} onMouseDown={e => onResizeDown(e, id, c)} />)}</>
  )

  // ── Tool button ───────────────────────────────────────────────────────────
  const toolBtn = (t: ToolType, icon: React.ReactNode, label: string) => (
    <button onClick={() => setTool(t)}
      className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-xs transition-all flex-1"
      style={{ fontFamily:'Dosis,sans-serif', fontSize:9, fontWeight:600,
        background: tool===t?'var(--accent)':'var(--bg-card)',
        color: tool===t?'#fff':'var(--text-2)',
        border:`1px solid ${tool===t?'var(--accent)':'var(--border)'}` }}>
      {icon}{label}
    </button>
  )

  const cursorMap: Record<ToolType,string> = { select:'default', text:'text', image:'copy', link:'pointer', draw:'crosshair' }

  // ── Options panel ─────────────────────────────────────────────────────────
  const options = (
    <div className="flex flex-col gap-3">
      <div>
        <SectionLabel>Tool</SectionLabel>
        <div className="flex gap-1.5 mb-1">
          {toolBtn('select',<MousePointer size={13}/>,'Select')}
          {toolBtn('text',  <Type size={13}/>,'Text')}
          {toolBtn('image', <ImageIcon size={13}/>,'Image')}
        </div>
        <div className="flex gap-1.5">
          {toolBtn('link',<Link size={13}/>,'Link')}
          {toolBtn('draw',<Pen size={13}/>,'Draw')}
        </div>
      </div>

      {tool==='text' && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Text</SectionLabel>
          <textarea value={textInput} onChange={e=>setTextInput(e.target.value)} rows={2}
            className="w-full px-2.5 py-2 rounded-lg text-xs outline-none resize-none"
            style={{ background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text)', fontFamily:'Dosis' }}
            onFocus={e=>e.target.style.borderColor='var(--accent)'}
            onBlur={e=>e.target.style.borderColor='var(--border)'} />
          <div className="flex gap-1.5">
            {[['B',()=>setBold(!bold),bold],['I',()=>setItalic(!italic),italic]].map(([l,fn,on]:any)=>(
              <button key={l} onClick={fn} className="flex-1 py-1.5 rounded-lg text-xs transition-all flex items-center justify-center"
                style={{ fontWeight:700, fontStyle:l==='I'?'italic':'normal', background:on?'var(--accent-dim)':'var(--bg-card)', color:on?'var(--accent)':'var(--text-3)', border:`1px solid ${on?'var(--accent)':'var(--border)'}` }}>{l}</button>
            ))}
            {(['left','center','right'] as Align[]).map((a,i)=>(
              <button key={a} onClick={()=>setAlign(a)} className="flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center"
                style={{ background:align===a?'var(--accent-dim)':'var(--bg-card)', color:align===a?'var(--accent)':'var(--text-3)', border:`1px solid ${align===a?'var(--accent)':'var(--border)'}` }}>
                {i===0?<AlignLeft size={12}/>:i===1?<AlignCenter size={12}/>:<AlignRight size={12}/>}
              </button>
            ))}
          </div>
          <OptionRow label={`Size: ${fontSize}pt`}><input type="range" min={8} max={96} value={fontSize} onChange={e=>setFontSize(+e.target.value)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>
          <OptionRow label="Color"><input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)} className="w-full h-8 rounded-lg cursor-pointer" style={{border:'1px solid var(--border)'}}/></OptionRow>
          <OptionRow label={`Opacity: ${textOpacity}%`}><input type="range" min={10} max={100} value={textOpacity} onChange={e=>setTextOpacity(+e.target.value)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>
        </div>
      )}

      {tool==='image' && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Add Image / GIF</SectionLabel>
          <FileDropzone accept="image/*" onFiles={handleImageFile} label="Drop image or GIF" sublabel="PNG, JPG, WEBP, GIF" />
          <SectionLabel>Filter</SectionLabel>
          <div className="grid grid-cols-3 gap-1">
            {(['none','grayscale','sepia','blur','brightness','contrast'] as FilterType[]).map(f=>(
              <button key={f} onClick={()=>setImgFilter(f)} className="py-1.5 rounded-lg text-xs capitalize transition-all"
                style={{ fontFamily:'Dosis,sans-serif', fontSize:10, fontWeight:600, background:imgFilter===f?'var(--accent)':'var(--bg-card)', color:imgFilter===f?'#fff':'var(--text-3)', border:`1px solid ${imgFilter===f?'var(--accent)':'var(--border)'}` }}>{f}</button>
            ))}
          </div>
          {imgFilter!=='none' && <OptionRow label={`Intensity: ${imgFilterVal}%`}><input type="range" min={0} max={100} value={imgFilterVal} onChange={e=>setImgFilterVal(+e.target.value)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>}
          <OptionRow label={`Opacity: ${imgOpacity}%`}><input type="range" min={10} max={100} value={imgOpacity} onChange={e=>setImgOpacity(+e.target.value)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>
        </div>
      )}

      {tool==='link' && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Hyperlink</SectionLabel>
          <OptionRow label="Label"><input value={linkLabel} onChange={e=>setLinkLabel(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text)'}}/></OptionRow>
          <OptionRow label="URL"><input value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none font-mono" style={{background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text)'}}/></OptionRow>
          <OptionRow label="Color"><input type="color" value={linkColor} onChange={e=>setLinkColor(e.target.value)} className="w-full h-8 rounded-lg cursor-pointer" style={{border:'1px solid var(--border)'}}/></OptionRow>
        </div>
      )}

      {tool==='draw' && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Freehand Draw</SectionLabel>
          <OptionRow label="Color"><input type="color" value={drawColor} onChange={e=>setDrawColor(e.target.value)} className="w-full h-8 rounded-lg cursor-pointer" style={{border:'1px solid var(--border)'}}/></OptionRow>
          <OptionRow label={`Stroke: ${drawWidth}px`}><input type="range" min={1} max={20} value={drawWidth} onChange={e=>setDrawWidth(+e.target.value)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>
        </div>
      )}

      {selectedEl && tool==='select' && (
        <div className="flex flex-col gap-2 pt-2" style={{borderTop:'1px solid var(--border)'}}>
          <SectionLabel>Selected: {selectedEl.kind}</SectionLabel>

          {selectedEl.kind==='text' && (<>
            <textarea value={selectedEl.text} onChange={e=>updateEl(selected!,{text:e.target.value} as any)} rows={2}
              className="w-full px-2.5 py-2 rounded-lg text-xs outline-none resize-none"
              style={{background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text)'}}/>
            <OptionRow label={`Font: ${selectedEl.fontSize}pt`}><input type="range" min={8} max={96} value={selectedEl.fontSize} onChange={e=>updateEl(selected!,{fontSize:+e.target.value} as any)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>
            <OptionRow label={`Width: ${Math.round(selectedEl.elW*100)}%`}><input type="range" min={5} max={100} value={Math.round(selectedEl.elW*100)} onChange={e=>updateEl(selected!,{elW:+e.target.value/100} as any)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>
            <OptionRow label="Color"><input type="color" value={selectedEl.color} onChange={e=>updateEl(selected!,{color:e.target.value} as any)} className="w-full h-8 rounded-lg cursor-pointer" style={{border:'1px solid var(--border)'}}/></OptionRow>
            <OptionRow label={`Opacity: ${selectedEl.opacity}%`}><input type="range" min={10} max={100} value={selectedEl.opacity} onChange={e=>updateEl(selected!,{opacity:+e.target.value} as any)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>
          </>)}

          {selectedEl.kind==='image' && (<>
            <OptionRow label={`Width: ${Math.round(selectedEl.elW*100)}%`}><input type="range" min={5} max={100} value={Math.round(selectedEl.elW*100)} onChange={e=>updateEl(selected!,{elW:+e.target.value/100} as any)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>
            <OptionRow label={`Height: ${Math.round(selectedEl.elH*100)}%`}><input type="range" min={3} max={100} value={Math.round(selectedEl.elH*100)} onChange={e=>updateEl(selected!,{elH:+e.target.value/100} as any)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>
            <SectionLabel>Filter</SectionLabel>
            <div className="grid grid-cols-3 gap-1">
              {(['none','grayscale','sepia','blur','brightness','contrast'] as FilterType[]).map(f=>(
                <button key={f} onClick={()=>updateEl(selected!,{filter:f} as any)} className="py-1 rounded-lg capitalize transition-all"
                  style={{fontSize:9,fontWeight:600,fontFamily:'Dosis,sans-serif',background:selectedEl.filter===f?'var(--accent)':'var(--bg-card)',color:selectedEl.filter===f?'#fff':'var(--text-3)',border:`1px solid ${selectedEl.filter===f?'var(--accent)':'var(--border)'}`}}>{f}</button>
              ))}
            </div>
            {selectedEl.filter!=='none' && <OptionRow label={`Intensity: ${selectedEl.filterValue}%`}><input type="range" min={0} max={100} value={selectedEl.filterValue} onChange={e=>updateEl(selected!,{filterValue:+e.target.value} as any)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>}
            <OptionRow label={`Opacity: ${selectedEl.opacity}%`}><input type="range" min={10} max={100} value={selectedEl.opacity} onChange={e=>updateEl(selected!,{opacity:+e.target.value} as any)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>
          </>)}

          {selectedEl.kind==='link' && (<>
            <OptionRow label="Label"><input value={selectedEl.label} onChange={e=>updateEl(selected!,{label:e.target.value} as any)} className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text)'}}/></OptionRow>
            <OptionRow label="URL"><input value={selectedEl.url} onChange={e=>updateEl(selected!,{url:e.target.value} as any)} className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none font-mono" style={{background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text)'}}/></OptionRow>
            <OptionRow label={`Size: ${selectedEl.fontSize}pt`}><input type="range" min={8} max={72} value={selectedEl.fontSize} onChange={e=>updateEl(selected!,{fontSize:+e.target.value} as any)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>
            <OptionRow label="Color"><input type="color" value={selectedEl.color} onChange={e=>updateEl(selected!,{color:e.target.value} as any)} className="w-full h-8 rounded-lg cursor-pointer" style={{border:'1px solid var(--border)'}}/></OptionRow>
          </>)}

          {selectedEl.kind==='draw' && (<>
            <OptionRow label="Color"><input type="color" value={selectedEl.color} onChange={e=>updateEl(selected!,{color:e.target.value} as any)} className="w-full h-8 rounded-lg cursor-pointer" style={{border:'1px solid var(--border)'}}/></OptionRow>
            <OptionRow label={`Stroke: ${selectedEl.strokeWidth}px`}><input type="range" min={1} max={20} value={selectedEl.strokeWidth} onChange={e=>updateEl(selected!,{strokeWidth:+e.target.value} as any)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>
            <OptionRow label={`Opacity: ${selectedEl.opacity}%`}><input type="range" min={10} max={100} value={selectedEl.opacity} onChange={e=>updateEl(selected!,{opacity:+e.target.value} as any)} className="w-full" style={{accentColor:'var(--accent)'}}/></OptionRow>
          </>)}

          <button onClick={deleteSelected}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium mt-1"
            style={{background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.25)',color:'#FBBF24',fontFamily:'Dosis,sans-serif'}}>
            <Trash2 size={12}/> Delete (Del key)
          </button>
        </div>
      )}
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ToolShell title="PDF Editor" subtitle="Add text, images, GIFs, links, drawings and filters" slug="pdf-editor" options={options}>
      <div className="flex flex-col gap-3" style={{height:'100%'}}>
        {!rawBytes ? (
          <>
            <FileDropzone accept=".pdf,application/pdf" onFiles={handleFile} label="Drop a PDF to edit" sublabel="Max 50 MB"/>
            {loading && <div className="flex items-center gap-3"><Spinner/><span className="text-sm" style={{color:'var(--text-2)'}}>Loading PDF…</span></div>}
            {error   && <Alert type="error" message={error} onClose={()=>setError('')}/>}
          </>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button onClick={undo} disabled={histIdx<=0} className="btn-ghost flex items-center gap-1 px-2.5 py-1.5 text-xs"><Undo2 size={12}/> Undo</button>
              <button onClick={redo} disabled={histIdx>=history.length-1} className="btn-ghost flex items-center gap-1 px-2.5 py-1.5 text-xs"><Redo2 size={12}/> Redo</button>
              <span className="text-xs ml-1" style={{color:'var(--text-3)'}}>{elements.length} el</span>
              <div className="flex items-center gap-1 ml-auto">
                <button onClick={()=>setZoom(z=>parseFloat(Math.max(0.3,z-0.1).toFixed(2)))} className="btn-ghost w-7 h-7 flex items-center justify-center p-0"><ZoomOut size={13}/></button>
                <span className="text-xs font-mono px-1" style={{color:'var(--text-2)',minWidth:36,textAlign:'center'}}>{Math.round(zoom*100)}%</span>
                <button onClick={()=>setZoom(z=>parseFloat(Math.min(3,z+0.1).toFixed(2)))} className="btn-ghost w-7 h-7 flex items-center justify-center p-0"><ZoomIn size={13}/></button>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={()=>setPageNum(n=>Math.max(1,n-1))} disabled={pageNum<=1} className="btn-ghost w-7 h-7 flex items-center justify-center p-0"><ChevronLeft size={13}/></button>
                <span className="text-xs font-mono px-1" style={{color:'var(--text-2)',minWidth:48,textAlign:'center'}}>{pageNum}/{totalPages}</span>
                <button onClick={()=>setPageNum(n=>Math.min(totalPages,n+1))} disabled={pageNum>=totalPages} className="btn-ghost w-7 h-7 flex items-center justify-center p-0"><ChevronRight size={13}/></button>
              </div>
              <button onClick={exportPdf} disabled={loading} className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs">
                {loading?<Spinner/>:<Download size={12}/>} Download
              </button>
            </div>

            {error && <Alert type="error" message={error} onClose={()=>setError('')}/>}

            {/* PDF panel */}
            <div ref={panelRef}
              className="rounded-2xl select-none flex-1"
              style={{background:'#2a2a2a',border:'1px solid var(--border)',overflow:'auto',minHeight:0,cursor:cursorMap[tool]}}
            >
            <div ref={panelRef}
              className="rounded-2xl select-none flex-1"
              style={{background:'#2a2a2a', border:'1px solid var(--border)', overflow:'auto', minHeight:0, cursor:cursorMap[tool]}}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
             onMouseLeave={onMouseUp}
              ></div>
              <div style={{minWidth:'100%',minHeight:'100%',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:24,boxSizing:'border-box'}}>
                <div ref={containerRef}
                  className="relative"
                  style={{transformOrigin:'top center',transform:`scale(${zoom})`,transformBox:'fill-box',flexShrink:0,boxShadow:'0 8px 40px rgba(0,0,0,0.6)',borderRadius:4}}
                  onClick={handleCanvasClick}
                  onMouseDown={onDrawStart}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                >
                  {rendering && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center rounded" style={{background:'rgba(0,0,0,0.5)'}}>
                      <Spinner size="lg"/>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="block" style={{borderRadius:2}}/>

                  {/* SVG draw layer */}
                  <svg ref={svgRef} className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{pointerEvents:'none',zIndex:5}}>
                    {pageEls.filter(e=>e.kind==='draw').map(e=>{
                      const d=e as DrawEl
                      return <path key={d.id} d={d.points} stroke={d.color} strokeWidth={d.strokeWidth*0.15} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={d.opacity/100}/>
                    })}
                    {isDrawing&&drawPath&&<path d={drawPath} stroke={drawColor} strokeWidth={drawWidth*0.15} fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
                  </svg>

                  {/* HTML overlay */}
                  {pageEls.filter(e=>e.kind!=='draw').map(el=>{
                    const isSel = selected===el.id
                    const sel: React.CSSProperties = isSel?{outline:'2px dashed var(--accent)',outlineOffset:2}:{}

                    if (el.kind==='text') {
                      const t=el as TextEl
                      return (
                        <div key={t.id} onClick={e=>{e.stopPropagation();setSelected(t.id);setTool('select')}} onMouseDown={e=>onElMouseDown(e,t.id)}
                          style={{position:'absolute',left:`${t.x*100}%`,top:`${t.y*100}%`,width:`${t.elW*100}%`,
                            fontSize:t.fontSize*0.7,color:t.color,opacity:t.opacity/100,
                            fontWeight:t.bold?700:400,fontStyle:t.italic?'italic':'normal',textAlign:t.align,
                            fontFamily:'Dosis,sans-serif',whiteSpace:'pre-wrap',
                            cursor:tool==='select'?'move':'pointer',userSelect:'none',padding:'1px 3px',zIndex:10,...sel}}>
                          {t.text}
                          {isSel&&<ResizeHandles id={t.id}/>}
                        </div>
                      )
                    }

                    if (el.kind==='image') {
                      const im=el as ImageEl
                      const fc=im.filter!=='none'?FILTER_CSS[im.filter](im.filterValue):''
                      return (
                        <div key={im.id} onClick={e=>{e.stopPropagation();setSelected(im.id);setTool('select')}} onMouseDown={e=>onElMouseDown(e,im.id)}
                          style={{position:'absolute',left:`${im.x*100}%`,top:`${im.y*100}%`,
                            width:`${im.elW*100}%`,height:`${im.elH*100}%`,
                            cursor:tool==='select'?'move':'pointer',zIndex:10,opacity:im.opacity/100,...sel}}>
                          <img src={im.objectUrl} alt="" style={{width:'100%',height:'100%',objectFit:'fill',filter:fc,display:'block'}}/>
                          {isSel&&<ResizeHandles id={im.id}/>}
                        </div>
                      )
                    }

                    if (el.kind==='link') {
                      const lk=el as LinkEl
                      return (
                        <div key={lk.id} onClick={e=>{e.stopPropagation();setSelected(lk.id);setTool('select')}}
                                         onDoubleClick={e=>{e.stopPropagation(); if(lk.url) window.open(lk.url,'_blank')}} onMouseDown={e=>onElMouseDown(e,lk.id)}
                          style={{position:'absolute',left:`${lk.x*100}%`,top:`${lk.y*100}%`,
                            fontSize:lk.fontSize*0.7,color:lk.color,cursor:tool==='select'?'move':'pointer',
                            fontFamily:'Dosis,sans-serif',textDecoration:'underline',userSelect:'none',zIndex:10,...sel}}>
                          🔗 {lk.label}
                          {isSel&&<ResizeHandles id={lk.id}/>}
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-2 h-2 rounded-full" style={{background:'var(--accent)'}}/>
              <p className="text-xs" style={{color:'var(--text-3)'}}>
                {tool==='select'&&'Click to select · drag to move · double-click link to open · Del to delete'}
                {tool==='text'  &&'Click PDF to place text'}
                {tool==='image' &&'Drop image in panel → drag to reposition → corner handles to resize'}
                {tool==='link'  &&'Click PDF to place link'}
                {tool==='draw'  &&'Click and drag to draw'}
              </p>
              <span className="ml-auto text-xs" style={{color:'var(--text-3)'}}>Ctrl+Scroll = zoom</span>
            </div>
          </>
        )}
      </div>
    </ToolShell>
  )
}