#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');

function printHelp() {
  console.log(`
NexBoard — dashboard de gestion d'entreprise

Usage:
  nexboard              Démarre le serveur
  nexboard start        Idem
  nexboard --help       Aide

Variables (.env) : PORT, HOST, DATABASE_PATH

Exemples :
  npx nexboard
  npm install -g nexboard && nexboard
`);
}

function main() {
  const arg = process.argv[2];
  if (arg === '--help' || arg === '-h' || arg === 'help') {
    printHelp();
    return;
  }

  if (arg && arg !== 'start') {
    console.error(`Commande inconnue: ${arg}`);
    printHelp();
    process.exit(1);
  }

  const distEntry = path.join(pkgRoot, 'dist', 'index.js');
  if (!fs.existsSync(distEntry)) {
    console.error('[nexboard] Build manquant. Dans le repo: npm run build');
    process.exit(1);
  }

  process.env.NODE_ENV = process.env.NODE_ENV || 'production';

  const child = spawn(process.execPath, ['--experimental-sqlite', distEntry], {
    stdio: 'inherit',
    env: process.env,
    cwd: process.cwd(),
  });

  child.on('exit', (code) => process.exit(code ?? 0));
}

main();
