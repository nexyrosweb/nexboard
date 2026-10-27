import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, '../../.env');
const localEnv = path.resolve(__dirname, '../.env');

dotenv.config({ path: rootEnv });
dotenv.config({ path: localEnv, override: false });

function envBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

const authEnabled = envBool(process.env.AUTH_ENABLED, false);

let authSecret = process.env.AUTH_SECRET?.trim() || '';
if (authEnabled && !authSecret) {
  // Ephemeral secret keeps local alpha usable; sessions reset on restart.
  authSecret = randomBytes(32).toString('hex');
  console.warn(
    '[nexboard] AUTH_ENABLED=true but AUTH_SECRET is missing — using an ephemeral secret (sessions reset on restart). Set AUTH_SECRET in .env for production.',
  );
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  databasePath: process.env.DATABASE_PATH ?? './data/nexboard.db',
  isProd: process.env.NODE_ENV === 'production',
  /** When true, API requires login (after first-run setup). Default false = v1.2.0 compatible. */
  authEnabled,
  authSecret,
  sessionDays: Math.max(1, Number(process.env.SESSION_DAYS ?? 14) || 14),
  /**
   * Seed demo data only for brand-new DB files when true.
   * Never seeds an existing DB that merely has zero clients.
   */
  seedDemo: envBool(process.env.SEED_DEMO, true),
};
