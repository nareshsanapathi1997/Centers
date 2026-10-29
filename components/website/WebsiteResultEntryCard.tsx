import SafeImage from '@/components/website/PublicImage'
import { parseWebsiteExamCategory, websiteExamCategoryLabel } from '@/lib/website-exam-categories'
import {
  normalizeResultEntryType,
  type WebsiteResultEntryRow,
} from '@/lib/website-result-entry'
import { sanitizeCmsHtml } from '@/lib/sanitize-html'

const FALLBACK_SRC = '/assets/img/results.jpg'

type WebsiteResultEntryCardProps = {
  entry: WebsiteResultEntryRow
  layout?: 'featured' | 'text'
}

function ResultMeta({ entry }: { entry: WebsiteResultEntryRow }) {
  const examKey = parseWebsiteExamCategory(entry.exam_category)
  const examLabel = examKey ? websiteExamCategoryLabel(examKey) : null

  return (
    <div className="website-result-entry__meta">
      {entry.result_year ? (
        <span className="website-result-entry__badge">{entry.result_year}</span>
      ) : null}
      {examLabel ? (
        <span className="website-result-entry__badge website-result-entry__badge--muted">{examLabel}</span>
      ) : null}
    </div>
  )
}

export default function WebsiteResultEntryCard({
  entry,
  layout = 'text',
}: WebsiteResultEntryCardProps) {
  const type = normalizeResultEntryType(entry.entry_type)
  const title = entry.title?.trim() || 'Result highlight'

  if (layout === 'featured' && type === 'image_text') {
    return (
      <article className="website-result-entry website-result-entry--featured">
        {entry.image_url ? (
          <div className="website-result-entry__image-wrap">
            <SafeImage
              src={entry.image_url}
              fallbackSrc={FALLBACK_SRC}
              alt={title}
              width={640}
              height={420}
            />
          </div>
        ) : null}
        <div className="website-result-entry__body">
          <ResultMeta entry={entry} />
          <h3 className="website-result-entry__title">{title}</h3>
          {entry.content_html ? (
            <div
              className="website-result-entry__content prose text-pub-muted"
              dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(entry.content_html) }}
            />
          ) : null}
        </div>
      </article>
    )
  }

  return (
    <article className="website-result-entry website-result-entry--text h-full">
      <div className="website-result-entry__body">
        <ResultMeta entry={entry} />
        <h3 className="website-result-entry__title">{title}</h3>
        {entry.content_html ? (
          <div
            className="website-result-entry__content prose text-pub-muted"
            dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(entry.content_html) }}
          />
        ) : null}
      </div>
    </article>
  )
}
