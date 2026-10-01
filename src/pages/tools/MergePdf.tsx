import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import {
  DndContext, closestCenter,
  DragOverlay, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { Active, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, Download, Plus } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import FileDropzone from '../../components/ui/FileDropzone'
import { Alert, Spinner } from '../../components/ui/index'
import { checkFileSizes, formatBytes, isPdfPasswordError } from '../../lib/fileGuard'

interface PdfFile { id: string; file: File }

function FileRow({
  item, index, onRemove, isDragOverlay = false,
}: {
  item: PdfFile; index: number; onRemove?: () => void; isDragOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !isDragOverlay ? 0.3 : 1,
        boxShadow: isDragOverlay ? '0 8px 32px rgba(0,0,0,0.4)' : undefined,
      }}
      className="file-item"
    >
      {/* Drag handle */}
      <div
        {...attributes} {...listeners}
        style={{ color: 'var(--text-3)', cursor: isDragOverlay ? 'grabbing' : 'grab', touchAction: 'none' }}
      >
        <GripVertical size={16} />
      </div>

      {/* Order badge */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'Dosis, sans-serif', fontSize: 10 }}
      >
        {index + 1}
      </div>

      {/* PDF icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}
      >
        PDF
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>
          {item.file.name}
        </p>
        <p className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{formatBytes(item.file.size)}</p>
      </div>

      {onRemove && (
        <button
          onClick={onRemove}
          className="w-6 h-6 flex items-center justify-center rounded-lg transition-all shrink-0"
          style={{ color: 'var(--text-3)', background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#FBBF24')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}

export default function Merge() {
  const [files, setFiles] = useState<PdfFile[]>([])
  const [activeItem, setActiveItem] = useState<Active | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const addFiles = (incoming: File[]) => {
    const err = checkFileSizes(incoming)
    if (err) { setError(err); return }
    setError(''); setDone(false)
    setFiles(prev => [
      ...prev,
      ...incoming.map(f => ({ id: `${f.name}-${Date.now()}-${Math.random()}`, file: f })),
    ])
  }

  const handleDragStart = (e: DragStartEvent) => setActiveItem(e.active)

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveItem(null)
    const { active, over } = e
    if (over && active.id !== over.id) {
      setFiles(prev => {
        const oldIdx = prev.findIndex(f => f.id === active.id)
        const newIdx = prev.findIndex(f => f.id === over.id)
        return arrayMove(prev, oldIdx, newIdx)
      })
    }
  }

  const merge = async () => {
    if (files.length < 2) { setError('Add at least 2 PDF files to merge.'); return }
    setLoading(true); setError(''); setDone(false)
    try {
      const merged = await PDFDocument.create()
      for (const item of files) {
        const buf = await item.file.arrayBuffer()
        const doc = await PDFDocument.load(buf)
        const pages = await merged.copyPages(doc, doc.getPageIndices())
        pages.forEach(p => merged.addPage(p))
      }
      const bytes = await merged.save()
      const blob = new Blob([bytes as any], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'merged.pdf'; a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (e) {
      setError(isPdfPasswordError(e) ? 'One or more PDFs are password-protected.' : 'Merge failed. Ensure all files are valid PDFs.')
    } finally {
      setLoading(false)
    }
  }

  const activeFile = activeItem ? files.find(f => f.id === activeItem.id) : null
  const activeIndex = activeItem ? files.findIndex(f => f.id === activeItem.id) : -1

  return (
    <ToolShell
      title="Merge PDF"
      subtitle="Drag the grip handle to reorder files before merging"
      slug="merge"
    >
      <div className="flex flex-col gap-4 max-w-2xl">
        <FileDropzone
          accept=".pdf,application/pdf"
          multiple
          onFiles={addFiles}
          label="Drop PDFs here to add them"
          sublabel="Drag to reorder after adding · Max 50 MB each"
        />

        {files.length > 0 && (
          <div className="flex flex-col gap-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>
                {files.length} file{files.length !== 1 ? 's' : ''} — drag to reorder
              </p>
              <button onClick={() => { setFiles([]); setDone(false) }} className="text-xs transition-colors"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#FBBF24')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                Clear all
              </button>
            </div>

            {/* Merge order hint */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}>
              <span className="text-xs" style={{ color: 'var(--accent)', fontFamily: 'Dosis, sans-serif' }}>
                 Numbers show merge order. Drag <GripVertical size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> to reorder.
              </span>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={files.map(f => f.id)} strategy={verticalListSortingStrategy}>
                {files.map((item, idx) => (
                  <FileRow
                    key={item.id}
                    item={item}
                    index={idx}
                    onRemove={() => setFiles(prev => prev.filter(f => f.id !== item.id))}
                  />
                ))}
              </SortableContext>

              {/* Ghost while dragging */}
              <DragOverlay>
                {activeFile && activeIndex >= 0 && (
                  <FileRow item={activeFile} index={activeIndex} isDragOverlay />
                )}
              </DragOverlay>
            </DndContext>

            {/* Add more */}
            <label
              className="btn-ghost flex items-center justify-center gap-2 py-2.5 text-xs w-full mt-1 cursor-pointer"
            >
              <Plus size={14} /> Add more files
              <input type="file" accept=".pdf,application/pdf" multiple className="hidden"
                onChange={e => e.target.files && addFiles(Array.from(e.target.files))} />
            </label>
          </div>
        )}

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {done && <Alert type="success" message="Merged successfully! Check your Downloads folder." />}

        {files.length >= 2 && (
          <button onClick={merge} disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm self-start">
            {loading ? <><Spinner /> Merging...</> : <><Download size={15} /> Merge & Download</>}
          </button>
        )}
      </div>
    </ToolShell>
  )
}