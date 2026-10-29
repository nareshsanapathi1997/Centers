'use client'

import { useState } from 'react'
import { withBasePath } from '@/lib/with-base-path'
import type { PublicBlogComment } from '@/types'
import './BlogCommentsSection.css'

function formatCommentDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
}

export default function BlogCommentsSection({
  centerId,
  blogPostId,
  initialComments,
}: {
  centerId: number
  blogPostId: number
  initialComments: PublicBlogComment[]
}) {
  const [comments, setComments] = useState(initialComments)
  const [authorName, setAuthorName] = useState('')
  const [authorEmail, setAuthorEmail] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!authorName.trim() || !authorEmail.trim() || !body.trim()) {
      setError('Please enter your name, email, and comment.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(withBasePath('/api/blog-comments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerId,
          blogPostId,
          authorName: authorName.trim(),
          authorEmail: authorEmail.trim(),
          body: body.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Failed to submit comment')
        return
      }

      setAuthorName('')
      setAuthorEmail('')
      setBody('')
      setSuccess(data.message || 'Thank you! Your comment was submitted and will appear after review.')
    } catch {
      setError('Failed to submit comment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="blog-comments-section" aria-label="Blog comments">
      <div className="blog-comments-panel">
        <header className="blog-comments-header">
          <div className="blog-comments-header__icon" aria-hidden>
            <i className="ri-chat-3-line" />
          </div>
          <div className="blog-comments-header__text">
            <h4 className="blog-comments-header__title">
              Comments <span className="blog-comments-header__count">({comments.length})</span>
            </h4>
            <p className="blog-comments-header__subtitle">
              Share your thoughts. Comments are reviewed before they appear on this page.
            </p>
          </div>
        </header>

        <div className="blog-comments-list-wrap">
          {comments.length > 0 ? (
            <ul className="blog-comments-list">
              {comments.map((comment) => (
                <li key={comment.id} className="blog-comment-item">
                  <div className="blog-comment-item__avatar" aria-hidden>
                    {getInitials(comment.author_name)}
                  </div>
                  <div className="blog-comment-item__content">
                    <div className="blog-comment-item__meta">
                      <strong className="blog-comment-item__name">{comment.author_name}</strong>
                      {comment.created_at ? (
                        <span className="blog-comment-item__date">{formatCommentDate(comment.created_at)}</span>
                      ) : null}
                    </div>
                    <p className="blog-comment-item__body">{comment.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="blog-comments-empty">
              <i className="ri-message-3-line" aria-hidden />
              <p>No comments yet. Be the first to share your thoughts.</p>
            </div>
          )}
        </div>

        <div className="blog-comments-form-wrap">
          <h5 className="blog-comments-form-title">Leave a Comment</h5>
          <form className="blog-comments-form" onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="blog-comments-label" htmlFor="blog-comment-name">
                  Your Name <span className="blog-comments-required">*</span>
                </label>
                <input
                  id="blog-comment-name"
                  className="blog-comments-input"
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={40}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="blog-comments-label" htmlFor="blog-comment-email">
                  Your Email <span className="blog-comments-required">*</span>
                </label>
                <input
                  id="blog-comment-email"
                  className="blog-comments-input"
                  type="email"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>
              <div className="col-12">
                <label className="blog-comments-label" htmlFor="blog-comment-body">
                  Your Comment <span className="blog-comments-required">*</span>
                </label>
                <textarea
                  id="blog-comment-body"
                  className="blog-comments-textarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your comment here..."
                  rows={5}
                  maxLength={2000}
                  required
                />
              </div>
            </div>

            {error ? (
              <div className="blog-comment-alert blog-comment-alert--error" role="alert">
                <i className="ri-error-warning-line" aria-hidden />
                <span>{error}</span>
              </div>
            ) : null}
            {success ? (
              <div className="blog-comment-alert blog-comment-alert--success" role="status">
                <i className="ri-checkbox-circle-line" aria-hidden />
                <span>{success}</span>
              </div>
            ) : null}

            <div className="blog-comments-form-actions">
              <button type="submit" className="btn style1 blog-comments-submit" disabled={submitting}>
                <i className="ri-send-plane-line" aria-hidden />
                {submitting ? 'Submitting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
