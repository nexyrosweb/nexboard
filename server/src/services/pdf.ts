import PDFDocument from 'pdfkit';
import { getSetting } from './app.js';

export type DocKind = 'quote' | 'invoice';

export interface DocumentPdfInput {
  kind: DocKind;
  number: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  issue_date: string;
  valid_until?: string | null;
  due_date?: string | null;
  client_name: string;
  client_email?: string | null;
  client_company?: string | null;
  project_name?: string | null;
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function buildDocumentPdf(doc: DocumentPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const company = getSetting('company_name', 'NexBoard');
    const email = getSetting('company_email', '');
    const phone = getSetting('company_phone', '');
    const address = getSetting('company_address', '');
    const kindLabel = doc.kind === 'quote' ? 'DEVIS' : 'FACTURE';

    const pdf = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    pdf.on('data', (c) => chunks.push(c as Buffer));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    pdf.fontSize(20).fillColor('#0f172a').text(company, { continued: false });
    pdf.fontSize(10).fillColor('#64748b');
    if (email) pdf.text(email);
    if (phone) pdf.text(phone);
    if (address) pdf.text(address);

    pdf.moveDown();
    pdf.fontSize(16).fillColor('#0891b2').text(kindLabel);
    pdf.fontSize(12).fillColor('#0f172a').text(doc.number);
    pdf.fontSize(10).fillColor('#64748b').text(`Statut : ${doc.status}`);

    pdf.moveDown();
    pdf.fontSize(11).fillColor('#0f172a').text('Client', { underline: true });
    pdf.fontSize(10).text(doc.client_name);
    if (doc.client_company) pdf.text(doc.client_company);
    if (doc.client_email) pdf.text(doc.client_email);

    pdf.moveDown();
    pdf.text(`Date d’émission : ${doc.issue_date}`);
    if (doc.kind === 'quote' && doc.valid_until) pdf.text(`Valable jusqu’au : ${doc.valid_until}`);
    if (doc.kind === 'invoice' && doc.due_date) pdf.text(`Échéance : ${doc.due_date}`);
    if (doc.project_name) pdf.text(`Projet : ${doc.project_name}`);

    pdf.moveDown();
    const tableTop = pdf.y;
    pdf.fontSize(10).fillColor('#64748b');
    pdf.text('Description', 50, tableTop, { width: 280 });
    pdf.text('Statut', 330, tableTop, { width: 80 });
    pdf.text('Montant', 420, tableTop, { width: 120, align: 'right' });
    pdf
      .moveTo(50, tableTop + 14)
      .lineTo(545, tableTop + 14)
      .strokeColor('#e2e8f0')
      .stroke();

    const rowY = tableTop + 22;
    pdf.fillColor('#0f172a');
    pdf.text(doc.title, 50, rowY, { width: 280 });
    pdf.text(doc.status, 330, rowY, { width: 80 });
    pdf.text(money(doc.amount, doc.currency), 420, rowY, { width: 120, align: 'right' });

    pdf.moveDown(3);
    pdf.fontSize(12).fillColor('#0f172a').text(`Total : ${money(doc.amount, doc.currency)}`, {
      align: 'right',
    });

    pdf.moveDown(2);
    pdf.fontSize(9).fillColor('#64748b').text('Document généré par NexBoard.');

    pdf.end();
  });
}
