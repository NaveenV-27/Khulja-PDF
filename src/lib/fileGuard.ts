export const MAX_SIZE_MB = 50
export const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export function checkFileSize(file: File): string | null {
  if (file.size > MAX_SIZE_BYTES) {
    return `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${MAX_SIZE_MB} MB.`
  }
  return null
}

export function checkFileSizes(files: File[]): string | null {
  for (const f of files) {
    const err = checkFileSize(f)
    if (err) return err
  }
  return null
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function isPdfPasswordError(err: unknown): boolean {
  const msg = String(err).toLowerCase()
  return msg.includes('encrypt') || msg.includes('password') || msg.includes('protected')
}
