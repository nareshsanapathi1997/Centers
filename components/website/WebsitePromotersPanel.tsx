import SafeImage from '@/components/website/PublicImage'

import type { resolveAboutPromotersPage } from '@/lib/website-about-pages'

import type { Leadership } from '@/types'

import '@/components/sections/LeadershipSection.css'



type PromotersPageContent = ReturnType<typeof resolveAboutPromotersPage>



function directorColClass(count: number): string {

  if (count === 1) return 'col-12'

  if (count === 2) return 'col-lg-6'

  return 'col-lg-4 col-md-6'

}



function DirectorCard({ leader }: { leader: Leadership }) {

  const role = leader.role?.trim() || 'Promoter'



  return (

    <article className="leadership-director-card">

      <div className="leadership-director-card__photo">

        <SafeImage

          src={leader.image_url}

          fallbackSrc="/assets/img/director.jpg"

          alt={`${leader.name}, ${role}`}

          width={118}

          height={146}

          loading="lazy"

          decoding="async"

        />

      </div>

      <div className="leadership-director-card__body">

        <h3 className="leadership-director-card__name">{leader.name}</h3>

        <p className="leadership-director-card__role">{role}</p>

        {leader.bio ? <p className="leadership-director-card__bio">{leader.bio}</p> : null}

      </div>

    </article>

  )

}



export default function WebsitePromotersPanel({

  leaders,

  page,

}: {

  leaders: Leadership[]

  page: PromotersPageContent

}) {

  if (leaders.length === 0) {

    return (

      <div className="text-center py-5">

        <p className="text-muted mb-0">Promoter profiles will be published here soon.</p>

      </div>

    )

  }



  const messageTitle = leaders[0]?.message_title

  const messageContent = leaders[0]?.message_content

  const hasMessage = Boolean(messageTitle || messageContent)

  const colClass = directorColClass(leaders.length)

  const names = leaders.map((l) => l.name?.trim()).filter(Boolean)

  const attribution =

    names.length === 0

      ? null

      : names.length === 1

        ? names[0]

        : names.length === 2

          ? `${names[0]} & ${names[1]}`

          : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`



  return (

    <section className="leadership-section why-choose-wrap style1 ptb-100 bg-albastor">

      <div className="container">

        <div className="row leadership-section__intro">

          <div className="col-lg-12">

            <div className="content-title style1 text-center">

              <span>{page.eyebrow}</span>

              <h2>{page.sectionHeading}</h2>

              <p>{page.sectionIntro}</p>

            </div>

          </div>

        </div>



        <div className="leadership-panel">

          {hasMessage ? (

            <div className="leadership-shared-message">

              <div className="leadership-shared-message__inner">

                <i className="ri-double-quotes-r leadership-shared-message__q" aria-hidden="true" />

                <span className="leadership-shared-message__label">{page.messageLabel}</span>

                <div className="leadership-shared-message__content">

                  {messageTitle ? (

                    <h3 className="leadership-shared-message__title">{messageTitle}</h3>

                  ) : null}

                  {messageContent ? (

                    <p className="leadership-shared-message__text">{messageContent}</p>

                  ) : null}

                  {attribution ? (

                    <p className="leadership-shared-message__byline">

                      <i className="ri-user-star-line" aria-hidden />

                      {attribution}, Promoters

                    </p>

                  ) : null}

                </div>

              </div>

            </div>

          ) : null}



          <div className="leadership-directors-heading">

            <h3 className="leadership-directors-heading__title">{page.directorsHeading}</h3>

            <p className="leadership-directors-heading__subtitle">{page.directorsSubtitle}</p>

          </div>



          <div className={`row g-3 leadership-directors-grid${hasMessage ? ' leadership-directors-grid--with-message' : ''}`}>

            {leaders.map((leader) => (

              <div key={leader.id} className={colClass}>

                <DirectorCard leader={leader} />

              </div>

            ))}

          </div>

        </div>

      </div>

    </section>

  )

}

