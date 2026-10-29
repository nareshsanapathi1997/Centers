# Center Manager — Admin Features

**Role:** Center Admin  
**Access:** Single center only (JWT scoped to `center_id`)  
**Login URL:** `/admin/login`  
**Dashboard URL:** `/admin/{centerId}/dashboard`  
**Document Version:** 1.0  
**Date:** June 2026

---

## 1. Overview

The Center Admin panel allows authorized staff at each EduSphere center to manage their public website content, view enquiries, and configure center-specific settings. Each admin account is tied to **one center** and cannot access other centers' data.

---

## 2. Authentication & Account Management

| Feature | URL | Description |
|---------|-----|-------------|
| **Login** | `/admin/login` | Username/email + password authentication |
| **Forgot Password** | `/admin/forgot-password` | Request password reset link via email |
| **Reset Password** | `/admin/reset-password` | Set new password using reset token |
| **My Profile** | `/admin/{centerId}/profile` | View and update profile details |
| **Change Password** | `/admin/{centerId}/profile` | Update account password |

**Security:**
- JWT token stored in browser (`adminToken`)
- Session verified on every admin page load
- Admin can only access their assigned `centerId` in the URL

---

## 3. Admin Navigation Structure

The admin sidebar is organized into three groups:

### Main
- Dashboard
- Enquiries
- Notifications
- Activity Logs

### Content
- Sections
- Home Page Slider
- News & Notifications
- Courses
- Results
- Testimonials
- Directors
- Senior Faculty
- Gallery
- Our Centers
- Blog
- People Also Ask
- Vacancies
- Get To Know Us
- Contact Page

### Advanced
- Custom Sections
- Settings
- My Profile
- Content Versions
- Roles & Permissions
- Center Admins

---

## 4. Main Features (Operations)

### 4.1 Dashboard

**Path:** `/admin/{centerId}/dashboard`

| Capability | Description |
|------------|-------------|
| Content statistics | Counts for news, courses, enquiries, gallery, blog, testimonials |
| Quick links | Shortcuts to frequently used admin pages |
| Overview cards | At-a-glance center content health |

### 4.2 Enquiries

**Path:** `/admin/{centerId}/enquiries`

| Capability | Description |
|------------|-------------|
| View submissions | All hero/contact form enquiries for the center |
| Mark as read/unread | Track which enquiries have been reviewed |
| Delete enquiries | Remove processed submissions |
| Pagination | Browse large enquiry lists |
| Export to CSV | Download enquiry data |

**Data captured:** Full name, email, phone, course name, message, submission date.

### 4.3 Notifications

**Path:** `/admin/{centerId}/notifications`

| Capability | Description |
|------------|-------------|
| In-app inbox | System notifications (approvals, updates, broadcasts) |
| Read/unread status | Track notification status |
| Real-time bell icon | Notification count in admin header |

### 4.4 Activity Logs

**Path:** `/admin/{centerId}/activity-logs`

| Capability | Description |
|------------|-------------|
| Audit trail | Log of all admin actions on this center |
| Action details | Who did what and when |
| Filter and search | Find specific activities |

---

## 5. Content Management Features

### 5.1 Sections (On/Off Configuration)

**Path:** `/admin/{centerId}/sections`

| Capability | Description |
|------------|-------------|
| Enable/disable sections | Toggle each home page section independently |
| Display order | Control section sequence on home page |
| Instant effect | Changes reflect on public site immediately |

**Configurable sections:** Hero, News, Courses, Results, Video Testimonials, Text Testimonials, Directors, Senior Faculty, Gallery, About, Our Centers, Blog, FAQ, Student Stories.

### 5.2 Home Page Slider (Hero)

**Path:** `/admin/{centerId}/hero`

| Capability | Description |
|------------|-------------|
| Add/edit/delete slides | Manage hero banner content |
| Slide fields | Title, subtitle, description, button text/link, video link |
| Images | Background image, slider image |
| Show/hide content | Toggle title/description/button visibility per slide |
| Display order | Reorder slides |
| Active/inactive | Enable or disable individual slides |
| **Approval required** | New/edited slides require Super Admin approval |

### 5.3 News & Notifications

**Path:** `/admin/{centerId}/news`

| Capability | Description |
|------------|-------------|
| Create news items | Title, content, link URL |
| Create notifications | Separate notification type with marquee display |
| Mark as "New" | Highlight badge on news items |
| Bulk actions | Activate, deactivate, or delete multiple items |
| Display order | Control marquee sequence |
| **Approval required** | News items require Super Admin approval before publishing |

### 5.4 Courses

**Path:** `/admin/{centerId}/courses`

| Capability | Description |
|------------|-------------|
| Add/edit/delete courses | Manage course listings |
| Categories | College level and school level |
| Icon selection | Remix icon class per course |
| Display order | Control course display sequence |
| Bulk import | Upload multiple courses at once |
| Active/inactive | Toggle course visibility |

### 5.5 Results

**Path:** `/admin/{centerId}/results`

| Capability | Description |
|------------|-------------|
| Upload result images | Achievement and result photos |
| Title per image | Optional caption |
| Bulk upload | Upload multiple images at once |
| Display order | Control slider sequence |
| Active/inactive | Toggle image visibility |

### 5.6 Testimonials

**Path:** `/admin/{centerId}/testimonials`

| Capability | Description |
|------------|-------------|
| **Video testimonials** | YouTube embed URL, title, display order |
| **Text testimonials** | Quote, author name, author role |
| Bulk upload | Add multiple testimonials at once |
| Active/inactive | Toggle visibility |

### 5.7 Directors (Leadership)

**Path:** `/admin/{centerId}/leadership`

| Capability | Description |
|------------|-------------|
| Multiple directors | Add more than one director per center |
| Profile fields | Name, role, photo, bio |
| Director message | Message title and content |
| Display order | Control director sequence |
| Active/inactive | Toggle visibility |

### 5.8 Senior Faculty

**Path:** `/admin/{centerId}/senior-faculty`

| Capability | Description |
|------------|-------------|
| Faculty profiles | Name, role, description, photo |
| Bulk upload | Add multiple faculty members at once |
| Display order | Control slider sequence |
| Active/inactive | Toggle visibility |

### 5.9 Gallery

**Path:** `/admin/{centerId}/gallery`

| Capability | Description |
|------------|-------------|
| Upload photos/videos | Image gallery management |
| Gallery types | General, photos, videos |
| Title per item | Optional caption |
| Bulk upload | Upload multiple images at once |
| Display order | Control gallery sequence |
| Active/inactive | Toggle visibility |

### 5.10 Our Centers

**Path:** `/admin/{centerId}/centers`

| Capability | Description |
|------------|-------------|
| View nearby centers | Centers configured by Super Admin to appear in "Our Centers" |
| Edit display info | Update how nearby centers are presented |
| Note | Which centers appear is configured by Super Admin in Nearby Centers |

### 5.11 Blog

**Path:** `/admin/{centerId}/blog`

| Capability | Description |
|------------|-------------|
| Create/edit posts | Title, slug, excerpt, rich text content |
| Featured image | Post thumbnail |
| Author name | Attribution |
| Published date | Schedule publication |
| Publish/unpublish | Control post visibility |
| Bulk upload | Import multiple posts |

### 5.12 People Also Ask (FAQ)

**Path:** `/admin/{centerId}/faq`

| Capability | Description |
|------------|-------------|
| Add/edit/delete FAQs | Question and answer pairs |
| Bulk upload | Import multiple FAQs |
| Display order | Control accordion sequence |
| Active/inactive | Toggle visibility |

### 5.13 Vacancies

**Path:** `/admin/{centerId}/vacancies`

| Capability | Description |
|------------|-------------|
| Job postings | Create and manage job openings |
| Job details | Title, description, requirements, location |
| WhatsApp apply | Apply via WhatsApp link |
| Bulk upload | Import multiple vacancies |
| Active/inactive | Toggle visibility |

### 5.14 Get To Know Us (About)

**Path:** `/admin/{centerId}/about`

| Capability | Description |
|------------|-------------|
| Section title | Custom heading |
| Description | Center introduction text |
| Subtext | Supporting tagline |
| Feature list | Bullet points (array of features) |
| Image | About section visual |

### 5.15 Contact Page

**Path:** `/admin/{centerId}/contact-page`

| Capability | Description |
|------------|-------------|
| Page heading | Contact section title |
| Intro text | Contact section description |
| Content customization | Customize contact area on home page |

---

## 6. Advanced Features

### 6.1 Custom Sections

**Path:** `/admin/{centerId}/custom-sections`

| Capability | Description |
|------------|-------------|
| Section types | Image slider, content block, CTA banner |
| Flexible config | JSON-based section configuration |
| Display order | Position custom sections |
| Active/inactive | Toggle visibility |

*Note: Custom sections are managed in admin but not yet rendered on the public home page.*

### 6.2 Center Settings

**Path:** `/admin/{centerId}/settings`

| Setting | Description |
|---------|-------------|
| Center name | Display name |
| Description | Center tagline/description |
| Phone numbers | Multiple phone numbers (array) |
| Email | Contact email |
| Address | Physical address |
| Google rating | Rating value and review URL |
| Map embed URL | Google Maps embed |
| Center image | Main center photo |
| Logo (light/dark) | Center-specific logos |
| Favicon | Center favicon |
| Social links | Facebook, X, Instagram, LinkedIn, WhatsApp, Telegram |
| Working hours | Business hours text |

### 6.3 Content Versions

**Path:** `/admin/{centerId}/content-versions`

| Capability | Description |
|------------|-------------|
| Version history | Track changes to content over time |
| View previous versions | Compare content states |
| Restore versions | Roll back to a previous content state |

### 6.4 Roles & Permissions

**Path:** `/admin/{centerId}/roles`

| Capability | Description |
|------------|-------------|
| Create custom roles | Define role names |
| Assign permissions | Granular read/create/update/delete per resource |
| Default roles | Admin (full access), Editor (no delete), Viewer (read-only) |

**Resources:** Centers, news, courses, gallery, blog, settings.

*Note: Permission UI exists; API currently validates center ownership only, not individual permissions.*

### 6.5 Center Admins

**Path:** `/admin/{centerId}/center-admins`

| Capability | Description |
|------------|-------------|
| Create admin accounts | Add new admin users for this center |
| Edit admin details | Update name, email, status |
| Assign roles | Link admins to roles |
| Activate/deactivate | Enable or disable admin accounts |

---

## 7. Additional Admin Pages (Not in Sidebar)

These pages exist and are functional but are not linked in the main sidebar:

| Feature | Path | Description |
|---------|------|-------------|
| **CTA Sliders** | `/admin/{centerId}/cta-sliders` | Moving heading/ticker text banners |
| **Student Stories** | `/admin/{centerId}/student-stories` | Student success stories |
| **Image Library** | `/admin/{centerId}/image-library` | Centralized image asset management |

---

## 8. Shared Admin Capabilities

### 8.1 File Upload

- Image upload with validation (size, type)
- Used across hero, gallery, results, blog, leadership, etc.
- Files served via `/api/uploads/`

### 8.2 Data Export

- CSV export for enquiries and other data types
- Available from relevant list pages

### 8.3 Dark Mode

- Admin panel supports light/dark theme toggle
- Preference persisted in browser

### 8.4 Mobile Responsive Admin

- Collapsible sidebar on mobile
- Touch-friendly admin interface

---

## 9. Approval Workflow (Admin Perspective)

When Center Admin creates or edits certain content, it enters a **pending approval** state:

| Content Type | Approval Required | Super Admin Action |
|--------------|-------------------|-------------------|
| News items | Yes | Approve or reject in Super Admin → Approvals |
| Hero slides | Yes | Approve or reject in Super Admin → Approvals |
| Alerts | Yes | Approve or reject in Super Admin → Approvals |

Until approved, pending content is **not visible** on the public website.

Center Admin receives notifications when content is approved or rejected.

---

## 10. Admin Feature Summary Table

| # | Feature | Path | CRUD | Bulk | Export | Approval |
|---|---------|------|------|------|--------|----------|
| 1 | Dashboard | `/dashboard` | — | — | — | — |
| 2 | Enquiries | `/enquiries` | RUD | — | Yes | — |
| 3 | Notifications | `/notifications` | R | — | — | — |
| 4 | Activity Logs | `/activity-logs` | R | — | — | — |
| 5 | Sections | `/sections` | U | — | — | — |
| 6 | Hero Slider | `/hero` | CRUD | — | — | Yes |
| 7 | News | `/news` | CRUD | Yes | — | Yes |
| 8 | Courses | `/courses` | CRUD | Yes | — | — |
| 9 | Results | `/results` | CRUD | Yes | — | — |
| 10 | Testimonials | `/testimonials` | CRUD | Yes | — | — |
| 11 | Directors | `/leadership` | CRUD | — | — | — |
| 12 | Senior Faculty | `/senior-faculty` | CRUD | Yes | — | — |
| 13 | Gallery | `/gallery` | CRUD | Yes | — | — |
| 14 | Our Centers | `/centers` | RU | — | — | — |
| 15 | Blog | `/blog` | CRUD | Yes | — | — |
| 16 | FAQ | `/faq` | CRUD | Yes | — | — |
| 17 | Vacancies | `/vacancies` | CRUD | Yes | — | — |
| 18 | About | `/about` | RU | — | — | — |
| 19 | Contact Page | `/contact-page` | RU | — | — | — |
| 20 | Custom Sections | `/custom-sections` | CRUD | — | — | — |
| 21 | Settings | `/settings` | RU | — | — | — |
| 22 | Content Versions | `/content-versions` | RU | — | — | — |
| 23 | Roles | `/roles` | CRUD | — | — | — |
| 24 | Center Admins | `/center-admins` | CRUD | — | — | — |
| 25 | Profile | `/profile` | RU | — | — | — |

---

*For application overview and centre home page features, see Document 1.*  
*For Super Admin features, see Document 3: Super Admin Features.*
