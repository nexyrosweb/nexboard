import type { DatabaseSync } from 'node:sqlite';

function monthsAgo(months: number, day = 15): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function stamp(months: number, day = 15, hour = 10): string {
  return `${monthsAgo(months, day)} ${String(hour).padStart(2, '0')}:00:00`;
}

export function seedDatabase(db: DatabaseSync): void {
  const insertClient = db.prepare(`
    INSERT INTO clients (name, email, phone, company, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProject = db.prepare(`
    INSERT INTO projects (client_id, name, description, status, budget, start_date, end_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQuote = db.prepare(`
    INSERT INTO quotes (client_id, project_id, number, title, amount, status, issue_date, valid_until, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (client_id, project_id, quote_id, number, title, amount, status, issue_date, due_date, paid_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSetting = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
  `);

  db.exec('BEGIN');
  try {
    const clients = [
      ['Camille Durand', 'camille.durand@atelier-nord.fr', '+33 6 12 34 56 78', 'Atelier Nord', 'actif', 'Cliente historique, préfère les échanges par e-mail.', stamp(10, 12)],
      ['Hugo Martin', 'hugo@pixelcraft.io', '+33 6 98 76 54 32', 'Pixelcraft', 'actif', 'Projets web récurrents.', stamp(8, 3, 14)],
      ['Léa Bernard', 'lea.bernard@maisonverte.com', '+33 7 11 22 33 44', 'Maison Verte', 'prospect', 'Intéressée par un redesign de marque.', stamp(5, 18, 9)],
      ['Thomas Petit', 't.petit@logiware.fr', '+33 6 55 44 33 22', 'LogiWare', 'actif', 'Facturation mensuelle.', stamp(7, 21, 16)],
      ['Sophie Roux', 'sophie@brightlab.studio', null, 'BrightLab Studio', 'inactif', 'Projet terminé récemment.', stamp(11, 2, 11)],
      ['Julien Moreau', 'julien.moreau@orbitpay.com', '+33 6 77 88 99 00', 'OrbitPay', 'actif', 'Priorité haute — produit SaaS.', stamp(4, 5, 8)],
    ] as const;

    const clientIds = clients.map((c) => Number(insertClient.run(...c).lastInsertRowid));

    const projects = [
      [clientIds[0], 'Refonte site vitrine', 'Nouveau site marketing + blog.', 'termine', 8500, monthsAgo(8, 1), monthsAgo(5, 15), stamp(9, 20)],
      [clientIds[1], 'Application mobile MVP', 'Prototype iOS/Android pour Pixelcraft.', 'en_cours', 22000, monthsAgo(5, 10), monthsAgo(-2, 30), stamp(6, 28, 9)],
      [clientIds[2], 'Identité visuelle', 'Logo, charte et templates.', 'brouillon', 4500, null, null, stamp(5, 20, 11)],
      [clientIds[3], 'Dashboard logistique', 'Tableau de bord temps réel pour entrepôts.', 'en_cours', 18500, monthsAgo(6, 1), monthsAgo(-1, 30), stamp(7, 25, 15)],
      [clientIds[5], 'Module facturation OrbitPay', 'Intégration paiements et exports comptables.', 'en_cours', 31000, monthsAgo(4, 10), monthsAgo(-3, 15), stamp(4, 6, 10)],
      [clientIds[4], 'Campagne print', 'Supports print pour événement.', 'annule', 2800, monthsAgo(10, 1), monthsAgo(9, 1), stamp(10, 15, 12)],
    ] as const;

    const projectIds = projects.map((p) => Number(insertProject.run(...p).lastInsertRowid));

    const quotes = [
      [clientIds[0], projectIds[0], 'DEV-2025-014', 'Refonte site vitrine', 8500, 'accepte', monthsAgo(9, 18), monthsAgo(8, 18), stamp(9, 18, 9)],
      [clientIds[1], projectIds[1], 'DEV-2025-031', 'MVP application mobile', 22000, 'accepte', monthsAgo(6, 20), monthsAgo(5, 20), stamp(6, 20, 14)],
      [clientIds[2], projectIds[2], 'DEV-2026-004', 'Identité visuelle Maison Verte', 4500, 'envoye', monthsAgo(4, 22), monthsAgo(3, 22), stamp(4, 22, 10)],
      [clientIds[3], projectIds[3], 'DEV-2025-028', 'Dashboard logistique', 18500, 'accepte', monthsAgo(7, 28), monthsAgo(6, 28), stamp(7, 28, 11)],
      [clientIds[5], projectIds[4], 'DEV-2026-009', 'Module facturation', 31000, 'envoye', monthsAgo(3, 8), monthsAgo(2, 8), stamp(3, 8, 9)],
      [clientIds[1], null, 'DEV-2026-012', 'Maintenance annuelle', 3600, 'brouillon', monthsAgo(0, 1), monthsAgo(-1, 1), stamp(0, 1, 8)],
    ] as const;

    const quoteIds = quotes.map((q) => Number(insertQuote.run(...q).lastInsertRowid));

    const invoices = [
      [clientIds[0], projectIds[0], quoteIds[0], 'FAC-2025-041', 'Acompte refonte site', 4250, 'payee', monthsAgo(5, 5), monthsAgo(5, 20), monthsAgo(5, 18), stamp(5, 5)],
      [clientIds[0], projectIds[0], quoteIds[0], 'FAC-2025-052', 'Solde refonte site', 4250, 'payee', monthsAgo(4, 16), monthsAgo(4, 31), monthsAgo(4, 28), stamp(4, 16)],
      [clientIds[1], projectIds[1], quoteIds[1], 'FAC-2026-003', 'Acompte MVP mobile', 11000, 'payee', monthsAgo(3, 15), monthsAgo(3, 30), monthsAgo(3, 27), stamp(3, 15, 9)],
      [clientIds[3], projectIds[3], quoteIds[3], 'FAC-2026-008', 'Phase 1 dashboard', 7500, 'envoyee', monthsAgo(1, 12), monthsAgo(1, 27), null, stamp(1, 12, 14)],
      [clientIds[3], projectIds[3], quoteIds[3], 'FAC-2026-015', 'Phase 2 dashboard', 5500, 'en_retard', monthsAgo(2, 5), monthsAgo(2, 20), null, stamp(2, 5, 11)],
      [clientIds[5], projectIds[4], quoteIds[4], 'FAC-2026-018', 'Acompte module OrbitPay', 15500, 'envoyee', monthsAgo(0, 20), monthsAgo(-1, 5), null, stamp(0, 20)],
      [clientIds[1], projectIds[1], quoteIds[1], 'FAC-2026-021', 'Sprint courant', 4800, 'brouillon', monthsAgo(0, 1), monthsAgo(0, 15), null, stamp(0, 1, 16)],
      [clientIds[1], projectIds[1], quoteIds[1], 'FAC-2026-011', 'Sprint précédent', 6200, 'payee', monthsAgo(2, 10), monthsAgo(2, 25), monthsAgo(2, 22), stamp(2, 10)],
      [clientIds[5], projectIds[4], quoteIds[4], 'FAC-2026-007', 'Atelier cadrage', 3200, 'payee', monthsAgo(1, 8), monthsAgo(1, 22), monthsAgo(1, 18), stamp(1, 8)],
      [clientIds[4], projectIds[5], null, 'FAC-2025-019', 'Étude préliminaire', 900, 'annulee', monthsAgo(9, 10), monthsAgo(9, 25), null, stamp(9, 10, 9)],
    ] as const;

    invoices.forEach((inv) => insertInvoice.run(...inv));

    insertSetting.run('company_name', 'NexBoard SAS');
    insertSetting.run('company_email', 'contact@nexboard.app');
    insertSetting.run('currency', 'EUR');
    insertSetting.run('theme', 'system');
    insertSetting.run('brand_color', '#0891B2');
    insertSetting.run('company_tagline', 'Business OS');

    const insertNotif = db.prepare(
      `INSERT INTO notifications (type, title, message, link, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    insertNotif.run(
      'info',
      'Bienvenue sur NexBoard',
      'Configurez votre logo, vos couleurs et le SMTP dans Paramètres.',
      '/settings',
      0,
      stamp(0, 1, 9),
    );
    insertNotif.run(
      'warning',
      'Facture en retard à relancer',
      'Pensez à vérifier les factures marquées en retard.',
      '/invoices',
      0,
      stamp(0, 2, 11),
    );

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
