'use client'

import { useId, useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { FileIcon, Loader2, Upload, X } from 'lucide-react'

export type FileUploadFieldProps = {
  label?: string
  /** Current file URL or path (shows preview chip when set). */
  value?: string
  /** Optional display name shown in the preview chip. */
  fileName?: string
  onFile: (file: File) => void | Promise<void>
  onClear?: () => void
  accept?: string
  /** e.g. "PDF only, up to 10MB" */
  formatHint?: string
  helpText?: string
  error?: string
  uploading?: boolean
  progress?: number | null
  disabled?: boolean
  /** Link label when value is a URL (default: View file). */
  previewLabel?: string
  className?: string
  id?: string
}

function basename(path: string): string {
  const clean = path.split('?')[0] ?? path
  const parts = clean.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

/**
 * Production-style dashed dropzone for non-image files (PDF, docs, materials).
 * Matches ImageUpload / Hero Section craft: click-or-drag, hints, preview + remove.
 */
export default function FileUploadField({
  label,
  value = '',
  fileName,
  onFile,
  onClear,
  accept,
  formatHint = 'Click to upload or drag',
  helpText,
  error,
  uploading: uploadingProp,
  progress = null,
  disabled = false,
  previewLabel = 'View file',
  className = '',
  id,
}: FileUploadFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [internalUploading, setInternalUploading] = useState(false)
  const uploading = uploadingProp ?? internalUploading

  const runUpload = async (file: File) => {
    if (disabled || uploading) return
    try {
      if (uploadingProp === undefined) setInternalUploading(true)
      await onFile(file)
    } finally {
      if (uploadingProp === undefined) setInternalUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void runUpload(file)
  }

  const handleDrag = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled || uploading) return
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (disabled || uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) void runUpload(file)
  }

  const displayName = fileName || (value ? basename(value) : '')
  const isHttpUrl = /^https?:\/\//i.test(value) || value.startsWith('/')

  return (
    <div className={`admin-form-field admin-file-upload ${className}`.trim()}>
      {label ? (
        <label htmlFor={inputId} className="admin-form-label">
          {label}
        </label>
      ) : null}

      <div className={`admin-file-upload__body${value ? ' admin-file-upload__body--has-preview' : ''}`}>
        <div
          className={`admin-file-upload__dropzone${dragActive ? ' admin-file-upload__dropzone--active' : ''}${
            disabled || uploading ? ' admin-file-upload__dropzone--disabled' : ''
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            onChange={handleChange}
            disabled={disabled || uploading}
            aria-label={label || 'Upload file'}
          />

          <div className="admin-file-upload__prompt">
            {uploading ? (
              <>
                <Loader2 className="admin-file-upload__icon admin-file-upload__icon--spin" aria-hidden />
                <span className="admin-file-upload__prompt-text">
                  Uploading{progress != null ? `… ${Math.round(progress)}%` : '…'}
                </span>
              </>
            ) : (
              <>
                <Upload className="admin-file-upload__icon" aria-hidden />
                <span className="admin-file-upload__prompt-text">
                  <span className="admin-file-upload__prompt-link">Click to upload</span>
                  {' '}or drag · {formatHint}
                </span>
              </>
            )}
          </div>

          {uploading && progress != null ? (
            <div className="admin-file-upload__progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="admin-file-upload__progress-bar" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
            </div>
          ) : null}
        </div>

        {value ? (
          <div className="admin-file-upload__preview">
            <div className="admin-file-upload__chip">
              <FileIcon className="admin-file-upload__chip-icon" aria-hidden />
              {isHttpUrl ? (
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-file-upload__chip-link"
                  title={displayName}
                >
                  {previewLabel}
                </a>
              ) : (
                <span className="admin-file-upload__chip-name" title={displayName}>
                  {displayName}
                </span>
              )}
            </div>
            {onClear ? (
              <button
                type="button"
                className="admin-file-upload__clear"
                onClick={onClear}
                aria-label="Remove file"
                title="Remove file"
              >
                <X className="w-3 h-3" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? <p className="admin-form-error">{error}</p> : null}
      {!error && helpText ? <p className="admin-form-hint">{helpText}</p> : null}
    </div>
  )
}
