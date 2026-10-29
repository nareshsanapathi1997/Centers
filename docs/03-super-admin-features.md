# Center Manager — Super Admin Features

**Role:** Super Admin  
**Access:** All centers and platform-wide configuration  
**Login URL:** `/super-admin/login`  
**Dashboard URL:** `/super-admin/dashboard`  
**Document Version:** 1.0  
**Date:** June 2026

---

## 1. Overview

The Super Admin panel is the **platform control center** for the entire Center Manager application. Super Admins manage all centers, global branding, user accounts, content approvals, analytics, SEO, email communications, and system settings that affect every center website.

---

## 2. Authentication & Account Management

| Feature | URL | Description |
|---------|-----|-------------|
| **Login** | `/super-admin/login` | Username/email + password authentication |
| **Forgot Password** | `/super-admin/forgot-password` | Request password reset link via email |
| **Reset Password** | `/super-admin/reset-password` | Set new password using reset token |
| **My Profile** | `/super-admin/profile` | View and update profile details |
| **Change Password** | `/super-admin/profile` | Update account password |

**Security:**
- JWT token with `isSuperAdmin: true` flag (`superAdminToken`)
- Verified against `super_admins` database table
- Session verified on every super admin page load

---

## 3. Super Admin Navigation

| Menu Item | Path | Icon |
|-----------|------|------|
| Dashboard | `/super-admin/dashboard` | Home |
| Centers | `/super-admin/centers` | Building |
| Nearby Centers | `/super-admin/nearby-centers` | Map Pin |
| Analytics | `/super-admin/analytics` | Bar Chart |
| Contact Submissions | `/super-admin/contact-submissions` | Inbox |
| Super Admins | `/super-admin/admins` | User Cog |
| Center Admins | `/super-admin/center-admins` | Users |
| Activity Logs | `/super-admin/activity-logs` | Bar Chart |
| Notifications | `/super-admin/notifications` | Inbox |
| SEO Management | `/super-admin/seo` | Search |
| Email Templates | `/super-admin/email-templates` | Mail |
| Send Messages | `/super-admin/send-messages` | Send |
| Approvals | `/super-admin/approvals` | Check Circle |
| Settings | `/super-admin/settings` | Settings |
| My Profile | `/super-admin/profile` | User |

---

## 4. Core Platform Management

### 4.1 Dashboard

**Path:** `/super-admin/dashboard`

| Capability | Description |
|------------|-------------|
| Total centers count | All centers in the system |
| Active centers count | Currently active centers |
| Platform overview | High-level system status |
| Quick navigation | Links to key management areas |

### 4.2 Centers Management

**Path:** `/super-admin/centers`

| Capability | Description |
|------------|-------------|
| **Create center** | Add new center with slug, name, contact details |
| **Edit center** | Update center information |
| **Delete center** | Remove center and all associated data |
| **Activate/deactivate** | Enable or disable center website |
| **Link prelogin center** | Connect to TEEMS/prelogin center ID |
| **Open center admin** | Direct link to center's admin panel |
| **Default setup on creation** | Auto-creates 14 section configs, default hero slide, default admin account |

**Center Creation Side Effects:**
When a new center is created, the system automatically:
1. Inserts 14 default section configurations (all enabled)
2. Creates a default hero slide
3. Creates a default center admin account (`{slug}-admin` / temporary password)
4. Sends credentials email to the new admin
5. Optionally configures nearby center listings

**Center Fields:**
- Slug (URL identifier)
- Name, description
- Phone (multiple), email, address
- Google rating and review URL
- Map embed URL
- Center image, logos (light/dark), favicon
- Social media links (Facebook, X, Instagram, LinkedIn, WhatsApp, Telegram)
- Working hours
- Active status

### 4.3 Nearby Centers Configuration

**Path:** `/super-admin/nearby-centers`

| Capability | Description |
|------------|-------------|
| Configure center relationships | Select which centers appear in "Our Centers" for each host center |
| Display order | Control the sequence of nearby center cards |
| Cross-center linking | Build network of related centers |
| Per-host configuration | Each center can show different nearby centers |

### 4.4 Analytics

**Path:** `/super-admin/analytics`

| Capability | Description |
|------------|-------------|
| Cross-center analytics | View engagement data across all centers |
| Click tracking | News, notifications, courses, hero, nearby centers |
| Trends | Time-based engagement patterns |
| Breakdowns | Per-center and per-content-type analysis |
| Filter by center | Drill down into specific center data |
| Filter by date range | Analyze specific time periods |

### 4.5 Contact Submissions

**Path:** `/super-admin/contact-submissions`  
**Detail:** `/super-admin/contact-submissions/{centerId}`

| Capability | Description |
|------------|-------------|
| All-center inbox | View enquiries from all centers |
| Per-center view | Filter submissions by center |
| Pagination | Browse large submission lists |
| Submission details | Name, email, phone, course, message, date |
| Read status | Track reviewed submissions |

### 4.6 Super Admins Management

**Path:** `/super-admin/admins`

| Capability | Description |
|------------|-------------|
| Create super admin | Add new platform administrators |
| Edit super admin | Update name, email, status |
| Delete super admin | Remove administrator accounts |
| Activate/deactivate | Enable or disable super admin access |

### 4.7 Center Admins Management

**Path:** `/super-admin/center-admins`

| Capability | Description |
|------------|-------------|
| View all center admins | Admins across all centers |
| Create center admin | Add admin for any center |
| Edit center admin | Update details, reassign center |
| Delete center admin | Remove admin accounts |
| Role assignment | Assign roles to center admins |
| Activate/deactivate | Enable or disable admin access |
| Filter by center | Find admins for specific centers |

### 4.8 Activity Logs

**Path:** `/super-admin/activity-logs`

| Capability | Description |
|------------|-------------|
| Platform-wide audit trail | All admin actions across all centers |
| Action details | User, action type, resource, timestamp |
| Filter by center | View logs for specific center |
| Filter by user | View actions by specific admin |
| Search | Find specific activities |

### 4.9 Notifications

**Path:** `/super-admin/notifications`

| Capability | Description |
|------------|-------------|
| Super admin inbox | System notifications |
| Approval requests | Pending content awaiting review |
| Broadcast messages | Messages sent to super admins |
| Read/unread tracking | Notification status management |

---

## 5. Content Governance

### 5.1 Approvals

**Path:** `/super-admin/approvals`

| Capability | Description |
|------------|-------------|
| Pending content queue | All items awaiting approval |
| **News items** | Review center admin news submissions |
| **Hero slides** | Review center admin hero slide changes |
| **Alerts** | Review important alert submissions |
| Approve | Publish content to public website |
| Reject | Decline content with notification to center admin |
| Filter by center | Review approvals per center |
| Filter by type | Review by content type |

**Approval Flow:**
```
Center Admin creates/edits content
        ↓
Content marked as "pending"
        ↓
Super Admin notified
        ↓
Super Admin reviews in Approvals panel
        ↓
Approve → Content goes live on public site
Reject → Center Admin notified, content stays hidden
```

---

## 6. SEO Management

**Path:** `/super-admin/seo`

| Capability | Description |
|------------|-------------|
| Per-center SEO settings | Configure SEO for each center individually |
| Meta title | Page title for search engines |
| Meta description | Search result description |
| Meta keywords | Keyword tags |
| Open Graph tags | Social media sharing (title, description, image) |
| Twitter card tags | Twitter sharing configuration |
| Schema markup | Structured data (JSON-LD) |
| Google Analytics ID | GA tracking code per center |
| Facebook Pixel ID | Pixel tracking per center |
| Sitemap settings | Sitemap generation configuration |
| Robots.txt settings | Search engine crawl rules |
| Canonical URL | Preferred URL for SEO |

---

## 7. Communication Management

### 7.1 Email Templates

**Path:** `/super-admin/email-templates`

| Capability | Description |
|------------|-------------|
| Create/edit templates | HTML email template management |
| Template types | Admin credentials, password reset, contact confirmation |
| Variable placeholders | Dynamic content insertion (name, center, links) |
| Preview | View rendered template |
| Active/inactive | Enable or disable templates |

**Default Templates:**
- Admin credentials email (sent on center creation)
- Password reset email
- Contact form confirmation email

### 7.2 Send Messages

**Path:** `/super-admin/send-messages`

| Capability | Description |
|------------|-------------|
| Broadcast to center admins | Send messages to selected centers |
| Notification type | In-app notification |
| Email type | Email message |
| Select centers | Choose target centers |
| Message content | Title and body text |
| Send confirmation | Delivery status tracking |

---

## 8. Global Settings

**Path:** `/super-admin/settings`

Global settings affect **all center websites**. Organized into tabs:

### 8.1 Hero Section Settings

**Path:** `/super-admin/settings`

| Setting | Description |
|---------|-------------|
| Common hero background | Global background image for all hero sliders |

### 8.2 Logo & Favicon

**Path:** `/super-admin/settings/logo-favicon`

| Setting | Description |
|---------|-------------|
| Global logo (light) | Default logo for all centers |
| Global logo (dark) | Dark mode default logo |
| Global favicon | Default favicon for all centers |

*Centers can override with their own logos in Center Settings.*

### 8.3 Header Navigation

**Path:** `/super-admin/settings/navigation`

| Setting | Description |
|---------|-------------|
| Top bar enabled | Show/hide thin top bar above logo |
| Dropdown enabled | Show/hide About Us / Our Results dropdowns |

### 8.4 Menu Items

**Path:** `/super-admin/settings/menu-items`

| Capability | Description |
|------------|-------------|
| Header dropdown items | About Us, Our Results, Courses submenus |
| About Us submenu | Overview, Philosophy, Meet the Promoters |
| Results submenu | CAT/MBA, Bank, GATE, GMAT, JEE, NEET, CLAT, IPM, ICET |
| Courses submenu | School Level, College Level course links |
| Quick links | Our Centres, Courses, Careers@EduSphere |
| Edit titles, icons, links | Customize each menu item |
| Display order | Control menu sequence |
| Active/inactive | Enable or disable menu items |

### 8.5 Mobile App Settings

**Path:** `/super-admin/settings/mobile-app`

| Setting | Description |
|---------|-------------|
| App Store URL | iOS download link |
| Play Store URL | Android download link |
| App title | Download section heading |
| App description | Download section text |

### 8.6 Footer Settings

**Path:** `/super-admin/settings/footer`

| Capability | Description |
|------------|-------------|
| Footer link groups | Quick Links Group 1, Group 2 |
| Link items | Home, About, Centers, Courses, Leadership, Results, Gallery, Contact |
| Edit titles, icons, target sections | Customize footer links |
| Copyright text | Global footer copyright |
| Display order | Control link sequence |
| Active/inactive | Enable or disable footer links |

### 8.7 Global Settings (Key-Value)

**Path:** `/super-admin/settings/global`

| Capability | Description |
|------------|-------------|
| All global settings | View and edit all `global_settings` entries |
| Setting types | String, boolean, JSON, number |
| Add new settings | Create custom global configuration |
| Descriptions | Document what each setting controls |

**Default Global Settings:**
| Key | Type | Description |
|-----|------|-------------|
| `header_dropdown_enabled` | boolean | Show About Us / Our Results in top bar |
| `header_top_nav_enabled` | boolean | Show thin top bar above logo |
| `hero_common_background_image` | string | Global hero background URL |
| `mobile_app_store_url` | string | iOS App Store URL |
| `mobile_play_store_url` | string | Google Play Store URL |
| `mobile_app_title` | string | Mobile app section title |
| `mobile_app_description` | string | Mobile app section description |
| `footer_copyright_text` | string | Footer copyright text |

---

## 9. Integrations & Reports

### 9.1 TEEMS / Prelogin Integration

| Capability | Description |
|------------|-------------|
| Prelogin center linking | Connect centers to TEEMS catalog |
| Course details lookup | Fetch TEEMS course information |
| Subcourse reports | MSSQL subcourse data reports |

### 9.2 Data Export

| Capability | Description |
|------------|-------------|
| Platform-wide export | Export data across centers |
| CSV format | Downloadable spreadsheet format |

---

## 10. Super Admin Feature Summary

| # | Feature | Path | Scope |
|---|---------|------|-------|
| 1 | Dashboard | `/dashboard` | Platform |
| 2 | Centers | `/centers` | All centers CRUD |
| 3 | Nearby Centers | `/nearby-centers` | Cross-center config |
| 4 | Analytics | `/analytics` | Cross-center data |
| 5 | Contact Submissions | `/contact-submissions` | All centers |
| 6 | Super Admins | `/admins` | Platform admins CRUD |
| 7 | Center Admins | `/center-admins` | All center admins CRUD |
| 8 | Activity Logs | `/activity-logs` | Platform-wide audit |
| 9 | Notifications | `/notifications` | Super admin inbox |
| 10 | SEO Management | `/seo` | Per-center SEO |
| 11 | Email Templates | `/email-templates` | Platform templates |
| 12 | Send Messages | `/send-messages` | Broadcast comms |
| 13 | Approvals | `/approvals` | Content governance |
| 14 | Settings - Hero | `/settings` | Global hero background |
| 15 | Settings - Logo | `/settings/logo-favicon` | Global branding |
| 16 | Settings - Navigation | `/settings/navigation` | Header toggles |
| 17 | Settings - Menu Items | `/settings/menu-items` | Header dropdowns |
| 18 | Settings - Mobile App | `/settings/mobile-app` | App download links |
| 19 | Settings - Footer | `/settings/footer` | Footer links & copyright |
| 20 | Settings - Global | `/settings/global` | All key-value settings |
| 21 | Profile | `/profile` | Own account |

---

## 11. Super Admin vs Center Admin — Responsibility Matrix

| Responsibility | Super Admin | Center Admin |
|----------------|:-----------:|:------------:|
| Create/delete centers | Yes | No |
| Global branding (logo, footer, menus) | Yes | No |
| Center-specific branding | Override | Yes |
| Manage home page content | No | Yes |
| Approve news/hero/alerts | Yes | Submit only |
| Manage center admins (all centers) | Yes | Own center only |
| Manage super admins | Yes | No |
| Cross-center analytics | Yes | Own center only |
| SEO per center | Yes | No |
| Email templates | Yes | No |
| Broadcast messages | Yes | No |
| Nearby centers configuration | Yes | View only |
| Enquiries (own center) | View all | View own |
| Section on/off | No | Yes |
| Enrollment flows | Configure (global) | Content only |
| Activity logs | All centers | Own center |
| Roles & permissions | No | Own center |

---

## 12. Database Tables (Super Admin Scope)

| Table | Super Admin Access |
|-------|-------------------|
| `centers` | Full CRUD |
| `super_admins` | Full CRUD |
| `center_admins` | Full CRUD (all centers) |
| `nearby_centers` | Full CRUD |
| `global_settings` | Full CRUD |
| `header_menu_items` | Full CRUD |
| `footer_menu_items` | Full CRUD |
| `center_seo_settings` | Full CRUD |
| `email_templates` | Full CRUD |
| `contact_submissions` | Read (all centers) |
| `activity_logs` | Read (all centers) |
| `notifications` | Read/write |
| All content tables | Read + approval actions |

---

## 13. Typical Super Admin Workflows

### Workflow 1: Onboard a New Center
1. Go to **Centers** → Create new center
2. System auto-creates sections, hero, and default admin
3. Configure **Nearby Centers** relationships
4. Set up **SEO** for the new center
5. Customize **Settings** if needed (global branding applies automatically)
6. Notify center admin of credentials (auto-emailed)

### Workflow 2: Review Pending Content
1. Check **Notifications** for approval requests
2. Go to **Approvals** panel
3. Review pending news, hero slides, or alerts
4. Approve or reject each item
5. Center admin is automatically notified

### Workflow 3: Update Global Branding
1. Go to **Settings** → Logo & Favicon
2. Upload new global logos
3. Go to **Settings** → Footer
4. Update copyright and footer links
5. Go to **Settings** → Menu Items
6. Update header navigation dropdowns
7. Changes apply to all centers immediately

### Workflow 4: Broadcast Announcement
1. Go to **Send Messages**
2. Select target centers
3. Choose notification and/or email
4. Write message content
5. Send to all selected center admins

---

*For application overview and centre home page features, see Document 1.*  
*For Center Admin features, see Document 2: Admin Features.*
