# Publishing @agentojs Packages to npm

Step-by-step guide for publishing all packages to the npm registry.

## Prerequisites

1. An npm account: https://www.npmjs.com/signup
2. The `@agentojs` organization created on npmjs.com
3. You are a member of the `@agentojs` org with publish permissions

## One-Time Setup

### 1. Log in to npm

```bash
npm login
```

### 2. Create the @agentojs org (if not already created)

Go to https://www.npmjs.com/org/create and create `@agentojs` (free for public packages).

### 3. Verify access

```bash
npm whoami
npm org ls @agentojs
```

## Publishing

### 1. Ensure everything builds and passes

```bash
pnpm install
pnpm -r build
pnpm -r typecheck
npx vitest run
```

### 2. Verify package contents

Check what will be published for each package:

```bash
cd packages/core && npm pack --dry-run && cd ../..
cd packages/medusa && npm pack --dry-run && cd ../..
cd packages/woocommerce && npm pack --dry-run && cd ../..
cd packages/generic && npm pack --dry-run && cd ../..
```

Each package should only include: `dist/`, `README.md`, `LICENSE`, and `package.json`.

### 3. Publish all packages

```bash
pnpm publish:all
```

This runs `pnpm -r publish --access public --no-git-checks` which publishes all packages with public access.

Alternatively, publish packages individually in order (core must be first):

```bash
cd packages/core && npm publish --access public
cd packages/medusa && npm publish --access public
cd packages/woocommerce && npm publish --access public
cd packages/generic && npm publish --access public
```

### 4. Verify on npmjs.com

- https://www.npmjs.com/package/@agentojs/core
- https://www.npmjs.com/package/@agentojs/medusa
- https://www.npmjs.com/package/@agentojs/woocommerce
- https://www.npmjs.com/package/@agentojs/generic

## Version Bumping

Before publishing a new version, update the version in each package:

```bash
# Bump all packages to the same version
pnpm -r exec -- npm version patch   # 0.1.0 -> 0.1.1
pnpm -r exec -- npm version minor   # 0.1.0 -> 0.2.0
pnpm -r exec -- npm version major   # 0.1.0 -> 1.0.0
```

Then rebuild and publish:

```bash
pnpm -r build
pnpm publish:all
```

## CI Publishing (Future)

The `.npmrc` file is configured to use `NPM_TOKEN` for authentication. To enable CI publishing:

1. Generate an npm access token: https://www.npmjs.com/settings/tokens
2. Add `NPM_TOKEN` as a secret in your GitHub repository settings
3. Add a publish job to `.github/workflows/ci.yml` that runs on tag push

## Troubleshooting

**"You must be logged in to publish packages"**
Run `npm login` and try again.

**"403 Forbidden - Package name too similar to existing package"**
The `@agentojs` scope prevents name collisions. Ensure you are publishing scoped packages.

**"402 Payment Required"**
Scoped packages default to private. Use `--access public` flag (already included in the publish script).

**"EPUBLISHCONFLICT - Cannot publish over previously published version"**
Bump the version before publishing. See Version Bumping section above.
