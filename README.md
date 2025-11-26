# TenderTalks - Premium Podcast Platform

A full-stack serverless SaaS platform for premium audio/video podcast content with subscription and individual purchase options. Built with a beautiful cyberpunk/neon aesthetic.

![TenderTalks](https://via.placeholder.com/1200x630/030014/00F0FF?text=TenderTalks)

## ✨ Features

### User Features
- 🎧 Browse free and premium podcasts (audio & video)
- 💳 Purchase individual episodes via Razorpay
- 📦 Subscribe for unlimited access
- 👤 User dashboard with purchase history
- 🔐 Google OAuth & Email authentication
- 📱 Fully responsive mobile-first design

### Admin Features
- 📝 Create/edit/delete podcasts
- 📤 Upload audio/video to Supabase Storage
- 💰 Set pricing (free or paid)
- 📊 View analytics & manage users
- 🚀 Publish/schedule content

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Tailwind CSS, Framer Motion |
| State | Zustand |
| Database | Neon PostgreSQL + Drizzle ORM |
| Auth | Supabase Auth (Google + Email) |
| Storage | Supabase Storage |
| Payments | Razorpay |
| Deployment | Vercel (Edge Functions) |

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd tendertalks
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in your values:

```env
# Supabase (https://supabase.com)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Neon Database (https://neon.tech)
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# Razorpay (https://razorpay.com)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# App
VITE_APP_URL=http://localhost:3000
```

### 3. Database Setup

```bash
# Generate migrations
npm run db:generate

# Push to database
npm run db:push

# Open Drizzle Studio (optional)
npm run db:studio
```

### 4. Supabase Setup

1. Create a new Supabase project
2. Enable Google OAuth in **Authentication > Providers**
3. Create storage buckets:
   - `podcasts` - for audio/video files
   - `thumbnails` - for images
4. Set bucket policies for public read access

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
tendertalks/
├── api/                    # Serverless API functions (Vercel)
│   ├── categories/
│   ├── payments/
│   ├── podcasts/
│   ├── pricing-plans/
│   └── users/
├── src/
│   ├── components/         # React components
│   │   ├── auth/          # Authentication modals
│   │   ├── layout/        # Navbar, Footer
│   │   ├── podcast/       # Podcast cards, player
│   │   └── ui/            # Reusable UI components
│   ├── db/                # Drizzle schema & client
│   ├── lib/               # Supabase, Razorpay clients
│   ├── pages/             # Page components
│   │   └── admin/         # Admin dashboard
│   ├── stores/            # Zustand stores
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── drizzle.config.ts
```

## 🗄 Database Schema

```sql
-- Core tables
users           -- User profiles (synced with Supabase Auth)
podcasts        -- Podcast content
categories      -- Podcast categories
tags            -- Content tags

-- Commerce
pricing_plans   -- Subscription plans
subscriptions   -- User subscriptions
purchases       -- Individual purchases

-- Analytics
play_history    -- User watch/listen history
```

### Seed Data

```sql
-- Categories
INSERT INTO categories (name, slug) VALUES
('Technology', 'technology'),
('Business', 'business'),
('Science', 'science');

-- Pricing Plans
INSERT INTO pricing_plans (name, slug, price, currency, interval, features, is_active, sort_order) VALUES
('Free', 'free', 0, 'INR', 'month', ARRAY['Access free episodes', 'Standard quality'], true, 0),
('Pro', 'pro', 499, 'INR', 'month', ARRAY['All episodes', 'HD quality', 'Download offline'], true, 1),
('Annual', 'annual', 4799, 'INR', 'year', ARRAY['Everything in Pro', '2 months free'], true, 2);
```

## 👑 Admin Access

To make a user an admin:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

## 🚢 Deployment

### Vercel

1. Connect your GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy!

The `/api` routes automatically become serverless functions.

### Environment Variables for Production

Set these in your Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `VITE_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `VITE_APP_URL`

## 📱 Mobile Optimization

- Responsive design with mobile-first approach
- Touch-friendly interactions
- Safe area insets for notched devices
- Optimized animations for 60fps
- Lazy loading for images

## 🎨 Design System

### Colors
- **Background**: `#030014` (Deep space)
- **Neon Cyan**: `#00F0FF` (Primary accent)
- **Neon Purple**: `#7000FF` (Secondary accent)
- **Neon Green**: `#00FF94` (Success)

### Typography
- **Display**: Space Grotesk
- **Body**: Inter

## 📄 License

MIT

---

Built with ❤️ by TenderTalks Team
