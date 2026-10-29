import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import pool from '@/lib/db'
import {

  isPlainTextSafe,
  isValidPersonName,
  PERSON_NAME_INVALID_MESSAGE,
  PERSON_NAME_TOO_LONG_MESSAGE,
  PLAIN_TEXT_UNSAFE_MESSAGE,
} from '@/lib/safeFormText'
import { checkRateLimitAsync, clientIp } from '@/lib/payment-rate-limit'

export const dynamic = 'force-dynamic'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COMMENT_MIN = 3
const COMMENT_MAX = 2000

type SubmitBody = {
  centerId?: number | string
  blogPostId?: number | string
  authorName?: string
  authorEmail?: string
  body?: string
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    const allowed = await checkRateLimitAsync(`blog-comment:${ip}`, 5, 15 * 60 * 1000)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many comments. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '900' } },
      )
    }

    const body = (await request.json()) as SubmitBody
    const centerId = Number.parseInt(String(body.centerId ?? ''), 10)
    const blogPostId = Number.parseInt(String(body.blogPostId ?? ''), 10)
    const authorName = String(body.authorName ?? '').trim()
    const authorEmail = String(body.authorEmail ?? '').trim().toLowerCase()
    const commentBody = String(body.body ?? '').trim()

    if (!Number.isFinite(centerId) || centerId <= 0) {
      return NextResponse.json({ error: 'Valid center ID is required' }, { status: 400 })
    }
    if (!Number.isFinite(blogPostId) || blogPostId <= 0) {
      return NextResponse.json({ error: 'Valid blog post ID is required' }, { status: 400 })
    }
    if (!isValidPersonName(authorName)) {
      return NextResponse.json(
        { error: `Valid name is required. ${PERSON_NAME_TOO_LONG_MESSAGE} ${PERSON_NAME_INVALID_MESSAGE}` },
        { status: 400 },
      )
    }
    if (!authorEmail || !EMAIL_REGEX.test(authorEmail)) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 })
    }
    if (commentBody.length < COMMENT_MIN || commentBody.length > COMMENT_MAX) {
      return NextResponse.json(
        { error: `Comment must be between ${COMMENT_MIN} and ${COMMENT_MAX} characters` },
        { status: 400 },
      )
    }
    if (!isPlainTextSafe(commentBody)) {
      return NextResponse.json({ error: PLAIN_TEXT_UNSAFE_MESSAGE }, { status: 400 })
    }

    const postResult = await pool.query(
      'SELECT id FROM blog_posts WHERE id = $1 AND center_id = $2 AND is_published = true',
      [blogPostId, centerId],
    )
    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 })
    }

    // Default hidden — center admin must approve before public display
    const result = await pool.query(
      `INSERT INTO blog_comments (center_id, blog_post_id, author_name, author_email, body, status)
       VALUES ($1, $2, $3, $4, $5, 'hidden')
       RETURNING id, author_name, body, created_at, status`,
      [centerId, blogPostId, authorName, authorEmail, commentBody],
    )

    const comment = result.rows[0]

    revalidateTag(`center-blog-${centerId}`)
    revalidateTag(`blog-comments-${blogPostId}`)

    return NextResponse.json({
      success: true,
      id: comment.id,
      pending: true,
      message: 'Thank you! Your comment was submitted and will appear after review.',
    })
  } catch (error) {
    console.error('Error saving blog comment:', error)
    return NextResponse.json({ error: 'Failed to submit comment' }, { status: 500 })
  }
}
