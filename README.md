# TenderTalks 🎙️

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)

A modern podcast streaming platform with subscription management, merchandise store, and comprehensive admin dashboard. Built with React, TypeScript, and deployed on Vercel.

🌐 **Live Demo**: [tendertalks.live](https://tendertalks.live)

![TenderTalks Screenshot](https://tendertalks.live/api/og-image)

## ✨ Features

### 🎧 Podcast Platform
- Audio & video podcast streaming
- Playback speed control (0.5x - 2x)
- Volume control with mute toggle
- Progress tracking & resume playback
- Lock screen media controls (Media Session API)
- Download for offline listening

### 💳 Subscription System
- Multiple pricing tiers
- Upgrade/downgrade with prorated billing
- Cancel & reactivate subscriptions
- 7-day refund window
- Individual podcast purchases

### 🛍️ Merchandise Store
- Product catalog with categories
- Shopping cart functionality
- Razorpay payment integration
- Order tracking

### 👤 User Features
- Google OAuth authentication
- User dashboard
- Billing history
- Download management

### 🔧 Admin Dashboard
- Revenue analytics & charts
- Podcast management (CRUD)
- User management
- Payment & invoice tracking
- Subscription management
- Refund processing
- Product inventory
- Pricing plan configuration

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, Framer Motion |
| State | Zustand |
| Database | Neon PostgreSQL, Drizzle ORM |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Payments | Razorpay |
| Hosting | Vercel (Edge Functions) |
| Analytics | Vercel Analytics |

## 📁 Project Structure

```
tendertalks/
├── api/                    # Vercel serverless functions
│   ├── admin/              # Admin-only endpoints
│   ├── podcasts/           # Podcast CRUD & streaming
│   ├── payments/           # Payment processing
│   ├── subscriptions/      # Subscription management
│   └── users/              # User profile & data
├── drizzle/                # Database migrations
├── public/                 # Static assets
├── scripts/                # Utility scripts
├── src/
│   ├── api/                # Frontend API clients
│   ├── components/         # React components
│   │   ├── auth/           # Authentication components
│   │   ├── layout/         # Layout components
│   │   ├── podcast/        # Podcast components
│   │   └── ui/             # Reusable UI components
│   ├── db/                 # Database schema
│   ├── lib/                # Utilities
│   ├── pages/              # Page components
│   │   ├── admin/          # Admin pages
│   │   └── legal/          # Legal pages
│   └── stores/             # Zustand stores
├── .env.example            # Environment template
├── drizzle.config.ts       # Drizzle configuration
├── tailwind.config.js      # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
├── vercel.json             # Vercel configuration
└── vite.config.ts          # Vite configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
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

4. **Set up the database**
   ```bash
   npm run db:push
   npm run db:seed  # Optional: seed sample data
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open** [http://localhost:5173](http://localhost:5173)

### Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Neon Database
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Razorpay
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-secret

# App
VITE_APP_URL=http://localhost:5173
```

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed database |

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com/new)
3. Add environment variables in Project Settings
4. Deploy

### Environment Variables for Production

Set all variables from `.env.example` in Vercel:
- Use production Razorpay keys (`rzp_live_xxx`)
- Set `VITE_APP_URL` to your domain
- Configure OAuth redirect URLs in Supabase

## 🔐 Admin Access

To grant admin access:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

Run this in Neon Console or Drizzle Studio after the user has signed in.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

[![GitHub issues](https://img.shields.io/github/issues/Afnanksalal/tendertalks)](https://github.com/Afnanksalal/tendertalks/issues)
[![GitHub stars](https://img.shields.io/github/stars/Afnanksalal/tendertalks)](https://github.com/Afnanksalal/tendertalks/stargazers)

## 🔒 Security

For security issues, please see our [Security Policy](SECURITY.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Contact

- **Website**: [tendertalks.live](https://tendertalks.live)
- **Email**: support@tendertalks.live
- **Twitter**: [@tendertalks_](https://twitter.com/tendertalks_)

## 🙏 Acknowledgments

- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/)
- [Neon](https://neon.tech/)
- [Vercel](https://vercel.com/)
- [Razorpay](https://razorpay.com/)
- [Lucide Icons](https://lucide.dev/)

---

Made with ❤️ by Afnan & Jenna
