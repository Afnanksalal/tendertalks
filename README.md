# TenderTalks

A modern podcast streaming platform with subscription management, merchandise store, and comprehensive admin dashboard. Built with React, Vite, and deployed on Vercel with Neon PostgreSQL.

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Framer Motion for animations
- Zustand for state management
- React Router for navigation

**Backend:**
- Vercel Edge Functions (serverless API)
- Neon PostgreSQL (serverless database)
- Drizzle ORM for database operations
- Supabase for authentication & file storage

**Payments:**
- Razorpay for payment processing (INR)

**Analytics:**
- Vercel Analytics

## Features

### Public Pages
- **Home** - Landing page with featured content
- **Browse** - Podcast catalog with category/tag filtering
- **Podcast Detail** - Individual podcast page with media player
- **Pricing** - Subscription plans with upgrade/downgrade support
- **Store** - Merchandise shop with cart functionality

### User Features
- Google OAuth authentication via Supabase
- Dashboard with listening history and progress tracking
- Subscription management (subscribe, upgrade, downgrade, cancel)
- Individual podcast purchases
- Merchandise ordering with shipping
- Download management for offline content
- Billing history and payment records

### Admin Dashboard
- **Overview** - Revenue analytics, user metrics, charts
- **Podcasts** - Create, edit, publish, delete podcasts
- **Users** - User management and role assignment
- **Payments** - Transaction history
- **Invoices** - Invoice management
- **Subscriptions** - Active subscription management
- **Refunds** - Process refund requests
- **Products** - Merchandise inventory management
- **Plans** - Pricing plan configuration
- **Settings** - Platform configuration

### Media Support
- Audio podcasts (MP3, WAV, etc.)
- Video podcasts (MP4, WebM, etc.)
- Thumbnail images
- Progress tracking and resume playback

## Project Structure

```
├── api/                    # Vercel serverless functions
│   ├── admin/              # Admin-only endpoints
│   ├── categories/         # Category endpoints
│   ├── merch/              # Merchandise & orders
│   ├── newsletter/         # Newsletter subscription
│   ├── payments/           # Payment processing
│   ├── podcasts/           # Podcast CRUD & streaming
│   ├── pricing-plans/      # Subscription plans
│   ├── refunds/            # Refund requests
│   ├── subscriptions/      # Subscription management
│   ├── tags/               # Tag endpoints
│   └── users/              # User profile & data
├── drizzle/                # Database migrations
├── public/                 # Static assets
├── scripts/                # Utility scripts
│   ├── seed.ts             # Database seeding
│   └── supabase-setup.sql  # Supabase SQL setup
├── src/
│   ├── api/                # Frontend API clients
│   ├── components/         # React components
│   ├── db/                 # Database schema
│   ├── lib/                # Utilities (Supabase, Razorpay, storage)
│   ├── pages/              # Page components
│   └── stores/             # Zustand stores
└── vercel.json             # Vercel configuration
```

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Accounts: Vercel, Neon, Supabase, Razorpay

### 1. Clone and Install

```bash
git clone <repository-url>
cd tendertalks
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 3. Database Setup

**Neon PostgreSQL:**
1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string to `DATABASE_URL`

**Run migrations:**
```bash
npm run db:push
```

**Seed initial data (optional):**
```bash
npm run db:seed
```

### 4. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Enable Google OAuth in Authentication > Providers
3. Create storage buckets: `podcasts`, `thumbnails`, `merch`
4. Run the SQL from `scripts/supabase-setup.sql` in SQL Editor
5. Copy credentials to environment variables

### 5. Razorpay Setup

1. Create account at [razorpay.com](https://razorpay.com)
2. Get API keys from Dashboard > Settings > API Keys
3. Copy Key ID and Secret to environment variables

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add all environment variables in Project Settings
4. Deploy

**Required Environment Variables in Vercel:**
- All variables from `.env.example`
- Set `VITE_APP_URL` to your production domain

### Custom Domain

1. Add domain in Vercel Dashboard > Settings > Domains
2. Configure DNS records as instructed
3. Update `VITE_APP_URL` to your domain

## Database Commands

```bash
# Generate migrations from schema changes
npm run db:generate

# Push schema to database
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio

# Seed database with sample data
npm run db:seed
```

## Admin Access

To make a user an admin:

1. User must sign in first (creates user record)
2. Run SQL in Neon or Drizzle Studio:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## API Endpoints

### Public
- `GET /api/podcasts` - List podcasts
- `GET /api/podcasts/:slug` - Get podcast details
- `GET /api/categories` - List categories
- `GET /api/tags` - List tags
- `GET /api/pricing-plans` - List subscription plans
- `GET /api/merch` - List merchandise
- `POST /api/newsletter/subscribe` - Subscribe to newsletter

### Authenticated (requires X-User-Id header)
- `GET /api/users/profile` - Get user profile
- `GET /api/users/subscription` - Get user subscription
- `GET /api/users/purchases` - Get user purchases
- `GET /api/users/downloads` - Get user downloads
- `POST /api/payments/create-order` - Create payment order
- `POST /api/payments/verify` - Verify payment
- `POST /api/subscriptions/create` - Create subscription
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/merch/create-order` - Create merch order

### Admin (requires admin role)
- `GET /api/admin/stats` - Dashboard statistics
- `GET/POST /api/admin/podcasts` - Manage podcasts
- `GET/POST /api/admin/users` - Manage users
- `GET/POST /api/admin/plans` - Manage pricing plans
- `GET/POST /api/admin/products` - Manage merchandise
- `GET/POST /api/admin/refunds` - Process refunds

## License

Private - All rights reserved.
