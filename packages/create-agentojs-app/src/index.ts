#!/usr/bin/env node

/**
 * create-agentojs-app — Interactive CLI scaffold for AgentOJS projects.
 *
 * Usage:
 *   npx create-agentojs-app
 *   npx create-agentojs-app my-app --yes
 */

import prompts from 'prompts';
import { resolve } from 'node:path';
import { scaffold } from './scaffold.js';
import type { Backend, PackageManager, ScaffoldOptions } from './templates.js';

const args = process.argv.slice(2);
const projectNameArg = args.find((a) => !a.startsWith('-'));
const yesFlag = args.includes('--yes') || args.includes('-y');

async function main(): Promise<void> {
  console.log('\n\x1b[36mcreate-agentojs-app\x1b[0m — Scaffold a new AgentOJS project\n');

  let options: ScaffoldOptions;

  if (yesFlag) {
    // Non-interactive mode with defaults
    options = {
      projectName: projectNameArg || 'my-agentojs-app',
      backend: 'medusa',
      protocols: ['mcp', 'ucp', 'acp'],
      packageManager: 'npm',
    };
  } else {
    const response = await prompts(
      [
        {
          type: 'text',
          name: 'projectName',
          message: 'Project name',
          initial: projectNameArg || 'my-agentojs-app',
        },
        {
          type: 'select',
          name: 'backend',
          message: 'Commerce backend',
          choices: [
            { title: 'Medusa.js v2', value: 'medusa' },
            { title: 'WooCommerce', value: 'woocommerce' },
            { title: 'Shopify', value: 'shopify' },
            { title: 'Generic REST API', value: 'generic' },
          ],
        },
        {
          type: 'multiselect',
          name: 'protocols',
          message: 'Protocols to enable',
          choices: [
            { title: 'MCP (Claude)', value: 'mcp', selected: true },
            { title: 'UCP (Gemini)', value: 'ucp', selected: true },
            { title: 'ACP (ChatGPT)', value: 'acp', selected: true },
          ],
        },
        {
          type: 'select',
          name: 'packageManager',
          message: 'Package manager',
          choices: [
            { title: 'npm', value: 'npm' },
            { title: 'pnpm', value: 'pnpm' },
            { title: 'yarn', value: 'yarn' },
          ],
        },
      ],
      {
        onCancel: () => {
          console.log('\n\x1b[31mAborted.\x1b[0m\n');
          process.exit(1);
        },
      },
    );

    options = {
      projectName: response.projectName as string,
      backend: response.backend as Backend,
      protocols: response.protocols as ('mcp' | 'ucp' | 'acp')[],
      packageManager: response.packageManager as PackageManager,
    };
  }

  const targetDir = resolve(process.cwd(), options.projectName);

  console.log(`\n\x1b[36mScaffolding project in ${targetDir}...\x1b[0m\n`);

  scaffold(options, targetDir);

  // Print success message
  const pm = options.packageManager;
  const run = pm === 'npm' ? 'npm run' : pm;

  console.log('\x1b[32mDone!\x1b[0m Project created successfully.\n');
  console.log('Next steps:\n');
  console.log(`  \x1b[36mcd ${options.projectName}\x1b[0m`);
  console.log(`  \x1b[36mcp .env.example .env\x1b[0m        # Fill in your credentials`);
  console.log(`  \x1b[36m${pm} install\x1b[0m`);
  console.log(`  \x1b[36m${run} dev\x1b[0m\n`);
}

main().catch((err) => {
  console.error('\x1b[31mError:\x1b[0m', err);
  process.exit(1);
});
