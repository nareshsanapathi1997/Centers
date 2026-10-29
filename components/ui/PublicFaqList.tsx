interface PublicFaqListProps {
  faqs: { id?: number; question: string; answer: string }[]
}

export default function PublicFaqList({ faqs }: PublicFaqListProps) {
  return (
    <div className="faq-lines">
      {faqs.map((faq, index) => (
        <details className="faq-line" key={faq.id ?? index}>
          <summary>
            <span className="faq-line__n" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span>{faq.question}</span>
            <i className="ri-add-line" aria-hidden />
          </summary>
          <div className="faq-line__a">
            <p>{faq.answer}</p>
          </div>
        </details>
      ))}
    </div>
  )
}
