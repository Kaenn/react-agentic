#!/usr/bin/env node
import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { buildCommand } from './commands/build.js';

async function main() {
  // Read version from package.json (stays in sync)
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkgPath = path.resolve(__dirname, '../../package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));

  const program = new Command();

  program
    .name('react-agentic')
    .description('Compile-time safety for Claude Code commands')
    .version(pkg.version);

  program.addCommand(buildCommand);

  program.parse();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
