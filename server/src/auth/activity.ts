import { getDb } from '../db/index.js';

export type ActivityInput = {
  userId?: number | null;
  action: string;
  entityType?: string | null;
  entityId?: string | number | null;
  meta?: Record<string, unknown> | null;
  ip?: string | null;
};

export function logActivity(input: ActivityInput): void {
  try {
    getDb()
      .prepare(
        `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, meta, ip)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.userId ?? null,
        input.action,
        input.entityType ?? null,
        input.entityId != null ? String(input.entityId) : null,
        input.meta ? JSON.stringify(input.meta) : null,
        input.ip ?? null,
      );
  } catch (err) {
    console.warn('[activity] log failed:', err);
  }
}
