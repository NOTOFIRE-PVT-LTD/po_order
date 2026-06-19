# Notofire PO Portal — Setup Guide

## Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- Resend account (for emails)
- Meta Developer account (for WhatsApp)

---

## 1. Supabase Setup

1. Create a new Supabase project at supabase.com
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Then run the contents of `supabase/storage.sql`
4. In **Authentication > URL Configuration**, add your app URL to Allowed Redirect URLs

Get your credentials from **Settings > API**:
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — service_role key (keep secret)

---

## 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

---

## 3. Resend Email

1. Sign up at resend.com
2. Add and verify your domain
3. Create an API key
4. Set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`

---

## 4. WhatsApp Cloud API

1. Go to developers.facebook.com
2. Create an app → Business → WhatsApp
3. Set up a phone number (or use the test number)
4. Get:
   - Phone Number ID → `WHATSAPP_PHONE_NUMBER_ID`
   - Temporary Access Token → `WHATSAPP_ACCESS_TOKEN`
5. For production, use a permanent token from Meta Business Manager

---

## 5. Create First Admin User

1. Go to Supabase Dashboard → Authentication → Users → Add User
2. Create user with email/password
3. In SQL Editor, manually set the role to admin:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

---

## 6. Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## 7. Deploy to Vercel

```bash
npm install -g vercel
vercel
# Follow prompts, add environment variables
```

Or push to GitHub and connect to Vercel for automatic deployments.

---

## Architecture

```
/dashboard          — Admin/Staff portal (auth required)
/dashboard/orders   — PO list and management
/dashboard/users    — User management (admin only)
/dashboard/audit-logs — Audit trail (admin only)

/portal/[token]     — Customer portal (no auth, token-based)

/api/purchase-orders — PO CRUD
/api/portal/[token]  — Customer-facing endpoints (public)
/api/upload          — File upload
```

## Security Model

- **Admin/Staff** authenticate via Supabase Auth (email/password)
- **Customers** access via unique 32-byte hex token embedded in URL
- **Row Level Security** enforces all data access rules at the database level
- Customer token is never exposed in any listing endpoint
- All file storage is private — customers get short-lived signed URLs

## Supabase Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `po-documents` | All official documents | Staff/Admin read+write |
| `payment-proofs` | Customer payment screenshots | Public upload, Staff read |
| `qr-codes` | UPI QR codes | Public read |
