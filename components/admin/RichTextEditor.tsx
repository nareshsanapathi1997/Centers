'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import './RichTextEditor.css'

interface RichTextEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  minHeight?: string
  className?: string
}

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Write or paste your HTML5 content here...',
  minHeight = '140px',
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isHtmlMode, setIsHtmlMode] = useState(false)
  const [htmlContent, setHtmlContent] = useState(value)

  // Initialize editor content
  useEffect(() => {
    if (!isInitialized && value) {
      setHtmlContent(value)
      setIsInitialized(true)
    }
  }, [value, isInitialized])

  // Sync from parent when value prop changes (e.g. open Edit with existing content)
  useEffect(() => {
    setHtmlContent(value)
    if (editorRef.current && !isHtmlMode) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  // Handle content changes
  const handleContentChange = useCallback(
    (newContent: string) => {
      setHtmlContent(newContent)
      if (onChange) {
        onChange(newContent)
      }
    },
    [onChange]
  )

  // Handle input events
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML
      handleContentChange(content)
    }
  }, [handleContentChange])

  // Execute formatting commands
  const execCommand = useCallback(
    (command: string, valueArg: string | null = null) => {
      if (editorRef.current) {
        document.execCommand(command, false, valueArg ?? undefined)
        editorRef.current.focus()
        handleInput()
      }
    },
    [handleInput]
  )

  // Insert link
  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:')
    if (url) {
      execCommand('createLink', url)
    }
  }, [execCommand])

  // Insert image
  const insertImage = useCallback(() => {
    const url = prompt('Enter image URL:')
    if (url) {
      execCommand('insertImage', url)
    }
  }, [execCommand])

  // Toggle HTML mode
  const toggleHtmlMode = useCallback(() => {
    if (isHtmlMode) {
      handleContentChange(htmlContent)
      setIsHtmlMode(false)
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = htmlContent
        }
      }, 100)
    } else {
      if (editorRef.current) {
        const currentContent = editorRef.current.innerHTML
        setHtmlContent(currentContent)
      }
      setIsHtmlMode(true)
    }
  }, [isHtmlMode, htmlContent, handleContentChange])

  const handleHtmlContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHtmlContent(e.target.value)
  }, [])

  const applyHtmlContent = useCallback(() => {
    handleContentChange(htmlContent)
    setIsHtmlMode(false)
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlContent
      }
    }, 100)
  }, [htmlContent, handleContentChange])

  return (
    <div className={`rich-text-editor ${className}`} style={{ ['--editor-min-height' as string]: minHeight }}>
      <div className="rte-toolbar">
        <button type="button" onClick={() => execCommand('bold')} title="Bold">
          <strong>B</strong>
        </button>
        <button type="button" onClick={() => execCommand('italic')} title="Italic">
          <em>I</em>
        </button>
        <button type="button" onClick={() => execCommand('underline')} title="Underline">
          <u>U</u>
        </button>
        <div className="rte-separator" />
        <button type="button" onClick={() => execCommand('insertUnorderedList')} title="Bullet List">
          • List
        </button>
        <button type="button" onClick={() => execCommand('insertOrderedList')} title="Numbered List">
          1. List
        </button>
        <div className="rte-separator" />
        <button type="button" onClick={insertLink} title="Insert Link">
          🔗 Link
        </button>
        <button type="button" onClick={insertImage} title="Insert Image">
          🖼️ Image
        </button>
        <div className="rte-separator" />
        <button type="button" onClick={() => execCommand('formatBlock', 'h1')} title="Heading 1">
          H1
        </button>
        <button type="button" onClick={() => execCommand('formatBlock', 'h2')} title="Heading 2">
          H2
        </button>
        <button type="button" onClick={() => execCommand('formatBlock', 'h3')} title="Heading 3">
          H3
        </button>
        <div className="rte-separator" />
        <button type="button" onClick={() => execCommand('removeFormat')} title="Remove Formatting">
          Clear
        </button>
        <div className="rte-separator" />
        <button
          type="button"
          onClick={toggleHtmlMode}
          title={isHtmlMode ? 'Visual Mode' : 'HTML Source'}
          className={isHtmlMode ? 'rte-active' : ''}
        >
          {isHtmlMode ? '👁️ Visual' : '</> HTML'}
        </button>
      </div>

      {isHtmlMode ? (
        <div className="rte-html-mode">
          <textarea
            value={htmlContent}
            onChange={handleHtmlContentChange}
            className="rte-html-textarea"
            placeholder="Edit HTML source code here..."
            spellCheck={false}
          />
          <div className="rte-html-actions">
            <button type="button" onClick={applyHtmlContent} className="rte-apply-btn">
              Apply HTML
            </button>
            <button type="button" onClick={toggleHtmlMode} className="rte-cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          key={isHtmlMode ? 'html-mode' : 'visual-mode'}
          ref={editorRef}
          className="rte-editor-content"
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />
      )}
    </div>
  )
}
