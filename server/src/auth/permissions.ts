import type { AuthUser } from './session.js';

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return user?.role === 'admin';
}

/** Sensitive operations: user management, backup/restore, SMTP secrets. */
export function requireAdmin(user: AuthUser | null | undefined): boolean {
  return isAdmin(user);
}
