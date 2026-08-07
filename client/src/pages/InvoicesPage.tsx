import { FileText, Mail, Pencil, Plus, Printer } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchClients } from '../api/clients';
import {
  createInvoice,
  deleteInvoice,
  fetchInvoices,
  sendInvoice,
  updateInvoice,
  type InvoiceInput,
} from '../api/invoices';
import { fetchProjects } from '../api/projects';
import { downloadExport } from '../api/settings';
import { DetailSheet } from '../components/DetailSheet';
import {
  DocumentPreview,
  type DocumentPreviewModel,
} from '../components/DocumentPreview';
import { ConfirmDialog, FormActions, Modal, handleFormSubmit } from '../components/Modal';
import { ListToolbar, PageHeader } from '../components/PageChrome';
import { ErrorState, LoadingState } from '../components/StateViews';
import { EmptyTable, RowActions, StatusBadge } from '../components/TableBits';
import { INVOICE_STATUSES, useStatusOptions } from '../constants/statuses';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import type { TranslationKey } from '../i18n/translations';
import type { Client, Invoice, Project } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { parseApiError, todayISO, useDebouncedValue } from '../utils/hooks';

const emptyForm = (): InvoiceInput => ({
  client_id: 0,
  project_id: null,
  title: '',
  amount: 0,
  status: 'brouillon',
  issue_date: todayISO(),
  due_date: '',
});

export function InvoicesPage() {
  const { t } = useI18n();
  const { push } = useToast();
  const statusOptions = useStatusOptions();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const loader = useCallback(
    () => fetchInvoices({ q: debouncedSearch || undefined, status: status || undefined }),
    [debouncedSearch, status],
  );
  const { data, loading, error, reload } = useAsyncData(loader);

  useEffect(() => {
    void Promise.all([fetchClients(), fetchProjects()])
      .then(([c, p]) => {
        setClients(c);
        setProjects(p);
      })
      .catch(() => {
        setClients([]);
        setProjects([]);
      });
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState<InvoiceInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [preview, setPreview] = useState<DocumentPreviewModel | null>(null);

  const clientProjects = useMemo(
    () => projects.filter((p) => p.client_id === form.client_id),
    [projects, form.client_id],
  );

  const clientById = useCallback(
    (id: number) => clients.find((c) => c.id === id),
    [clients],
  );

  const toPreview = useCallback(
    (invoice: Invoice): DocumentPreviewModel => {
      const client = clientById(invoice.client_id);
      return {
        kind: 'invoice',
        number: invoice.number,
        title: invoice.title,
        amount: invoice.amount,
        status: invoice.status,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        client_name: invoice.client_name,
        client_email: client?.email,
        client_company: client?.company,
        client_phone: client?.phone,
        project_name: invoice.project_name,
      };
    },
    [clientById],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm(),
      client_id: clients[0]?.id ?? 0,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (invoice: Invoice) => {
    setEditing(invoice);
    setForm({
      client_id: invoice.client_id,
      project_id: invoice.project_id,
      quote_id: invoice.quote_id,
      number: invoice.number,
      title: invoice.title,
      amount: invoice.amount,
      status: invoice.status,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date ?? '',
      paid_at: invoice.paid_at,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount) || 0,
        project_id: form.project_id || null,
        due_date: form.due_date || null,
      };
      if (editing) await updateInvoice(editing.id, payload);
      else await createInvoice(payload);
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteInvoice(toDelete.id);
      setToDelete(null);
      setDetail(null);
      reload();
    } catch {
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleSend = (invoice: Invoice) => {
    void sendInvoice(invoice.id)
      .then(() => {
        push(t('invoices.sent'), 'success');
        reload();
      })
      .catch((err) => push(parseApiError(err), 'danger'));
  };

  const n = data?.length ?? 0;
  const countLabel = t(n === 1 ? 'invoices.count' : 'invoices.count_plural', { n });

  return (
    <div>
      <PageHeader
        kicker={t('invoices.kicker')}
        title={t('invoices.title')}
        description={t('invoices.desc')}
        action={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost" onClick={() => downloadExport('invoices')}>
              {t('common.exportCsv')}
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} />
              {t('invoices.new')}
            </button>
          </div>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('invoices.search')}
        status={status}
        onStatusChange={setStatus}
        statusOptions={statusOptions.invoices}
        countLabel={countLabel}
      />

      {loading && !data ? <LoadingState label={t('invoices.loading')} /> : null}
      {error && !data ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <section className="card">
          <div className="card-body" style={{ paddingTop: '0.5rem' }}>
            {!data.length ? (
              <EmptyTable
                message={t('invoices.empty')}
                hint={t('invoices.empty.hint')}
                action={
                  <button type="button" className="btn btn-primary" onClick={openCreate}>
                    {t('invoices.new')}
                  </button>
                }
              />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('invoices.col.number')}</th>
                      <th>{t('invoices.col.title')}</th>
                      <th>{t('invoices.col.client')}</th>
                      <th>{t('invoices.col.amount')}</th>
                      <th>{t('invoices.col.status')}</th>
                      <th>{t('invoices.col.due')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="mono">
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => setDetail(invoice)}
                          >
                            {invoice.number}
                          </button>
                        </td>
                        <td>
                          <strong>{invoice.title}</strong>
                        </td>
                        <td>{invoice.client_name}</td>
                        <td className="mono">{formatCurrency(invoice.amount)}</td>
                        <td>
                          <StatusBadge status={invoice.status} />
                        </td>
                        <td>{invoice.due_date ? formatDate(invoice.due_date) : '—'}</td>
                        <td>
                          <RowActions
                            onView={() => setDetail(invoice)}
                            onPreview={() => setPreview(toPreview(invoice))}
                            onEdit={() => openEdit(invoice)}
                            onDelete={() => setToDelete(invoice)}
                            onSend={() => handleSend(invoice)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <Modal
        open={modalOpen}
        title={editing ? t('invoices.modal.edit') : t('invoices.modal.create')}
        onClose={() => setModalOpen(false)}
        wide
        footer={
          <FormActions
            formId="invoice-form"
            onCancel={() => setModalOpen(false)}
            submitLabel={editing ? t('common.save') : t('common.create')}
            loading={saving}
          />
        }
      >
        <form id="invoice-form" className="form-grid" onSubmit={handleFormSubmit(save)}>
          {formError ? <p className="form-error span-2">{formError}</p> : null}
          <label className="field span-2">
            <span className="field-label">{t('invoices.field.title')}</span>
            <input
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('invoices.field.client')}</span>
            <select
              className="select"
              required
              value={form.client_id || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  client_id: Number(e.target.value),
                  project_id: null,
                })
              }
            >
              <option value="" disabled>
                {t('common.choose')}
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('invoices.field.project')}</span>
            <select
              className="select"
              value={form.project_id ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  project_id: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">{t('common.none')}</option>
              {clientProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('invoices.field.amount')}</span>
            <input
              className="input"
              type="number"
              min={0}
              step={50}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('invoices.field.status')}</span>
            <select
              className="select"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as Invoice['status'] })
              }
            >
              {INVOICE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t(`status.${value}` as TranslationKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('invoices.field.issue')}</span>
            <input
              className="input"
              type="date"
              required
              value={form.issue_date}
              onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('invoices.field.due')}</span>
            <input
              className="input"
              type="date"
              value={form.due_date ?? ''}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </label>
        </form>
      </Modal>

      <DetailSheet
        open={!!detail}
        title={t('invoices.detail.title')}
        onClose={() => setDetail(null)}
        fields={
          detail
            ? [
                { label: t('invoices.col.number'), value: detail.number },
                { label: t('invoices.col.title'), value: detail.title },
                { label: t('invoices.col.client'), value: detail.client_name },
                {
                  label: t('invoices.field.project'),
                  value: detail.project_name || t('common.none'),
                },
                { label: t('invoices.col.amount'), value: formatCurrency(detail.amount) },
                { label: t('invoices.col.status'), value: <StatusBadge status={detail.status} /> },
                { label: t('invoices.field.issue'), value: formatDate(detail.issue_date) },
                {
                  label: t('invoices.col.due'),
                  value: detail.due_date ? formatDate(detail.due_date) : '—',
                },
                {
                  label: t('doc.quote'),
                  value: detail.quote_id ? `#${detail.quote_id}` : '—',
                },
              ]
            : []
        }
        actions={
          detail ? (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPreview(toPreview(detail))}
              >
                <FileText size={16} />
                {t('common.preview')}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPreview(toPreview(detail))}
              >
                <Printer size={16} />
                {t('common.print')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => handleSend(detail)}>
                <Mail size={16} />
                {t('common.sendEmail')}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  openEdit(detail);
                  setDetail(null);
                }}
              >
                <Pencil size={16} />
                {t('common.edit')}
              </button>
            </>
          ) : null
        }
      />

      <DocumentPreview open={!!preview} doc={preview} onClose={() => setPreview(null)} />

      <ConfirmDialog
        open={!!toDelete}
        title={t('invoices.delete.title')}
        message={t('invoices.delete.msg', { number: toDelete?.number ?? '' })}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
