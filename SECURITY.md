# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Email us at: **security@tendertalks.live**
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
   - Your contact information

### What to Expect

| Stage | Timeline |
|-------|----------|
| Acknowledgment | Within 48 hours |
| Initial Assessment | Within 7 days |
| Status Update | Every 7 days |

### Resolution Timeline

| Severity | Timeline |
|----------|----------|
| Critical | 24-48 hours |
| High | 7 days |
| Medium | 30 days |
| Low | 90 days |

## Scope

### In Scope

- Authentication/authorization bypass
- Data exposure vulnerabilities
- Payment processing security issues
- Cross-site scripting (XSS)
- SQL injection
- Server-side request forgery (SSRF)
- Insecure direct object references (IDOR)
- Privilege escalation
- Session management issues
- API security vulnerabilities

### Out of Scope

- Social engineering attacks
- Physical attacks
- Denial of service (DoS/DDoS)
- Issues in third-party services:
  - Supabase infrastructure
  - Razorpay payment gateway
  - Vercel hosting platform
  - Neon database service
- Issues requiring physical access
- Outdated browsers or platforms
- Self-XSS

## Security Best Practices

When contributing, please ensure:

### Environment Variables
- Never commit secrets to version control
- Use `.env` for local development
- Set production secrets in Vercel dashboard
- Rotate keys if accidentally exposed

### Authentication
- All admin endpoints check user role
- Use Supabase Auth for authentication
- Validate session tokens server-side
- Implement proper logout (clear tokens)

### Database
- Use parameterized queries (Drizzle ORM)
- Validate and sanitize all inputs
- Apply principle of least privilege
- Never expose database credentials

### API Security
- Validate all request inputs
- Return appropriate HTTP status codes
- Include CORS headers
- Rate limit sensitive endpoints
- Log security-relevant events

### Frontend
- Sanitize user-generated content
- Use `rehype-sanitize` for markdown
- Escape dynamic content in templates
- Validate file uploads (type, size)

### Payments
- Use Razorpay's secure checkout
- Verify payment signatures server-side
- Never log sensitive payment data
- Use HTTPS for all transactions

## Security Features

### Current Implementation

- **Authentication**: Supabase Auth with Google OAuth and email/password
- **Authorization**: Role-based access control (user/admin)
- **Data Protection**: HTTPS everywhere, secure cookies
- **Input Validation**: Server-side validation on all endpoints
- **Content Security**: Markdown sanitization with rehype-sanitize
- **Payment Security**: Razorpay signature verification
- **Session Management**: Secure token handling via Supabase

### Headers

The application sets security headers via `vercel.json`:
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy

## Dependency Security

- Run `npm audit` regularly
- Keep dependencies updated
- Review security advisories
- Use `npm audit fix` for automatic fixes

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who help us improve our security (with permission).

### Hall of Fame

*No submissions yet. Be the first!*

## Contact

- **Security Issues**: security@tendertalks.live
- **General Support**: support@tendertalks.live
- **GitHub**: [Issues](https://github.com/Afnanksalal/tendertalks/issues) (non-security only)
