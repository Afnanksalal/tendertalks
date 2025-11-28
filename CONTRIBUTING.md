# Contributing to TenderTalks

Thank you for your interest in contributing to TenderTalks! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/Afnanksalal/tendertalks/issues)
2. If not, create a new issue using the bug report template
3. Include:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Browser, OS, and device info

### Suggesting Features

1. Check existing issues for similar suggestions
2. Create a new issue with the `enhancement` label
3. Describe the feature and its use case
4. Explain why it would benefit users

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes following our code style
4. Run checks: `npm run lint && npm run typecheck && npm run build`
5. Commit with clear messages following conventional commits
6. Push to your fork: `git push origin feature/your-feature-name`
7. Open a Pull Request using the PR template

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/tendertalks.git
cd tendertalks

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your credentials (see .env.example for instructions)

# Push database schema
npm run db:push

# Run development server
npm run dev
```

### Required Services

You'll need accounts for:
- [Supabase](https://supabase.com) - Auth & Storage
- [Neon](https://neon.tech) - PostgreSQL Database
- [Razorpay](https://razorpay.com) - Payments (test mode)

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description |
|------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `style:` | Code style (formatting, semicolons, etc.) |
| `refactor:` | Code refactoring |
| `perf:` | Performance improvements |
| `test:` | Adding or updating tests |
| `chore:` | Maintenance tasks |
| `ci:` | CI/CD changes |

Examples:
```
feat: add playback speed control to media player
fix: resolve audio not playing on iOS Safari
docs: update README with blog system documentation
refactor: extract BlogCard component from Blog page
perf: lazy load BlogEditor for faster initial load
```

## Code Style

### TypeScript
- Use TypeScript for all new code
- Define proper types/interfaces (avoid `any`)
- Use meaningful variable and function names
- Export types from schema.ts for database entities

### React Components
- Use functional components with hooks
- Keep components focused and small
- Use Zustand for global state
- Prefer composition over prop drilling

### Styling
- Use Tailwind CSS utility classes
- Follow existing color scheme (neon-cyan, neon-purple, neon-green)
- Ensure responsive design (mobile-first)
- Use Framer Motion for animations

### File Organization
```
src/components/
├── feature/           # Feature-specific components
│   └── FeatureCard.tsx
├── ui/                # Reusable UI components
│   └── Button.tsx
└── layout/            # Layout components
    └── Navbar.tsx
```

### API Endpoints
- Use Edge Functions (Vercel)
- Validate inputs with Zod
- Return proper HTTP status codes
- Include CORS headers
- Check admin permissions where needed

## Project Structure

```
src/
├── api/          # Frontend API clients
├── components/   # React components
│   ├── auth/     # Authentication
│   ├── blog/     # Blog components
│   ├── cart/     # Shopping cart
│   ├── effects/  # Visual effects
│   ├── layout/   # Layout (Navbar, Footer)
│   ├── podcast/  # Podcast components
│   └── ui/       # Reusable UI
├── db/           # Database schema (Drizzle)
├── lib/          # Utilities (Supabase, Razorpay)
├── pages/        # Page components
│   ├── admin/    # Admin dashboard pages
│   └── legal/    # Legal pages
└── stores/       # Zustand state stores

api/              # Vercel Edge Functions
├── admin/        # Admin-only endpoints
├── blogs/        # Blog endpoints
├── podcasts/     # Podcast endpoints
├── payments/     # Payment processing
├── subscriptions/# Subscription management
├── users/        # User endpoints
└── ...
```

## Testing Checklist

Before submitting a PR:

- [ ] App builds without errors: `npm run build`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] No ESLint warnings: `npm run lint`
- [ ] Code is formatted: `npm run format`
- [ ] Tested on desktop (Chrome, Firefox, Safari)
- [ ] Tested on mobile (responsive design)
- [ ] Admin features tested with admin account
- [ ] Payment flows tested with Razorpay test mode

## Database Changes

If your PR includes database schema changes:

1. Update `src/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Test migration: `npm run db:push`
4. Include migration file in PR

## Adding New Features

### New Page
1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link if needed

### New API Endpoint
1. Create file in `api/` directory
2. Follow existing patterns for auth/validation
3. Add to `vercel.json` if needed

### New Component
1. Create in appropriate `src/components/` subdirectory
2. Export from component file
3. Use existing UI components where possible

## Questions?

- Open an issue for questions
- Check existing issues and discussions
- Reach out to maintainers

Thank you for contributing! 🎉
