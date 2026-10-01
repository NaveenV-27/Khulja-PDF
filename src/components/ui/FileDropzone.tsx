import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'

interface Props {
  accept: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  label?: string
  sublabel?: string
}

export default function FileDropzone({ accept, multiple = false, onFiles, label, sublabel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handle = (files: FileList | null) => {
    if (!files || files.length === 0) return
    onFiles(Array.from(files))
  }

  return (
    <div
      className={`drop-zone flex flex-col items-center justify-center gap-3 py-14 px-6 text-center ${dragging ? 'active' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files) }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--accent-dim)', border: '1.5px solid var(--accent)' }}
      >
        <Upload size={20} style={{ color: 'var(--accent)' }} />
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }}>
          {label ?? 'Drop files here or click to browse'}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
          {sublabel ?? `Max ${50} MB per file`}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={e => handle(e.target.files)}
      />
    </div>
  )
}
