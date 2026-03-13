/**
 * Template generators for create-agentojs-app.
 *
 * Each backend generates a complete project scaffold:
 * package.json, src/index.ts, .env.example, tsconfig.json, README.md
 */

export type Backend = 'medusa' | 'woocommerce' | 'shopify' | 'generic';
export type PackageManager = 'npm' | 'pnpm' | 'yarn';

export interface ScaffoldOptions {
  projectName: string;
  backend: Backend;
  protocols: ('mcp' | 'ucp' | 'acp')[];
  packageManager: PackageManager;
}

// ─── Package.json ────────────────────────────────────────────────────

const PROVIDER_PACKAGES: Record<Backend, string> = {
  medusa: '@agentojs/medusa',
  woocommerce: '@agentojs/woocommerce',
  shopify: '@agentojs/shopify',
  generic: '@agentojs/generic',
};

export function generatePackageJson(options: ScaffoldOptions): string {
  const deps: Record<string, string> = {
    '@agentojs/core': '^0.3.0',
    [PROVIDER_PACKAGES[options.backend]]: '^0.3.0',
    '@agentojs/express': '^0.3.0',
    express: '^4.21.0',
  };

  // Protocol packages
  for (const p of options.protocols) {
    deps[`@agentojs/${p}`] = '^0.3.0';
  }

  const pkg = {
    name: options.projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'node --watch --loader ts-node/esm src/index.ts',
      build: 'tsc',
      start: 'node dist/index.js',
    },
    dependencies: deps,
    devDependencies: {
      typescript: '^5.7.0',
      'ts-node': '^10.9.0',
      '@types/express': '^5.0.0',
    },
  };

  return JSON.stringify(pkg, null, 2) + '\n';
}

// ─── .env.example ────────────────────────────────────────────────────

const ENV_TEMPLATES: Record<Backend, string> = {
  medusa: `# Medusa.js v2 Configuration
STORE_NAME=My Store
STORE_SLUG=my-store
BACKEND_URL=http://localhost:9000
API_KEY=your-medusa-api-key
PORT=3100
`,
  woocommerce: `# WooCommerce Configuration
STORE_NAME=My Store
STORE_SLUG=my-store
WC_URL=https://your-store.com
WC_CONSUMER_KEY=ck_your_consumer_key
WC_CONSUMER_SECRET=cs_your_consumer_secret
PORT=3100
`,
  shopify: `# Shopify Storefront Configuration
STORE_NAME=My Store
STORE_SLUG=my-store
SHOPIFY_DOMAIN=your-store.myshopify.com
STOREFRONT_TOKEN=your-storefront-access-token
PORT=3100
`,
  generic: `# Generic REST API Configuration
STORE_NAME=My Store
STORE_SLUG=my-store
API_URL=https://api.your-store.com
API_KEY=your-api-key
PORT=3100
`,
};

export function generateEnvExample(options: ScaffoldOptions): string {
  return ENV_TEMPLATES[options.backend];
}

// ─── src/index.ts ────────────────────────────────────────────────────

const PROVIDER_IMPORTS: Record<Backend, string> = {
  medusa: `import { MedusaProvider } from '@agentojs/medusa';`,
  woocommerce: `import { WooCommerceProvider } from '@agentojs/woocommerce';`,
  shopify: `import { ShopifyProvider } from '@agentojs/shopify';`,
  generic: `import { GenericRESTProvider } from '@agentojs/generic';`,
};

const PROVIDER_CONSTRUCTORS: Record<Backend, string> = {
  medusa: `new MedusaProvider({
    backendUrl: process.env.BACKEND_URL!,
    apiKey: process.env.API_KEY!,
  })`,
  woocommerce: `new WooCommerceProvider({
    baseUrl: process.env.WC_URL!,
    consumerKey: process.env.WC_CONSUMER_KEY!,
    consumerSecret: process.env.WC_CONSUMER_SECRET!,
  })`,
  shopify: `new ShopifyProvider({
    storeDomain: process.env.SHOPIFY_DOMAIN!,
    storefrontAccessToken: process.env.STOREFRONT_TOKEN!,
  })`,
  generic: `new GenericRESTProvider({
    baseUrl: process.env.API_URL!,
    apiKey: process.env.API_KEY!,
  })`,
};

export function generateIndexTs(options: ScaffoldOptions): string {
  const enableFlags = ['mcp', 'ucp', 'acp']
    .map((p) => `  enable${p.charAt(0).toUpperCase() + p.slice(1)}: ${options.protocols.includes(p as 'mcp' | 'ucp' | 'acp')},`)
    .join('\n');

  return `import { createAgent } from '@agentojs/core';
${PROVIDER_IMPORTS[options.backend]}

const agent = await createAgent({
  store: {
    name: process.env.STORE_NAME || '${options.projectName}',
    slug: process.env.STORE_SLUG || '${options.projectName}',
    currency: 'usd',
    country: 'us',
    backendUrl: process.env.BACKEND_URL || process.env.WC_URL || process.env.API_URL || 'http://localhost:9000',
  },
  provider: ${PROVIDER_CONSTRUCTORS[options.backend]},
${enableFlags}
});

const port = parseInt(process.env.PORT || '3100', 10);
await agent.start(port);
console.log(\`AgentOJS server running on http://localhost:\${port}\`);
`;
}

// ─── tsconfig.json ───────────────────────────────────────────────────

export function generateTsconfig(): string {
  const config = {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src'],
  };

  return JSON.stringify(config, null, 2) + '\n';
}

// ─── README.md ───────────────────────────────────────────────────────

const BACKEND_NAMES: Record<Backend, string> = {
  medusa: 'Medusa.js v2',
  woocommerce: 'WooCommerce',
  shopify: 'Shopify',
  generic: 'Generic REST API',
};

export function generateReadme(options: ScaffoldOptions): string {
  const protocols = options.protocols.map((p) => p.toUpperCase()).join(', ');
  const pm = options.packageManager;
  const run = pm === 'npm' ? 'npm run' : pm;

  return `# ${options.projectName}

An AgentOJS-powered AI commerce agent for ${BACKEND_NAMES[options.backend]}.

Protocols: ${protocols}

## Setup

1. Copy \`.env.example\` to \`.env\` and fill in your credentials
2. Install dependencies: \`${pm} install\`
3. Start the server: \`${run} dev\`

## Endpoints

${options.protocols.includes('mcp') ? '- **MCP** (Claude): `POST /mcp`\n' : ''}${options.protocols.includes('ucp') ? '- **UCP** (Gemini): `GET /ucp/products`, `POST /ucp/cart`, etc.\n' : ''}${options.protocols.includes('acp') ? '- **ACP** (ChatGPT): `POST /acp/checkout_sessions`, etc.\n' : ''}- **Health**: \`GET /health\`

## Learn More

- [AgentOJS Documentation](https://agentojs.com)
- [GitHub](https://github.com/agentojs/agentojs)
`;
}

// ─── Aggregate ───────────────────────────────────────────────────────

export interface GeneratedFiles {
  'package.json': string;
  '.env.example': string;
  'src/index.ts': string;
  'tsconfig.json': string;
  'README.md': string;
}

export function generateAllFiles(options: ScaffoldOptions): GeneratedFiles {
  return {
    'package.json': generatePackageJson(options),
    '.env.example': generateEnvExample(options),
    'src/index.ts': generateIndexTs(options),
    'tsconfig.json': generateTsconfig(),
    'README.md': generateReadme(options),
  };
}
