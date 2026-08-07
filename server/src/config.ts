import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, '../../.env');
const localEnv = path.resolve(__dirname, '../.env');

dotenv.config({ path: rootEnv });
dotenv.config({ path: localEnv, override: false });

export const config = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  databasePath: process.env.DATABASE_PATH ?? './data/nexboard.db',
  isProd: process.env.NODE_ENV === 'production',
};
