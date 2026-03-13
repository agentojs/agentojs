/**
 * scaffold — Creates project directory and writes template files.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { generateAllFiles, type ScaffoldOptions } from './templates.js';

export function scaffold(options: ScaffoldOptions, targetDir: string): void {
  // Create project directory
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Create src/ subdirectory
  const srcDir = join(targetDir, 'src');
  mkdirSync(srcDir, { recursive: true });

  // Generate and write all files
  const files = generateAllFiles(options);

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(targetDir, relativePath);
    const dir = join(fullPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(fullPath, content, 'utf-8');
  }
}

export function installDependencies(
  targetDir: string,
  packageManager: ScaffoldOptions['packageManager'],
): void {
  const cmd =
    packageManager === 'yarn' ? 'yarn install' : `${packageManager} install`;

  execSync(cmd, {
    cwd: targetDir,
    stdio: 'inherit',
  });
}
