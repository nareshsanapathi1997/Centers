import type { CSSProperties, ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  from?: 'up' | 'left'
}

/** CSS reveal — no JS observers, respects reduced-motion via styles/motion.css. */
export default function Reveal({ children, className = '', delay = 0, from = 'up' }: RevealProps) {
  const style = { '--cm-delay': `${delay}ms` } as CSSProperties
  return (
    <div
      className={`cm-reveal ${from === 'left' ? 'cm-reveal--left' : ''} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  )
}
