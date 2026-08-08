import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { createNotification } from '../services/app.js';
import { isValidStatus } from '../services/statuses.js';

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const cleaned = text.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return { headers: [], rows: [] };

  const lines: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (ch === '"') {
      if (inQuotes && cleaned[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && cleaned[i + 1] === '\n') i += 1;
      if (current.trim() || lines.length) lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.length || lines.length) lines.push(current);

  const sep = lines[0]?.includes(';') ? ';' : ',';
  const split = (line: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let q = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else q = !q;
      } else if (ch === sep && !q) {
        cells.push(cell.trim());
        cell = '';
      } else cell += ch;
    }
    cells.push(cell.trim());
    return cells;
  };

  const headers = split(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const rows = lines.slice(1).filter((l) => l.trim()).map(split);
  return { headers, rows };
}

function rowObject(headers: string[], cells: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = cells[i] ?? '';
  });
  return obj;
}

type PreviewRow = {
  index: number;
  data: Record<string, string>;
  status: 'ok' | 'duplicate' | 'error';
  message?: string;
};

export async function importRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/import/clients', async (request, reply) => {
    const body = request.body as { csv?: string; confirm?: boolean };
    if (!body.csv?.trim()) return reply.status(400).send({ error: 'CSV manquant' });

    const { headers, rows } = parseCsv(body.csv);
    if (!headers.includes('name') || !headers.includes('email')) {
      return reply
        .status(400)
        .send({ error: 'Colonnes requises : name, email (optionnel : phone, company, status, notes)' });
    }

    const db = getDb();
    const existing = db
      .prepare('SELECT id, email, name FROM clients')
      .all() as Array<{ id: number; email: string; name: string }>;
    const byEmail = new Map(existing.map((c) => [c.email.toLowerCase(), c]));

    const preview: PreviewRow[] = [];
    for (let i = 0; i < rows.length; i += 1) {
      const data = rowObject(headers, rows[i]);
      const name = data.name?.trim();
      const email = data.email?.trim().toLowerCase();
      if (!name || !email) {
        preview.push({ index: i + 1, data, status: 'error', message: 'name/email requis' });
        continue;
      }
      if (data.status && !isValidStatus('clients', data.status)) {
        preview.push({ index: i + 1, data, status: 'error', message: 'statut invalide' });
        continue;
      }
      if (byEmail.has(email)) {
        preview.push({
          index: i + 1,
          data,
          status: 'duplicate',
          message: `Doublon e-mail (${byEmail.get(email)!.name})`,
        });
        continue;
      }
      preview.push({ index: i + 1, data, status: 'ok' });
    }

    if (!body.confirm) {
      return {
        entity: 'clients',
        total: preview.length,
        ok: preview.filter((r) => r.status === 'ok').length,
        duplicates: preview.filter((r) => r.status === 'duplicate').length,
        errors: preview.filter((r) => r.status === 'error').length,
        rows: preview,
      };
    }

    const insert = db.prepare(
      `INSERT INTO clients (name, email, phone, company, status, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    let imported = 0;
    for (const row of preview.filter((r) => r.status === 'ok')) {
      insert.run(
        row.data.name.trim(),
        row.data.email.trim(),
        row.data.phone?.trim() || null,
        row.data.company?.trim() || null,
        row.data.status?.trim() || 'actif',
        row.data.notes?.trim() || null,
      );
      imported += 1;
    }

    createNotification({
      type: 'success',
      title: 'Import clients terminé',
      message: `${imported} client(s) importé(s)`,
      link: '/clients',
      source_key: `import-clients-${Date.now()}`,
    });

    return { entity: 'clients', imported, skipped: preview.length - imported };
  });

  app.post('/api/import/projects', async (request, reply) => {
    const body = request.body as { csv?: string; confirm?: boolean };
    if (!body.csv?.trim()) return reply.status(400).send({ error: 'CSV manquant' });

    const { headers, rows } = parseCsv(body.csv);
    const hasClientId = headers.includes('client_id');
    const hasClientEmail = headers.includes('client_email');
    const hasClientName = headers.includes('client_name');
    if (!headers.includes('name') || (!hasClientId && !hasClientEmail && !hasClientName)) {
      return reply.status(400).send({
        error:
          'Colonnes requises : name + client_id|client_email|client_name (optionnel : description, status, budget, start_date, end_date)',
      });
    }

    const db = getDb();
    const clients = db
      .prepare('SELECT id, email, name FROM clients')
      .all() as Array<{ id: number; email: string; name: string }>;
    const byId = new Map(clients.map((c) => [c.id, c]));
    const byEmail = new Map(clients.map((c) => [c.email.toLowerCase(), c]));
    const byName = new Map(clients.map((c) => [c.name.toLowerCase(), c]));

    const existingProjects = db
      .prepare('SELECT id, client_id, name FROM projects')
      .all() as Array<{ id: number; client_id: number; name: string }>;
    const projectKey = (clientId: number, name: string) =>
      `${clientId}::${name.trim().toLowerCase()}`;
    const existingKeys = new Set(existingProjects.map((p) => projectKey(p.client_id, p.name)));

    const preview: PreviewRow[] = [];
    for (let i = 0; i < rows.length; i += 1) {
      const data = rowObject(headers, rows[i]);
      const name = data.name?.trim();
      if (!name) {
        preview.push({ index: i + 1, data, status: 'error', message: 'name requis' });
        continue;
      }

      let client =
        (data.client_id && byId.get(Number(data.client_id))) ||
        (data.client_email && byEmail.get(data.client_email.trim().toLowerCase())) ||
        (data.client_name && byName.get(data.client_name.trim().toLowerCase())) ||
        null;

      if (!client) {
        preview.push({ index: i + 1, data, status: 'error', message: 'client introuvable' });
        continue;
      }
      if (data.status && !isValidStatus('projects', data.status)) {
        preview.push({ index: i + 1, data, status: 'error', message: 'statut invalide' });
        continue;
      }
      if (existingKeys.has(projectKey(client.id, name))) {
        preview.push({
          index: i + 1,
          data: { ...data, _client_id: String(client.id) },
          status: 'duplicate',
          message: `Projet déjà existant pour ${client.name}`,
        });
        continue;
      }
      preview.push({
        index: i + 1,
        data: { ...data, _client_id: String(client.id) },
        status: 'ok',
      });
    }

    if (!body.confirm) {
      return {
        entity: 'projects',
        total: preview.length,
        ok: preview.filter((r) => r.status === 'ok').length,
        duplicates: preview.filter((r) => r.status === 'duplicate').length,
        errors: preview.filter((r) => r.status === 'error').length,
        rows: preview,
      };
    }

    const insert = db.prepare(
      `INSERT INTO projects (client_id, name, description, status, budget, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    let imported = 0;
    for (const row of preview.filter((r) => r.status === 'ok')) {
      insert.run(
        Number(row.data._client_id),
        row.data.name.trim(),
        row.data.description?.trim() || null,
        row.data.status?.trim() || 'en_cours',
        Number(row.data.budget) || 0,
        row.data.start_date || null,
        row.data.end_date || null,
      );
      imported += 1;
    }

    createNotification({
      type: 'success',
      title: 'Import projets terminé',
      message: `${imported} projet(s) importé(s)`,
      link: '/projects',
      source_key: `import-projects-${Date.now()}`,
    });

    return { entity: 'projects', imported, skipped: preview.length - imported };
  });
}
