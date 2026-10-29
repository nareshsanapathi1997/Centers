'use client'

import { useId, useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { FileIcon, Upload, X } from 'lucide-react'

export type MultiFilePickFieldProps = {
  label?: string
  files: File[]
  onChange: (files: File[]) => void
  accept?: string
  formatHint?: string
  helpText?: string
  error?: string
  disabled?: boolean
  className?: string
  id?: string
}

/**
 * Multi-file picker dropzone for bulk-upload modals (select now, upload on submit).
 * Visual language matches FileUploadField / ImageUpload.
 */
export default function MultiFilePickField({
  label,
  files,
  onChange,
  accept,
  formatHint = 'Click to select or drag',
  helpText,
  error,
  disabled = false,
  className = '',
  id,
}: MultiFilePickFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const mergeFiles = (incoming: FileList | File[]) => {
    const next = Array.from(incoming)
    if (next.length === 0) return
    const byKey = new Map<string, File>()
    for (const f of files) byKey.set(`${f.name}:${f.size}:${f.lastModified}`, f)
    for (const f of next) byKey.set(`${f.name}:${f.size}:${f.lastModified}`, f)
    onChange(Array.from(byKey.values()))
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) mergeFiles(e.target.files)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDrag = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (disabled) return
    if (e.dataTransfer.files?.length) mergeFiles(e.dataTransfer.files)
  }

  const removeAt = (index: number) => {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className={`admin-form-field admin-file-upload ${className}`.trim()}>
      {label ? (
        <label htmlFor={inputId} className="admin-form-label">
          {label}
        </label>
      ) : null}

      <div
        className={`admin-file-upload__body admin-file-upload__body--stack${
          files.length > 0 ? ' admin-file-upload__body--has-preview' : ''
        }`}
      >
        <div
          className={`admin-file-upload__dropzone${dragActive ? ' admin-file-upload__dropzone--active' : ''}${
            disabled ? ' admin-file-upload__dropzone--disabled' : ''
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
            multiple
            accept={accept}
            onChange={handleChange}
            disabled={disabled}
            aria-label={label || 'Select files'}
          />
          <div className="admin-file-upload__prompt">
            <Upload className="admin-file-upload__icon" aria-hidden />
            <span className="admin-file-upload__prompt-text">
              <span className="admin-file-upload__prompt-link">Click to select</span>
              {' '}or drag · {formatHint}
            </span>
          </div>
        </div>

        {files.length > 0 ? (
          <ul className="admin-file-upload__preview admin-file-upload__preview--list" aria-label="Selected files">
            {files.map((file, index) => (
              <li key={`${file.name}:${file.size}:${file.lastModified}`} className="admin-file-upload__chip">
                <FileIcon className="admin-file-upload__chip-icon" aria-hidden />
                <span className="admin-file-upload__chip-name" title={file.name}>
                  {file.name}
                </span>
                <button
                  type="button"
                  className="admin-file-upload__clear"
                  onClick={() => removeAt(index)}
                  aria-label={`Remove ${file.name}`}
                  title="Remove"
                >
                  <X className="w-3 h-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? <p className="admin-form-error">{error}</p> : null}
      {!error && helpText ? <p className="admin-form-hint">{helpText}</p> : null}
      {!error && !helpText && files.length > 0 ? (
        <p className="admin-form-hint">{files.length} file(s) selected</p>
      ) : null}
    </div>
  )
}
