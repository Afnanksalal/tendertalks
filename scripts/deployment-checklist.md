# TenderTalks Deployment Checklist

## Architecture Overview
- **Database**: Neon PostgreSQL (all data)
- **Auth**: Supabase Auth (Google OAuth + Email)
- **Storage**: Supabase Storage (media files)
- **Payments**: Razorpay
- **Hosting**: Vercel (frontend + API)

## Pre-Deployment

### 1. Neon Database Setup
- [ ] Create Neon project at https://neon.tech
- [ ] Copy connection string to `DATABASE_URL`
- [ ] Run migrations: `npm run db:push`
- [ ] Seed data: `npm run db:seed`

### 2. Supabase Setup (Auth + Storage ONLY)
- [ ] Create Supabase project at https://supabase.com
- [ ] Copy URL and keys to `.env`
- [ ] Enable Google OAuth in Authentication > Providers
- [ ] Add redirect URL: `https://your-domain.vercel.app/auth/callback`
- [ ] Run `scripts/supabase-setup.sql` in SQL Editor (creates storage buckets)

### 3. Razorpay Setup
- [ ] Create account at https://razorpay.com
- [ ] Get API keys from Dashboard > Settings > API Keys
- [ ] Add keys to `.env`

### 4. Environment Variables
```env
# Neon Database
DATABASE_URL=postgresql://...

# Supabase (Auth + Storage)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Razorpay
VITE_RAZORPAY_KEY_ID=rzp_xxx
RAZORPAY_KEY_ID=rzp_xxx
RAZORPAY_KEY_SECRET=xxx

# App
VITE_APP_URL=https://your-domain.vercel.app
```

## Vercel Deployment

1. Connect GitHub repo to Vercel
2. Add all environment variables
3. Deploy

## Post-Deployment

- [ ] Test authentication flow
- [ ] Test payment flow (use Razorpay test mode)
- [ ] Test file uploads
- [ ] Create admin user: `npm run db:seed <user-uuid> <email> <name>`
- [ ] Verify admin dashboard access

## Useful Commands

```bash
# Development
npm run dev

# Database
npm run db:push      # Push schema to Neon
npm run db:seed      # Seed initial data
npm run db:studio    # Open Drizzle Studio

# Build
npm run build
npm run preview
```
