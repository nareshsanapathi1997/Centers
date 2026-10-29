'use client'

import { useState } from 'react'
import './LazyYouTube.css'

function getYouTubeId(url: string): string | null {
  if (!url) return null
  const m = url.match(/(?:embed\/|v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

interface LazyYouTubeProps {
  embedUrl: string
  className?: string
  isActive?: boolean
  onPlay?: () => void
}

export default function LazyYouTube({
  embedUrl,
  className,
  isActive: isActiveProp,
  onPlay,
}: LazyYouTubeProps) {
  const [localPlaying, setLocalPlaying] = useState(false)
  const isControlled = isActiveProp !== undefined
  const isActive = isControlled ? Boolean(isActiveProp) : localPlaying

  const id = getYouTubeId(embedUrl)
  const thumb = id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : ''

  if (!embedUrl) return null

  const handlePlay = () => {
    if (onPlay) {
      onPlay()
    } else {
      setLocalPlaying(true)
    }
  }

  if (isActive) {
    return (
      <iframe
        className={className}
        src={`${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Video player"
      />
    )
  }

  return (
    <button
      type="button"
      className={`lazy-youtube-trigger${className ? ` ${className}` : ''}`}
      onClick={handlePlay}
      aria-label="Play video"
    >
      {thumb ? (
        <img src={thumb} alt="" width={320} height={180} loading="lazy" decoding="async" />
      ) : null}
      <span className="play-btn-overlay play-btn-overlay--red" aria-hidden>
        <i className="ri-play-fill" />
      </span>
    </button>
  )
}
