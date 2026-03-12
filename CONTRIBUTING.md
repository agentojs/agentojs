# Contributing to AgentOJS

Thank you for your interest in contributing to AgentOJS.

## Getting Started

1. Fork the repository: https://github.com/agentojs/agentojs
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/agentojs.git
   cd agentojs
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a feature branch:
   ```bash
   git checkout -b feat/my-feature
   ```

## Development

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Commands

```bash
pnpm -r build       # Build all packages
pnpm -r typecheck   # Type-check all packages
npx vitest run       # Run all tests
npx vitest           # Run tests in watch mode
```

### Project Structure

```
packages/
  core/          - Types and CommerceBackend interface
  medusa/        - Medusa.js v2 adapter
  woocommerce/   - WooCommerce adapter
  generic/       - Generic REST API adapter
examples/        - Example projects
```

## Making Changes

1. Write your code following existing patterns in the codebase.
2. Add tests for new functionality.
3. Ensure all checks pass:
   ```bash
   pnpm -r build && pnpm -r typecheck && npx vitest run
   ```
4. Commit with a descriptive message:
   ```bash
   git commit -m "feat: add support for X"
   ```

### Commit Message Format

- `feat:` -- new feature
- `fix:` -- bug fix
- `docs:` -- documentation only
- `test:` -- adding or updating tests
- `refactor:` -- code change that neither fixes a bug nor adds a feature

## Submitting a Pull Request

1. Push your branch to your fork.
2. Open a pull request against `main`.
3. Describe what your PR does and link any related issues.
4. Wait for CI to pass and a maintainer to review.

## Code Style

- TypeScript strict mode
- ESM (`"type": "module"`)
- No framework-specific dependencies in packages (keep them framework-agnostic)
- Use `.js` extensions in imports (NodeNext module resolution)

## Reporting Issues

Open an issue at https://github.com/agentojs/agentojs/issues with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Node.js and pnpm versions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
