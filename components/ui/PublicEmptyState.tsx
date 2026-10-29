interface PublicEmptyStateProps {
  icon?: string
  title: string
  message?: string
  className?: string
}

/** Bootstrap-friendly empty state for public / center content pages. */
export default function PublicEmptyState({
  icon = 'ri-inbox-line',
  title,
  message,
  className = '',
}: PublicEmptyStateProps) {
  return (
    <div className={`public-empty-state text-center py-5 px-3 ${className}`.trim()} role="status">
      <div className="public-empty-state__icon" aria-hidden>
        <i className={icon} />
      </div>
      <h3 className="public-empty-state__title">{title}</h3>
      {message ? <p className="public-empty-state__message mb-0">{message}</p> : null}
    </div>
  )
}
