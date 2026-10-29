/** First focusable element — skip to main content (Lighthouse a11y). */
export default function SkipLink() {
  return (
    <a href="#main-content" className="skip-link visually-hidden">
      Skip to main content
    </a>
  )
}
