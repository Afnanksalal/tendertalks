# TenderTalks Deployment Checklist

## Architecture Overview
- **Database**: Neon PostgreSQL (all data)
- **Auth**: Supabase Auth (Google OAuth + Email)
- **Storage**: Supabase Storage (media files)
- **Payments**: Razorpay
- **Hosting**: Vercel (frontend + API)
- **Domain**: tendertalks.live (primary), www.tendertalks.live (redirect), tendertalks.vercel.app (fallback)

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
- [ ] Configure URL settings (see Domain Configuration below)
- [ ] Run `scripts/supabase-setup.sql` in SQL Editor (creates storage buckets)

### 3. Razorpay Setup
- [ ] Create account at https://razorpay.com
- [ ] Get API keys from Dashboard > Settings > API Keys
- [ ] Add keys to `.env`
- [ ] Configure webhooks (see Webhook Configuration below)

### 4. Environment Variables
```env
# Neon Database
DATABASE_URL=postgresql://...

# Supabase (Auth + Storage)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Razorpay
VITE_RAZORPAY_KEY_ID=rzp_xxx
RAZORPAY_KEY_ID=rzp_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# App
VITE_APP_URL=https://tendertalks.live
VITE_APP_NAME=TenderTalks
```

## Domain Configuration

### Vercel Domain Setup
1. Go to Vercel Dashboard > Your Project > Settings > Domains
2. Add `tendertalks.live` as primary domain
3. Add `www.tendertalks.live` with redirect to `tendertalks.live`
4. Keep `tendertalks.vercel.app` as fallback
5. Configure DNS at your domain registrar:
   - A record: `@` → Vercel IP (or use CNAME)
   - CNAME: `www` → `cname.vercel-dns.com`

### Supabase Auth URL Configuration
Go to Supabase Dashboard > Authentication > URL Configuration:

1. **Site URL**: `https://tendertalks.live`

2. **Redirect URLs** (add ALL of these):
   - `https://tendertalks.live/auth/callback`
   - `https://www.tendertalks.live/auth/callback`
   - `https://tendertalks.vercel.app/auth/callback`
   - `http://localhost:5173/auth/callback`

### Google OAuth Setup (if using Google Sign-In)
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Edit your OAuth 2.0 Client ID
3. **Authorized JavaScript origins**:
   - `https://tendertalks.live`
   - `https://www.tendertalks.live`
   - `https://tendertalks.vercel.app`
   - `http://localhost:5173`
4. **Authorized redirect URIs**:
   - `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
   (This is the Supabase callback URL, found in Supabase Dashboard > Authentication > Providers > Google)

## Webhook Configuration

### Razorpay Webhooks
1. Go to Razorpay Dashboard > Webhooks
2. Create webhook with URL: `https://tendertalks.live/api/payments/webhook`
3. Select events:
   - payment.authorized
   - payment.captured
   - payment.failed
   - refund.created
   - refund.processed
   - refund.failed
   - subscription.activated
   - subscription.charged
   - subscription.cancelled
   - subscription.halted
   - invoice.paid
   - invoice.expired
   - order.paid
4. Copy webhook secret to `RAZORPAY_WEBHOOK_SECRET`

## Vercel Deployment

1. Connect GitHub repo to Vercel
2. Add all environment variables (both VITE_ and server-side)
3. Deploy
4. Configure custom domain

## Post-Deployment Checklist

- [ ] Test authentication flow (Google + Email)
- [ ] Test payment flow (use Razorpay test mode first)
- [ ] Test file uploads (thumbnails, media)
- [ ] Test media playback
- [ ] Create admin user: Update user role in database
- [ ] Verify admin dashboard access
- [ ] Test on mobile devices
- [ ] Check SSL certificate is active
- [ ] Verify www redirect works

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

## Troubleshooting

### Auth not working
- Check Supabase redirect URLs include your domain
- Verify Google OAuth credentials are correct
- Check browser console for errors

### Payments failing
- Verify Razorpay keys are correct (test vs live)
- Check webhook URL is accessible
- Verify webhook secret matches

### Media not loading
- Check Supabase storage buckets exist
- Verify storage policies are set correctly
- Check CORS settings if needed
