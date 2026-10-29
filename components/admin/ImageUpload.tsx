'use client'
import { withBasePath } from '@/lib/with-base-path'

import { useId, useRef, useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import SafeImage from '@/components/ui/SafeImage'
import {
  ADMIN_IMAGE_ACCEPT,
  ADMIN_IMAGE_FORMAT_HINT,
  validateAdminImageFile,
} from '@/lib/admin-image-upload-validation'
import { getImageDimensionsFromFile } from '@/lib/image-dimensions'

interface ImageUploadProps {
  label: string
  value: string
  onChange: (url: string) => void
  folder?: string
  centerId?: string
  placeholder?: string
  helpText?: string
  accept?: string
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  /** Override upload endpoint (default: /api/admin/upload) */
  uploadUrl?: string
  /** Extra headers (e.g. super-admin Authorization) */
  uploadHeaders?: Record<string, string>
  error?: string
  required?: boolean
  id?: string
}

export default function ImageUpload({
  label,
  value,
  onChange,
  folder = 'images',
  centerId,
  helpText,
  accept = ADMIN_IMAGE_ACCEPT,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  uploadUrl,
  uploadHeaders,
  error: errorProp,
  required = false,
  id,
}: ImageUploadProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayError = errorProp || error

  const exactSize =
    minWidth != null &&
    minHeight != null &&
    maxWidth != null &&
    maxHeight != null &&
    minWidth === maxWidth &&
    minHeight === maxHeight

  const recommendedHint = exactSize
    ? `Recommended size: ${minWidth}×${minHeight} pixels`
    : [
        minWidth != null && minHeight != null && `Min ${minWidth}×${minHeight}`,
        maxWidth != null &&
          maxHeight != null &&
          (minWidth !== maxWidth || minHeight !== maxHeight) &&
          `Max ${maxWidth}×${maxHeight}`,
      ]
        .filter(Boolean)
        .join(' · ') + (minWidth != null || maxWidth != null ? ' px' : '')

  const handleFileUpload = async (file: File) => {
    setError('')
    setUploading(true)

    try {
      const formatError = validateAdminImageFile(file)
      if (formatError) {
        setError(formatError)
        setUploading(false)
        return
      }

      if (minWidth != null || minHeight != null || maxWidth != null || maxHeight != null) {
        const { width, height } = await getImageDimensionsFromFile(file)
        const exactWidth = minWidth != null && maxWidth != null && minWidth === maxWidth
        const exactHeight = minHeight != null && maxHeight != null && minHeight === maxHeight
        if (exactWidth && exactHeight && (width !== minWidth || height !== minHeight)) {
          setError(`Image must be exactly ${minWidth} × ${minHeight} px. Current: ${width} × ${height}.`)
          setUploading(false)
          return
        }
        if (minWidth != null && width < minWidth) {
          setError(`Image width must be at least ${minWidth} px. Current: ${width} × ${height}.`)
          setUploading(false)
          return
        }
        if (minHeight != null && height < minHeight) {
          setError(`Image height must be at least ${minHeight} px. Current: ${width} × ${height}.`)
          setUploading(false)
          return
        }
        if (maxWidth != null && width > maxWidth) {
          setError(`Image width must not exceed ${maxWidth} px. Current: ${width} × ${height}.`)
          setUploading(false)
          return
        }
        if (maxHeight != null && height > maxHeight) {
          setError(`Image height must not exceed ${maxHeight} px. Current: ${width} × ${height}.`)
          setUploading(false)
          return
        }
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)
      if (centerId) {
        formData.append('centerId', centerId)
      }

      const response = await fetch(withBasePath(uploadUrl || '/api/admin/upload'), {
        credentials: 'include',
        method: 'POST',
        body: formData,
        headers: uploadHeaders,
      })

      const data = await response.json()

      if (response.ok) {
        onChange(data.url)
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      void handleFileUpload(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    const formatError = validateAdminImageFile(file)
    if (formatError) {
      setError(formatError)
      return
    }

    void handleFileUpload(file)
  }

  const clearImage = () => {
    onChange('')
    setError('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const hintBelow = helpText || (recommendedHint ? recommendedHint : '')

  return (
    <div className="admin-form-field admin-image-upload">
      {label ? (
        <label htmlFor={inputId} className="admin-form-label">
          {label}
          {required ? <span className="admin-form-label__required">*</span> : null}
        </label>
      ) : null}

      <div className={`admin-image-upload__body${value ? ' admin-image-upload__body--has-preview' : ''}`}>
        <div
          className={`admin-image-upload__dropzone${dragActive ? ' admin-image-upload__dropzone--active' : ''}${
            uploading ? ' admin-image-upload__dropzone--disabled' : ''
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
            onChange={handleFileChange}
            disabled={uploading}
            aria-label={label || 'Upload image'}
            aria-invalid={displayError ? true : undefined}
          />

          <div className="admin-image-upload__prompt">
            {uploading ? (
              <>
                <Loader2 className="admin-image-upload__icon admin-image-upload__icon--spin" aria-hidden />
                <span className="admin-image-upload__prompt-text">Uploading…</span>
              </>
            ) : (
              <>
                <Upload className="admin-image-upload__icon" aria-hidden />
                <span className="admin-image-upload__prompt-text">
                  <span className="admin-image-upload__prompt-link">Click to upload</span>
                  {' '}or drag · {ADMIN_IMAGE_FORMAT_HINT}
                </span>
              </>
            )}
          </div>
        </div>

        {value ? (
          <div className="admin-image-upload__preview">
            <SafeImage
              src={value}
              alt="Uploaded image preview"
              className="admin-image-upload__thumb"
              hideOnError
            />
            <button
              type="button"
              onClick={clearImage}
              className="admin-image-upload__clear"
              title="Remove image"
              aria-label="Remove image"
            >
              <X className="w-3 h-3" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      {displayError ? <p className="admin-form-error">{displayError}</p> : null}
      {!displayError && hintBelow ? <p className="admin-form-hint">{hintBelow}</p> : null}
    </div>
  )
}
