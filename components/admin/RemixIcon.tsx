type RemixIconProps = {
  name?: string | null
  className?: string
  size?: 'md' | 'lg'
}

function normalizeRemixClass(name?: string | null): string {
  const raw = (name || 'ri-link').trim()
  if (!raw) return 'ri-link'
  return raw.startsWith('ri-') ? raw : `ri-${raw}`
}

export default function RemixIcon({ name, className = '', size = 'md' }: RemixIconProps) {
  const iconClass = normalizeRemixClass(name)
  const sizeClass = size === 'lg' ? 'admin-remix-icon--lg' : ''

  return <i className={`${iconClass} admin-remix-icon ${sizeClass} ${className}`.trim()} aria-hidden />
}
