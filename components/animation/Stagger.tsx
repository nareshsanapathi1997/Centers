import { Children, type CSSProperties, type ReactNode } from 'react'

type StaggerProps = {
  children: ReactNode
  className?: string
  step?: number
}

/** Staggers child enter animations via CSS custom properties. */
export default function Stagger({ children, className = '', step = 70 }: StaggerProps) {
  const style = { '--cm-stagger-step': `${step}ms` } as CSSProperties
  return (
    <div className={`cm-stagger ${className}`.trim()} style={style}>
      {Children.map(children, (child, index) => (
        <div className="cm-stagger__item" style={{ '--cm-i': index } as CSSProperties}>
          {child}
        </div>
      ))}
    </div>
  )
}
