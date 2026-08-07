import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
const clientDist = path.resolve(serverRoot, '../client/dist');
const publicDir = path.resolve(serverRoot, 'public');

if (!fs.existsSync(clientDist)) {
  console.warn('[bundle-public] client/dist introuvable — lancez d’abord le build client');
  process.exit(0);
}

fs.rmSync(publicDir, { recursive: true, force: true });
fs.cpSync(clientDist, publicDir, { recursive: true });
console.log('[bundle-public] client/dist → server/public');
