# Student Portal — End-to-End Plan

## Goal
Replace the external LMS login button with a **built-in, center-scoped student portal** integrated with existing fee payments, enrollments, and center branding.

---

## Phase 1 — Foundation (Database & Auth)

### 1.1 Database (`students` + links)
| Table | Purpose |
|-------|---------|
| `students` | Account: center_id, regno, name, email, mobile, password_hash, profile fields, is_active |
| `student_fee_payments.student_id` | FK to link payments to portal accounts |
| `password_reset_tokens` | Extend `user_type` to include `student` |

**Login identity:** mobile (primary) or email, scoped per center.

### 1.2 Auth (mirrors admin pattern)
- JWT payload: `{ studentId, centerId }`
- Client storage: `localStorage.studentToken`, `localStorage.studentCenterId`
- APIs: login, register, verify, forgot-password, reset-password
- Session TTL: 30 days

---

## Phase 2 — Student Portal Routes

Center-scoped under `/{centerSlug}/student/`:

| Route | Access | Features |
|-------|--------|----------|
| `/login` | Public | Mobile/email + password |
| `/register` | Public | Self-registration with center validation |
| `/forgot-password` | Public | Email reset link |
| `/reset-password` | Public | Token-based password set |
| `/dashboard` | Auth | Summary: courses, dues, recent payments |
| `/profile` | Auth | Edit name, email, address, change password |
| `/courses` | Auth | Enrolled courses from payments |
| `/payments` | Auth | Payment history, download receipts |
| `/installments` | Auth | Upcoming dues, pay-now links |

Corporate website: `/student` — center picker → redirect to `/{slug}/student/login`.

---

## Phase 3 — Header Change
- **Remove** external `LoginButton` (NEXT_PUBLIC_LOGIN_URL)
- **Add** `StudentPortalButton` → `/{slug}/student/login` (center sites) or `/student` (corporate)

---

## Phase 4 — Admin Integration

### Center Admin (`/admin/{centerId}/students`)
- List/search students
- Create student accounts
- Activate/deactivate
- Reset password (admin-triggered)
- View linked payments

### Auto-link on payment
When a student pays via Razorpay or admin records payment, link by mobile to existing `students` row or create pending link.

---

## Phase 5 — Data Integration

| Source | Portal view |
|--------|-------------|
| `student_fee_payments` | Payments & receipts |
| `student_payment_installments` | Installment schedule |
| `student_enrollments` (if present) | Legacy enrollment data |
| `course_masters` | Course names/details |

---

## Phase 6 — Security & UX
- bcrypt password hashing
- Rate limiting on login (reuse payment-rate-limit pattern)
- Center isolation (students only see their center's data)
- Mobile-first responsive UI (Tailwind, matches admin quality)
- Activity logging for student login

---

## File Structure (new)

```
lib/
  student-auth.ts
  student-portal-db.ts
  student-portal-schema.sql
  student-api.ts
components/student/
  StudentLayout.tsx
  StudentSidebar.tsx
  StudentPortalButton.tsx
  StudentAuthForm.tsx
app/[slug]/student/
  layout.tsx
  login/page.tsx
  register/page.tsx
  forgot-password/page.tsx
  reset-password/page.tsx
  dashboard/page.tsx
  profile/page.tsx
  courses/page.tsx
  payments/page.tsx
  installments/page.tsx
app/(website)/(site)/student/page.tsx
app/api/student/
  login/route.ts
  register/route.ts
  verify/route.ts
  profile/route.ts
  payments/route.ts
  courses/route.ts
  installments/route.ts
  forgot-password/route.ts
  reset-password/route.ts
app/api/admin/students/route.ts
app/admin/[centerId]/students/page.tsx
scripts/add-student-portal-tables.js
```

---

## Phase 7 — Extended Features (Implemented)

### OTP Login
- Password or OTP tabs on login page
- OTP via SMS (if `SMS_API_URL` configured) or email fallback
- Dev mode shows OTP in UI when `NODE_ENV=development`

### Auto-provision on payment
- Razorpay + admin manual payments create/link student accounts
- Welcome email with temp password for new accounts
- In-app notification on payment success

### Student Notifications
- Bell icon in portal header + full notifications page
- Payment confirmations, new materials, installment reminders

### Course Materials
- Admin: Fees & Payments → Study Materials
- Students see materials for enrolled courses only
- Notify enrolled students when new material added
