import { describe, it, expect } from 'vitest';
import {
  generatePackageJson,
  generateEnvExample,
  generateIndexTs,
  generateTsconfig,
  generateReadme,
  generateAllFiles,
  type ScaffoldOptions,
} from '../templates.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function makeOptions(overrides?: Partial<ScaffoldOptions>): ScaffoldOptions {
  return {
    projectName: 'test-app',
    backend: 'medusa',
    protocols: ['mcp', 'ucp', 'acp'],
    packageManager: 'npm',
    ...overrides,
  };
}

// ─── package.json ────────────────────────────────────────────────────

describe('generatePackageJson', () => {
  it('generates valid JSON', () => {
    const json = generatePackageJson(makeOptions());
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes correct project name', () => {
    const pkg = JSON.parse(generatePackageJson(makeOptions({ projectName: 'my-shop' })));
    expect(pkg.name).toBe('my-shop');
  });

  it('includes @agentojs/core dependency', () => {
    const pkg = JSON.parse(generatePackageJson(makeOptions()));
    expect(pkg.dependencies['@agentojs/core']).toBe('^0.3.0');
  });

  it('includes medusa provider for medusa backend', () => {
    const pkg = JSON.parse(generatePackageJson(makeOptions({ backend: 'medusa' })));
    expect(pkg.dependencies['@agentojs/medusa']).toBe('^0.3.0');
  });

  it('includes woocommerce provider for woocommerce backend', () => {
    const pkg = JSON.parse(generatePackageJson(makeOptions({ backend: 'woocommerce' })));
    expect(pkg.dependencies['@agentojs/woocommerce']).toBe('^0.3.0');
  });

  it('includes shopify provider for shopify backend', () => {
    const pkg = JSON.parse(generatePackageJson(makeOptions({ backend: 'shopify' })));
    expect(pkg.dependencies['@agentojs/shopify']).toBe('^0.3.0');
  });

  it('includes generic provider for generic backend', () => {
    const pkg = JSON.parse(generatePackageJson(makeOptions({ backend: 'generic' })));
    expect(pkg.dependencies['@agentojs/generic']).toBe('^0.3.0');
  });

  it('includes protocol packages based on selection', () => {
    const pkg = JSON.parse(generatePackageJson(makeOptions({ protocols: ['mcp', 'acp'] })));
    expect(pkg.dependencies['@agentojs/mcp']).toBe('^0.3.0');
    expect(pkg.dependencies['@agentojs/acp']).toBe('^0.3.0');
    expect(pkg.dependencies['@agentojs/ucp']).toBeUndefined();
  });

  it('includes express and @agentojs/express', () => {
    const pkg = JSON.parse(generatePackageJson(makeOptions()));
    expect(pkg.dependencies['express']).toBeDefined();
    expect(pkg.dependencies['@agentojs/express']).toBe('^0.3.0');
  });

  it('sets type: module', () => {
    const pkg = JSON.parse(generatePackageJson(makeOptions()));
    expect(pkg.type).toBe('module');
  });

  it('includes typescript in devDependencies', () => {
    const pkg = JSON.parse(generatePackageJson(makeOptions()));
    expect(pkg.devDependencies.typescript).toBeDefined();
  });
});

// ─── .env.example ────────────────────────────────────────────────────

describe('generateEnvExample', () => {
  it('includes BACKEND_URL for medusa', () => {
    const env = generateEnvExample(makeOptions({ backend: 'medusa' }));
    expect(env).toContain('BACKEND_URL=');
    expect(env).toContain('API_KEY=');
  });

  it('includes WC_URL for woocommerce', () => {
    const env = generateEnvExample(makeOptions({ backend: 'woocommerce' }));
    expect(env).toContain('WC_URL=');
    expect(env).toContain('WC_CONSUMER_KEY=');
    expect(env).toContain('WC_CONSUMER_SECRET=');
  });

  it('includes SHOPIFY_DOMAIN for shopify', () => {
    const env = generateEnvExample(makeOptions({ backend: 'shopify' }));
    expect(env).toContain('SHOPIFY_DOMAIN=');
    expect(env).toContain('STOREFRONT_TOKEN=');
  });

  it('includes API_URL for generic', () => {
    const env = generateEnvExample(makeOptions({ backend: 'generic' }));
    expect(env).toContain('API_URL=');
    expect(env).toContain('API_KEY=');
  });

  it('includes PORT for all backends', () => {
    for (const backend of ['medusa', 'woocommerce', 'shopify', 'generic'] as const) {
      const env = generateEnvExample(makeOptions({ backend }));
      expect(env).toContain('PORT=');
    }
  });

  it('includes STORE_NAME and STORE_SLUG for all backends', () => {
    for (const backend of ['medusa', 'woocommerce', 'shopify', 'generic'] as const) {
      const env = generateEnvExample(makeOptions({ backend }));
      expect(env).toContain('STORE_NAME=');
      expect(env).toContain('STORE_SLUG=');
    }
  });
});

// ─── src/index.ts ────────────────────────────────────────────────────

describe('generateIndexTs', () => {
  it('imports createAgent from @agentojs/core', () => {
    const code = generateIndexTs(makeOptions());
    expect(code).toContain("import { createAgent } from '@agentojs/core'");
  });

  it('imports MedusaProvider for medusa backend', () => {
    const code = generateIndexTs(makeOptions({ backend: 'medusa' }));
    expect(code).toContain("import { MedusaProvider } from '@agentojs/medusa'");
  });

  it('imports WooCommerceProvider for woocommerce backend', () => {
    const code = generateIndexTs(makeOptions({ backend: 'woocommerce' }));
    expect(code).toContain("import { WooCommerceProvider } from '@agentojs/woocommerce'");
  });

  it('imports ShopifyProvider for shopify backend', () => {
    const code = generateIndexTs(makeOptions({ backend: 'shopify' }));
    expect(code).toContain("import { ShopifyProvider } from '@agentojs/shopify'");
  });

  it('imports GenericRESTProvider for generic backend', () => {
    const code = generateIndexTs(makeOptions({ backend: 'generic' }));
    expect(code).toContain("import { GenericRESTProvider } from '@agentojs/generic'");
  });

  it('sets enableMcp based on protocols', () => {
    const code = generateIndexTs(makeOptions({ protocols: ['mcp'] }));
    expect(code).toContain('enableMcp: true');
    expect(code).toContain('enableUcp: false');
    expect(code).toContain('enableAcp: false');
  });

  it('sets all protocols enabled when all selected', () => {
    const code = generateIndexTs(makeOptions({ protocols: ['mcp', 'ucp', 'acp'] }));
    expect(code).toContain('enableMcp: true');
    expect(code).toContain('enableUcp: true');
    expect(code).toContain('enableAcp: true');
  });

  it('uses project name as default store name', () => {
    const code = generateIndexTs(makeOptions({ projectName: 'cool-store' }));
    expect(code).toContain("'cool-store'");
  });

  it('calls agent.start()', () => {
    const code = generateIndexTs(makeOptions());
    expect(code).toContain('agent.start(port)');
  });
});

// ─── tsconfig.json ───────────────────────────────────────────────────

describe('generateTsconfig', () => {
  it('generates valid JSON', () => {
    const json = generateTsconfig();
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('targets ES2022', () => {
    const config = JSON.parse(generateTsconfig());
    expect(config.compilerOptions.target).toBe('ES2022');
  });

  it('uses NodeNext module', () => {
    const config = JSON.parse(generateTsconfig());
    expect(config.compilerOptions.module).toBe('NodeNext');
  });

  it('includes src directory', () => {
    const config = JSON.parse(generateTsconfig());
    expect(config.include).toContain('src');
  });
});

// ─── README.md ───────────────────────────────────────────────────────

describe('generateReadme', () => {
  it('includes project name as title', () => {
    const md = generateReadme(makeOptions({ projectName: 'my-store' }));
    expect(md).toContain('# my-store');
  });

  it('mentions backend name', () => {
    const md = generateReadme(makeOptions({ backend: 'shopify' }));
    expect(md).toContain('Shopify');
  });

  it('lists enabled protocols', () => {
    const md = generateReadme(makeOptions({ protocols: ['mcp', 'ucp'] }));
    expect(md).toContain('MCP');
    expect(md).toContain('UCP');
  });

  it('shows correct package manager in instructions', () => {
    const md = generateReadme(makeOptions({ packageManager: 'pnpm' }));
    expect(md).toContain('pnpm install');
    expect(md).toContain('pnpm dev');
  });

  it('includes endpoint docs for enabled protocols', () => {
    const md = generateReadme(makeOptions({ protocols: ['mcp', 'acp'] }));
    expect(md).toContain('POST /mcp');
    expect(md).toContain('POST /acp/checkout_sessions');
    expect(md).not.toContain('/ucp/products');
  });
});

// ─── generateAllFiles ────────────────────────────────────────────────

describe('generateAllFiles', () => {
  it('returns all 5 files', () => {
    const files = generateAllFiles(makeOptions());
    expect(Object.keys(files)).toHaveLength(5);
    expect(files['package.json']).toBeDefined();
    expect(files['.env.example']).toBeDefined();
    expect(files['src/index.ts']).toBeDefined();
    expect(files['tsconfig.json']).toBeDefined();
    expect(files['README.md']).toBeDefined();
  });

  it('generates correct files for each backend', () => {
    for (const backend of ['medusa', 'woocommerce', 'shopify', 'generic'] as const) {
      const files = generateAllFiles(makeOptions({ backend }));
      const pkg = JSON.parse(files['package.json']);
      // Each backend should have its provider package
      const providerPkg =
        backend === 'generic'
          ? '@agentojs/generic'
          : `@agentojs/${backend}`;
      expect(pkg.dependencies[providerPkg]).toBe('^0.3.0');
    }
  });
});
