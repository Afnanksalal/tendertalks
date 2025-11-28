# Contributing to TenderTalks

Thank you for your interest in contributing to TenderTalks! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/Afnanksalal/tendertalks/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (browser, OS, etc.)

### Suggesting Features

1. Check existing issues for similar suggestions
2. Create a new issue with the `enhancement` label
3. Describe the feature and its use case
4. Explain why it would benefit users

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run tests and linting: `npm run lint`
5. Commit with clear messages: `git commit -m "feat: add new feature"`
6. Push to your fork: `git push origin feature/your-feature-name`
7. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/Afnanksalal/tendertalks.git
cd tendertalks

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your credentials

# Run development server
npm run dev
```

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add playback speed control to media player
fix: resolve audio not playing on iOS Safari
docs: update README with deployment instructions
```

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns and conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Keep components small and focused

## Project Structure

```
src/
├── api/          # Frontend API clients
├── components/   # Reusable React components
├── db/           # Database schema
├── lib/          # Utility functions
├── pages/        # Page components
└── stores/       # Zustand state stores

api/              # Vercel serverless functions
```

## Testing

Before submitting a PR:

1. Ensure the app builds: `npm run build`
2. Test your changes locally
3. Check for TypeScript errors
4. Verify responsive design on mobile

## Questions?

Feel free to open an issue for any questions or reach out to the maintainers.

Thank you for contributing! 🎉
