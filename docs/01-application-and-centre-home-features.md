# Center Manager Application — Features & Centre Home Page

**Application:** Center Manager (EduSphere Multi-Center Website System)  
**Technology:** Next.js 14, PostgreSQL, TypeScript, Tailwind CSS  
**Document Version:** 1.0  
**Date:** June 2026

---

## 1. Application Overview

Center Manager is a multi-tenant website platform that allows EduSphere to operate **up to 100 independent center websites** from a single application. Each center gets:

- A **public website** at `/{center-slug}` (e.g. `/chennai-central`)
- A **Center Admin panel** at `/admin/{centerId}` for day-to-day content management
- A **Super Admin panel** at `/super-admin` for platform-wide configuration and governance

The application is built on the **v1-yellow** template design and supports light/dark themes, responsive layouts, SEO, analytics, enrollment flows, and TEEMS/prelogin course catalog integration.

---

## 2. User Roles

| Role | Access | Login URL |
|------|--------|-----------|
| **Public Visitor** | View center websites, submit enquiries, enroll in courses | No login required |
| **Center Admin** | Manage content for one assigned center | `/admin/login` |
| **Super Admin** | Manage all centers, global settings, approvals | `/super-admin/login` |

---

## 3. Total Application Features

### 3.1 Multi-Center Architecture

- Each center has a unique **slug**, name, contact details, logos, social links, and map embed
- Centers can be activated or deactivated without deletion
- Section visibility is configurable **per center** (hero, news, courses, etc.)
- Nearby centers can be linked so each center shows relevant "Our Centers" listings
- Integration with **prelogin/TEEMS** for live course catalog and enrollment data

### 3.2 Public Website Features

| Feature | Description |
|---------|-------------|
| **Dynamic center pages** | Each center accessible at `/{slug}` with its own branding |
| **Light & dark mode** | User-selectable theme persisted in browser |
| **Responsive design** | Optimized for desktop, tablet, and mobile |
| **SEO & discoverability** | Per-center meta tags, Open Graph, Twitter cards, schema markup, sitemap.xml, robots.txt |
| **Analytics tracking** | Click/event tracking on news, courses, hero, nearby centers |
| **Header navigation** | Home, Courses, Results, Directors, Gallery, Centers, About, Contact, Vacancies |
| **Optional top bar** | About Us / Our Results dropdowns (Super Admin controlled) |
| **Social media links** | Facebook, X, Instagram, LinkedIn, WhatsApp |
| **LMS login button** | External link to student LMS login |
| **Mobile app promotion** | App Store and Play Store download links in footer |
| **Back to top** | Smooth scroll button on long pages |
| **Hash-based navigation** | In-page section scrolling with scroll position restore |

### 3.3 Public Pages (Beyond Home)

| Page | URL Pattern | Purpose |
|------|-------------|---------|
| **Courses listing** | `/{slug}/courses` | Full courses page |
| **About** | `/{slug}/about` | Standalone "Get To Know Us" page |
| **Vacancies** | `/{slug}/vacancies` | Job openings with WhatsApp apply |
| **Blog post** | `/{slug}/blog/{postSlug}` | Individual blog article |
| **News detail** | `/{slug}/news/{id}` | News/notification detail with sidebar |
| **Category courses** | `/{slug}/category/{categoryId}` | TEEMS/prelogin category course grid |
| **Program details** | `/{slug}/program/{courseKey}` | Prelogin course/program details |
| **General enrollment** | `/{slug}/enrollment` | Course enrollment flow |
| **Classroom enrollment** | `/{slug}/classroom-enrollment` | Classroom-specific enrollment |
| **Online live enrollment** | `/{slug}/online-live-enrollment` | Online live enrollment |
| **Contact** | `/{slug}/contact` | Redirects to contact section on home |
| **Sitemap** | `/{slug}/sitemap.xml` | Dynamic XML sitemap |
| **Robots** | `/{slug}/robots.txt` | Search engine robots file |

### 3.4 Enrollment System

Multi-step enrollment portal supporting:

- Course selection and details review
- Student information capture
- Mobile OTP verification
- Discount/coupon application
- Payment gateway integration
- Document upload
- Terms and conditions acceptance
- Separate flows for **classroom** and **online live** modes
- TEEMS/MSSQL integration for course and subcourse data

### 3.5 Enquiry & Contact

- **Hero enquiry form** on home page — name, course, mobile (OTP), email, message
- Submissions stored in database and emailed to center
- Super Admin can view all enquiries across centers
- Center Admin can view, mark read, delete, and export enquiries

### 3.6 Content Management (Managed via Admin / Super Admin)

| Content Type | Public Display | Managed By |
|--------------|----------------|------------|
| Hero slider | Home page banner | Center Admin (Super Admin approval) |
| News & notifications | Marquee + detail pages | Center Admin (Super Admin approval for news) |
| Courses | Home + courses page | Center Admin |
| Results | Image slider | Center Admin |
| Video testimonials | Video carousel | Center Admin |
| Text testimonials | Quote carousel | Center Admin |
| Directors / Leadership | Director profiles & messages | Center Admin |
| Senior faculty | Faculty slider | Center Admin |
| Gallery | Photo gallery | Center Admin |
| Get To Know Us | About section | Center Admin |
| Our Centers | Nearby center cards | Super Admin configures list; Center Admin edits display |
| Blog | Blog slider + detail pages | Center Admin |
| FAQ (People Also Ask) | Accordion section | Center Admin |
| Vacancies | Vacancies page | Center Admin |
| Contact page content | Contact section heading/intro | Center Admin |
| Custom sections | Builder available (admin) | Center Admin |
| CTA sliders | Moving ticker (admin only) | Center Admin |
| Student stories | Component available (admin only) | Center Admin |

### 3.7 Approval Workflow

Certain content requires **Super Admin approval** before going live:

- News items
- Hero slider slides
- Important alerts

Center Admins submit content → Super Admin approves or rejects via Approvals panel.

### 3.8 Admin Operations

- Dashboard with content statistics and quick links
- In-app notifications
- Activity/audit logs
- Content version history and restore
- Roles & permissions (Admin, Editor, Viewer)
- Center admin user management
- CSV data export
- Image upload with validation
- Password reset via email

### 3.9 Super Admin Platform Features

(See Document 3 for full details)

- Center creation and lifecycle management
- Global branding (logo, favicon, hero background, footer, header menus)
- Cross-center analytics
- SEO management per center
- Email templates and broadcast messaging
- Super Admin and Center Admin account management
- Platform-wide activity logs and contact submissions

---

## 4. Centre Home Page Features

**URL:** `/{center-slug}`  
**Example:** `/chennai-central`

The centre home page is a single-page layout with configurable sections. Each section can be **enabled or disabled** independently by the Center Admin.

### 4.1 Page Structure

```
┌─────────────────────────────────────────┐
│  Header (Logo, Nav, Social, Theme, LMS) │
├─────────────────────────────────────────┤
│  Hero Section (Slider + Enquiry Form) │
│  News & Notifications                   │
│  Courses (College + School Level)       │
│  Results                                │
│  Video Testimonials                     │
│  Text Testimonials                      │
│  Directors / Leadership                 │
│  Senior Faculty                         │
│  Gallery                                │
│  Get To Know Us (About)                 │
│  Our Centers                            │
│  Blog                                   │
│  People Also Ask (FAQ)                  │
├─────────────────────────────────────────┤
│  Footer (Links, Contact, App Download)  │
└─────────────────────────────────────────┘
```

### 4.2 Home Page Sections (Detail)

#### Section 1: Header

| Element | Feature |
|---------|---------|
| Logo | Center-specific or global logo (light/dark variants) |
| Main navigation | Home, Courses, Results, Directors, Gallery, Centers, About, Contact, Vacancies |
| Top bar (optional) | About Us dropdown, Our Results dropdown, quick links |
| Social icons | Facebook, X, Instagram, LinkedIn, WhatsApp |
| Theme switcher | Toggle light/dark mode |
| LMS login | Button linking to external student portal |

#### Section 2: Hero (Home Page Slider)

| Element | Feature |
|---------|---------|
| Image/video slider | Multiple slides with title, subtitle, description, CTA button |
| Background image | Global hero background (Super Admin setting) |
| Enquiry form sidebar | Name, course dropdown, mobile OTP, email, message |
| Course options | Built from center courses + TEEMS catalog |

#### Section 3: News & Notifications

| Element | Feature |
|---------|---------|
| News marquee | Scrolling news items with click-through to detail page |
| Notifications marquee | Separate scrolling strip for notifications |
| Click analytics | Tracks user engagement |

#### Section 4: Courses

| Element | Feature |
|---------|---------|
| College level courses | Icons and links to category/program pages |
| School level courses | Icons and links to category/program pages |
| TEEMS integration | Live course data from prelogin catalog |
| View all link | Links to full courses page |

#### Section 5: Results

| Element | Feature |
|---------|---------|
| Result image slider | Carousel of achievement/result images |
| Responsive carousel | Touch-friendly on mobile |

#### Section 6: Video Testimonials

| Element | Feature |
|---------|---------|
| YouTube embed carousel | Student/parent video testimonials |
| Title per video | Optional title overlay |

#### Section 7: Text Testimonials

| Element | Feature |
|---------|---------|
| Quote carousel | Student/parent written feedback |
| Author name & role | Attribution on each quote |

#### Section 8: Directors (Leadership)

| Element | Feature |
|---------|---------|
| Director profiles | Photo, name, role, bio |
| Director message | Title and message content |
| Multiple directors | Supports more than one director per center |

#### Section 9: Senior Faculty

| Element | Feature |
|---------|---------|
| Faculty slider | Photo, name, role, description |
| Carousel layout | Responsive faculty showcase |

#### Section 10: Gallery

| Element | Feature |
|---------|---------|
| Photo gallery | Image carousel/grid |
| Gallery types | General, photos, videos categories |

#### Section 11: Get To Know Us (About)

| Element | Feature |
|---------|---------|
| Heading & description | Center introduction text |
| Feature list | Bullet points highlighting center strengths |
| Image | Supporting visual |
| Link to full page | `/{slug}/about` for standalone view |

#### Section 12: Our Centers

| Element | Feature |
|---------|---------|
| Nearby center cards | Name, address, phone, map link |
| Configured by Super Admin | Which centers appear for each host center |
| Contact section anchor | Also serves as Contact section on home page |

#### Section 13: Blog

| Element | Feature |
|---------|---------|
| Blog post slider | Featured/recent posts |
| Click-through | Links to `/{slug}/blog/{postSlug}` |
| Featured image | Post thumbnail in slider |

#### Section 14: People Also Ask (FAQ)

| Element | Feature |
|---------|---------|
| Accordion FAQ | Expandable question/answer pairs |
| SEO friendly | Structured FAQ content |

#### Section 15: Footer

| Element | Feature |
|---------|---------|
| Footer logo | Center or global logo |
| Contact information | Phone, email, address |
| Quick links | Configurable link groups (Super Admin) |
| Mobile app download | iOS and Android store links |
| Copyright text | Global copyright (Super Admin setting) |
| Vacancies link | Link to vacancies page |

### 4.3 Section Configuration

Each center admin can enable/disable sections from **Admin → Sections**:

| Section Key | Display Name | Default |
|-------------|--------------|---------|
| `hero` | Home Page Slider | Enabled |
| `news` | News & Notifications | Enabled |
| `courses` | Courses | Enabled |
| `results` | Results | Enabled |
| `video_testimonials` | Video Testimonials | Enabled |
| `text_testimonials` | Text Testimonials | Enabled |
| `leadership` | Directors | Enabled |
| `senior_faculty` | Senior Faculty | Enabled |
| `gallery` | Gallery | Enabled |
| `about` | Get To Know Us | Enabled |
| `centers` | Our Centers | Enabled |
| `blog` | Blog | Enabled |
| `faq` | People Also Ask | Enabled |
| `student_stories` | Our Stories | Enabled (admin only; not on home page yet) |

Disabled sections are completely hidden from the public home page.

### 4.4 Home Page Technical Features

- **Server-side rendering** with 120-second revalidation cache
- **Dynamic imports** for below-the-fold sections (performance)
- **Per-center SEO** meta tags injected via layout
- **Google Analytics / pixel** scripts (when configured)
- **Schema markup** for search engines
- **Template runtime** for carousels and interactive elements

---

## 5. Integrations

| Integration | Purpose |
|-------------|---------|
| **PostgreSQL** | Primary database for all content |
| **TEEMS / Prelogin** | Course catalog, categories, enrollment data |
| **MSSQL** | Subcourse reports and course details |
| **SendGrid** | Transactional emails (enquiries, credentials, password reset) |
| **Payment Gateway** | Course enrollment payments |
| **Google Maps** | Center location embeds |

---

## 6. Features Available in Admin but Not Yet on Home Page

The following features have admin panels and database support but are **not currently rendered** on the centre home page:

| Feature | Admin Path | Status |
|---------|------------|--------|
| CTA Moving Ticker | `/admin/{centerId}/cta-sliders` | Admin only |
| Custom Sections Builder | `/admin/{centerId}/custom-sections` | Admin only |
| Student Stories | `/admin/{centerId}/student-stories` | Admin only (sidebar hidden) |
| Important Alerts | API only | No admin UI page; not on public site |
| Image Library | `/admin/{centerId}/image-library` | Admin only (sidebar hidden) |

---

## 7. URL Reference

| Purpose | URL |
|---------|-----|
| Application root | `/` (redirects to admin login) |
| Centre home | `/{center-slug}` |
| Center Admin login | `/admin/login` |
| Center Admin dashboard | `/admin/{centerId}/dashboard` |
| Super Admin login | `/super-admin/login` |
| Super Admin dashboard | `/super-admin/dashboard` |

---

*For Center Admin features, see Document 2: Admin Features.*  
*For Super Admin features, see Document 3: Super Admin Features.*
