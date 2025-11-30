# TenderTalks 🎙️

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)

A modern podcast streaming platform with blog system, subscription management, merchandise store, and comprehensive admin dashboard. Built with React, TypeScript, and deployed on Vercel Edge Functions.

🌐 **Live Demo**: [tendertalks.live](https://tendertalks.live)

![TenderTalks Screenshot](./TenderTalks.png)

## ✨ Features

### 🎧 Podcast Platform
- Audio & video podcast streaming with custom player
- Playback speed control (0.5x - 2x)
- Volume control with mute toggle
- Progress tracking & resume playback
- Lock screen media controls (Media Session API)
- Download for offline listening (subscription feature)
- Category & tag filtering
- Fullscreen video support
- Session persistence (resume where you left off)

### 📝 Blog System
- Full markdown blog with rich editor
- Featured articles support
- Tag-based filtering
- Author attribution
- Read time estimation
- SEO optimized with Open Graph
- Syntax highlighting for code blocks
- Image galleries and embeds

### 💳 Subscription System
- Multiple pricing tiers (Free, Pro, Premium)
- Upgrade/downgrade with prorated billing
- Cancel & reactivate subscriptions
- 7-day refund window
- Individual podcast purchases
- Razorpay payment integration
- Webhook support for payment events

### 🛍️ Merchandise Store
- Product catalog with categories (clothing, accessories, digital)
- Shopping cart with persistent state
- Secure checkout via Razorpay
- Stock management
- Product image uploads

### 👤 User Features
- Google OAuth & Email/Password authentication
- User dashboard with listening history
- Billing & payment history
- Download management
- Profile settings
- Subscription management

### 🔧 Admin Dashboard
- Revenue analytics with charts
- Podcast management (CRUD, publish/draft)
- Blog management with markdown editor
- User management & roles
- Payment & invoice tracking
- Subscription management (pause, cancel, extend)
- Refund processing with Razorpay integration
- Product inventory management
- Pricing plan configuration
- Category & tag management

### ⚙️ Platform Settings (Admin)
- **Feature Toggles**: Enable/disable features dynamically
  - Blog section
  - Merchandise store
  - Subscription system
  - Downloads
  - Newsletter signup
- **Maintenance Mode**: Show maintenance page to non-admin users
- Real-time toggle updates across the platform

### 📱 Mobile Optimized
- Fully responsive design for all screen sizes
- Touch-optimized interactions with haptic feedback
- Safe area support for notched devices (iPhone X+)
- iOS Safari fixes (100vh, input zoom prevention)
- Mobile-friendly admin dashboard with slide-out menu
- PWA-ready with manifest and icons

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18.3, TypeScript 5.5, Vite 5 |
| Styling | Tailwind CSS 3.4, Framer Motion 11 |
| State | Zustand 4.5 |
| Database | Neon PostgreSQL, Drizzle ORM |
| Auth | Supabase Auth (Google OAuth + Email) |
| Storage | Supabase Storage |
| Payments | Razorpay |
| Hosting | Vercel (Edge Functions) |
| Analytics | Vercel Analytics |
| Markdown | @uiw/react-md-editor, react-markdown |
| Icons | Lucide React |

## 📁 Project Structure

```
tendertalks/
├── api/                    # Vercel Edge Functions
│   ├── admin/              # Admin-only endpoints
│   │   ├── blogs/          # Blog CRUD
│   │   ├── podcasts/       # Podcast CRUD
│   │   ├── categories/     # Category management
│   │   ├── tags/           # Tag management
│   │   ├── plans/          # Pricing plans
│   │   ├── products/       # Merch products
│   │   ├── settings/       # Feature toggles (admin)
│   │   ├── users.ts        # User management
│   │   ├── payments.ts     # Payment history
│   │   ├── invoices/       # Invoice management
│   │   ├── subscriptions/  # Subscription management
│   │   ├── refunds/        # Refund processing
│   │   └── stats.ts        # Analytics data
│   ├── blogs/              # Public blog endpoints
│   ├── podcasts/           # Public podcast endpoints
│   ├── payments/           # Payment processing
│   ├── subscriptions/      # Subscription operations
│   ├── merch/              # Merchandise endpoints
│   ├── users/              # User profile & data
│   ├── pricing-plans/      # Public pricing data
│   ├── categories/         # Public categories
│   ├── tags/               # Public tags
│   ├── newsletter/         # Newsletter subscription
│   ├── refunds/            # Refund requests
│   ├── settings/           # Public settings (feature flags)
│   ├── og-image.tsx        # Dynamic OG images
│   └── rss.ts              # RSS feed
├── drizzle/                # Database migrations
├── public/                 # Static assets
│   ├── favicon.svg
│   ├── manifest.json
│   ├── og-image.svg
│   └── sitemap.xml
├── scripts/
│   ├── seed.ts             # Database seeding
│   └── supabase-setup.sql  # Supabase configuration
├── src/
│   ├── api/                # Frontend API clients
│   ├── components/
│   │   ├── auth/           # AuthModal
│   │   ├── blog/           # BlogCard
│   │   ├── cart/           # CartDrawer
│   │   ├── effects/        # StarField, FloatingOrbs
│   │   ├── layout/         # Navbar, Footer
│   │   ├── podcast/        # PodcastCard, MediaPlayer
│   │   ├── ui/             # Button, Input, Modal, Select, Toggle, etc.
│   │   ├── FeatureGuard.tsx    # Route protection by feature
│   │   ├── ErrorBoundary.tsx   # Error handling
│   │   ├── SEO.tsx             # Meta tags & Open Graph
│   │   └── CustomCursor.tsx    # Desktop cursor effect
│   ├── db/
│   │   └── schema.ts       # Drizzle schema
│   ├── lib/
│   │   ├── supabase.ts     # Supabase client
│   │   ├── razorpay.ts     # Razorpay integration
│   │   └── storage.ts      # Storage utilities
│   ├── pages/
│   │   ├── admin/          # Admin pages
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── PodcastManager.tsx
│   │   │   ├── PodcastEditor.tsx
│   │   │   ├── BlogManager.tsx
│   │   │   ├── BlogEditor.tsx
│   │   │   ├── UsersManager.tsx
│   │   │   ├── PaymentsManager.tsx
│   │   │   ├── InvoicesManager.tsx
│   │   │   ├── SubscriptionsManager.tsx
│   │   │   ├── RefundsManager.tsx
│   │   │   ├── ProductsManager.tsx
│   │   │   ├── PlansManager.tsx
│   │   │   └── SettingsManager.tsx  # Feature toggles & maintenance
│   │   ├── legal/          # Legal pages
│   │   │   ├── PrivacyPolicy.tsx
│   │   │   ├── TermsOfService.tsx
│   │   │   └── RefundPolicy.tsx
│   │   ├── Home.tsx
│   │   ├── Browse.tsx
│   │   ├── PodcastDetail.tsx
│   │   ├── Blog.tsx
│   │   ├── BlogDetail.tsx
│   │   ├── Pricing.tsx
│   │   ├── Store.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Settings.tsx
│   │   ├── Billing.tsx
│   │   ├── Downloads.tsx
│   │   ├── AuthCallback.tsx
│   │   ├── NotFound.tsx
│   │   └── Maintenance.tsx     # Maintenance mode page
│   ├── stores/             # Zustand stores
│   │   ├── authStore.ts
│   │   ├── podcastStore.ts
│   │   ├── blogStore.ts
│   │   ├── userStore.ts
│   │   ├── cartStore.ts
│   │   ├── merchStore.ts
│   │   └── settingsStore.ts    # Feature toggles state
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── .gitignore
├── .prettierrc
├── drizzle.config.ts
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vercel.json
└── vite.config.ts
```

## � Getting Started

### Prerequisites

- Node.js 18+ (see `.nvmrc`)
- npm 9+
- Accounts: [Vercel](https://vercel.com), [Neon](https://neon.tech), [Supabase](https://supabase.com), [Razorpay](https://razorpay.com)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Afnanksalal/tendertalks.git
   cd tendertalks
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in your credentials (see [Environment Variables](#environment-variables))

4. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL from `scripts/supabase-setup.sql` in SQL Editor
   - Create storage buckets: `podcasts`, `blogs`, `products`
   - Enable Google OAuth in Authentication > Providers

5. **Set up the database**
   ```bash
   npm run db:push
   npm run db:seed  # Optional: seed sample data
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open** [http://localhost:5173](http://localhost:5173)

### Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase (Authentication & Storage)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Neon Database
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Razorpay Payments
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-secret

# App Configuration
VITE_APP_URL=http://localhost:5173
VITE_APP_NAME=TenderTalks
```

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | TypeScript check + Vite build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed database with sample data |
| `npm run clean` | Clean build artifacts |

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com/new)
3. Add environment variables in Project Settings
4. Deploy

### Environment Variables for Production

Set all variables from `.env.example` in Vercel:
- Use production Razorpay keys (`rzp_live_xxx`)
- Set `VITE_APP_URL` to your domain (e.g., `https://tendertalks.live`)
- Configure OAuth redirect URLs in Supabase Dashboard

### Supabase Configuration

1. Add your production domain to Authentication > URL Configuration
2. Set Site URL to your domain
3. Add redirect URLs: `https://yourdomain.com/auth/callback`

## 🔐 Admin Access

To grant admin access to a user:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

Run this in Neon Console or Drizzle Studio after the user has signed in.

## ⚙️ Feature Toggles & Maintenance Mode

The platform includes a powerful admin settings system accessible at `/admin/settings`:

### Feature Toggles
Toggle features on/off without code changes:
- **Blog**: Enable/disable the blog section
- **Merchandise Store**: Enable/disable the store
- **Subscriptions**: Enable/disable subscription plans
- **Downloads**: Enable/disable podcast downloads
- **Newsletter**: Enable/disable newsletter signup

When a feature is disabled:
- Navigation links are hidden
- Routes redirect to home page
- API endpoints return appropriate errors

### Maintenance Mode
When enabled:
- Non-admin users see a styled maintenance page
- Admins see a warning banner but can still access the site
- Toggle from Admin Settings → Maintenance Mode

Settings are stored in the `site_settings` table and cached in the frontend via Zustand.

## 📊 Database Schema

Key tables:
- `users` - User accounts with roles
- `podcasts` - Audio/video content
- `blogs` - Blog articles (content stored in Supabase Storage)
- `categories` - Content categories
- `tags` - Content tags
- `pricing_plans` - Subscription tiers
- `subscriptions` - User subscriptions
- `purchases` - Individual podcast purchases
- `payment_history` - All transactions
- `refund_requests` - Refund processing
- `merch_items` - Store products
- `merch_orders` - Store orders
- `downloads` - Download tracking
- `play_history` - Playback progress
- `newsletter_subscribers` - Email list
- `site_settings` - Feature toggles & platform configuration

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔒 Security

For security issues, please see our [Security Policy](SECURITY.md).

**Do not** create public issues for security vulnerabilities. Email security@tendertalks.live instead.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Contact

- **Website**: [tendertalks.live](https://tendertalks.live)
- **Support**: support@tendertalks.live
- **Sales**: sales@tendertalks.live
- **Security**: security@tendertalks.live
- **Twitter**: [@tendertalks_](https://twitter.com/tendertalks_)
- **Instagram**: [@tendertalks.live](https://instagram.com/tendertalks.live)
- **YouTube**: [@tendertalkslive](https://youtube.com/@tendertalkslive)
- **LinkedIn**: [TenderTalks](https://www.linkedin.com/company/tendertalks)

## 🙏 Acknowledgments

- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Supabase](https://supabase.com/)
- [Neon](https://neon.tech/)
- [Vercel](https://vercel.com/)
- [Razorpay](https://razorpay.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Lucide Icons](https://lucide.dev/)
- [Zustand](https://zustand-demo.pmnd.rs/)

---

Made with ❤️ by Afnan & Jenna
