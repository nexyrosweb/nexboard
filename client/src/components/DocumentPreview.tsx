import { Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { StatusBadge } from './TableBits';
import { useBranding } from '../context/BrandingContext';
import { useI18n } from '../context/I18nContext';
import { formatCurrency, formatDate } from '../utils/format';

export type DocumentKind = 'quote' | 'invoice';

export interface DocumentPreviewModel {
  kind: DocumentKind;
  number: string;
  title: string;
  amount: number;
  status: string;
  issue_date: string;
  valid_until?: string | null;
  due_date?: string | null;
  client_name: string;
  client_email?: string | null;
  client_company?: string | null;
  client_phone?: string | null;
  project_name?: string | null;
}

interface DocumentPreviewProps {
  open: boolean;
  doc: DocumentPreviewModel | null;
  onClose: () => void;
  footerExtra?: ReactNode;
}

function str(value: unknown): string {
  return value == null ? '' : String(value);
}

export function DocumentPreview({ open, doc, onClose, footerExtra }: DocumentPreviewProps) {
  const { t } = useI18n();
  const { settings } = useBranding();

  if (!doc) return null;

  const companyName = str(settings.company_name) || 'NexBoard';
  const companyEmail = str(settings.company_email);
  const companyPhone = str(settings.company_phone);
  const companyAddress = str(settings.company_address);
  const logoUrl = str(settings.logo_url);
  const brandColor = str(settings.brand_color) || '#0891B2';
  const kindLabel = doc.kind === 'quote' ? t('doc.quote') : t('doc.invoice');

  const print = () => window.print();

  return (
    <Modal
      open={open}
      title={`${kindLabel} ${doc.number}`}
      onClose={onClose}
      wide
      footer={
        <>
          {footerExtra}
          <button type="button" className="btn btn-ghost no-print" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary no-print" onClick={print}>
            <Printer size={16} />
            {t('common.print')}
          </button>
        </>
      }
    >
      <p className="doc-print-hint no-print">{t('doc.printHint')}</p>
      <article className="document-sheet" style={{ ['--doc-accent' as string]: brandColor }}>
        <header className="document-sheet-header">
          <div className="document-sheet-brand">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="document-sheet-logo" />
            ) : (
              <div className="document-sheet-mark">{companyName.slice(0, 1)}</div>
            )}
            <div>
              <strong>{companyName}</strong>
              {companyEmail ? <div className="muted">{companyEmail}</div> : null}
              {companyPhone ? <div className="muted">{companyPhone}</div> : null}
              {companyAddress ? <div className="muted">{companyAddress}</div> : null}
            </div>
          </div>
          <div className="document-sheet-meta">
            <span className="document-sheet-kind">{kindLabel}</span>
            <strong className="mono">{doc.number}</strong>
            <StatusBadge status={doc.status} />
          </div>
        </header>

        <div className="document-sheet-grid">
          <section>
            <h4>{t('doc.billTo')}</h4>
            <p>
              <strong>{doc.client_name}</strong>
              {doc.client_company ? (
                <>
                  <br />
                  {doc.client_company}
                </>
              ) : null}
              {doc.client_email ? (
                <>
                  <br />
                  {doc.client_email}
                </>
              ) : null}
              {doc.client_phone ? (
                <>
                  <br />
                  {doc.client_phone}
                </>
              ) : null}
            </p>
          </section>
          <section>
            <h4>{t('doc.from')}</h4>
            <dl className="document-sheet-dl">
              <div>
                <dt>{t('doc.issueDate')}</dt>
                <dd>{formatDate(doc.issue_date)}</dd>
              </div>
              {doc.kind === 'quote' && doc.valid_until ? (
                <div>
                  <dt>{t('doc.validUntil')}</dt>
                  <dd>{formatDate(doc.valid_until)}</dd>
                </div>
              ) : null}
              {doc.kind === 'invoice' && doc.due_date ? (
                <div>
                  <dt>{t('doc.dueDate')}</dt>
                  <dd>{formatDate(doc.due_date)}</dd>
                </div>
              ) : null}
              {doc.project_name ? (
                <div>
                  <dt>{t('doc.project')}</dt>
                  <dd>{doc.project_name}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>

        <table className="document-sheet-table">
          <thead>
            <tr>
              <th>{t('doc.title')}</th>
              <th>{t('doc.status')}</th>
              <th className="num">{t('doc.amount')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{doc.title}</td>
              <td>
                <StatusBadge status={doc.status} />
              </td>
              <td className="num mono">{formatCurrency(doc.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>{t('doc.amount')}</td>
              <td className="num mono">{formatCurrency(doc.amount)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="document-sheet-thanks">{t('doc.thanks')}</p>
      </article>
    </Modal>
  );
}
