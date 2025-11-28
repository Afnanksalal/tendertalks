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

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Resolution Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: 90 days

### Scope

In scope:
- Authentication/authorization issues
- Data exposure vulnerabilities
- Payment processing security
- Cross-site scripting (XSS)
- SQL injection
- Server-side request forgery (SSRF)
- Insecure direct object references

Out of scope:
- Social engineering attacks
- Physical attacks
- Denial of service attacks
- Issues in third-party services (Supabase, Razorpay, etc.)

## Security Best Practices

When contributing, please ensure:

1. **Never commit secrets** - Use environment variables
2. **Validate all inputs** - Both client and server side
3. **Use parameterized queries** - Prevent SQL injection
4. **Implement proper authentication** - Check user permissions
5. **Sanitize outputs** - Prevent XSS attacks
6. **Keep dependencies updated** - Run `npm audit` regularly

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who help us improve our security.
