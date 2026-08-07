import { ArrowRightLeft, FileText, Mail, Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchClients } from '../api/clients';
import { fetchProjects } from '../api/projects';
import {
  convertQuote,
  createQuote,
  deleteQuote,
  fetchQuotes,
  sendQuote,
  updateQuote,
  type QuoteInput,
} from '../api/quotes';
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
import { QUOTE_STATUSES, useStatusOptions } from '../constants/statuses';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import type { TranslationKey } from '../i18n/translations';
import type { Client, Project, Quote } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { parseApiError, todayISO, useDebouncedValue } from '../utils/hooks';

const emptyForm = (): QuoteInput => ({
  client_id: 0,
  project_id: null,
  title: '',
  amount: 0,
  status: 'brouillon',
  issue_date: todayISO(),
  valid_until: '',
});

function canConvert(status: Quote['status']) {
  return status === 'envoye' || status === 'accepte' || status === 'brouillon';
}

export function QuotesPage() {
  const { t } = useI18n();
  const { push } = useToast();
  const statusOptions = useStatusOptions();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const loader = useCallback(
    () => fetchQuotes({ q: debouncedSearch || undefined, status: status || undefined }),
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
  const [editing, setEditing] = useState<Quote | null>(null);
  const [form, setForm] = useState<QuoteInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Quote | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState<Quote | null>(null);
  const [preview, setPreview] = useState<DocumentPreviewModel | null>(null);
  const [converting, setConverting] = useState(false);

  const clientProjects = useMemo(
    () => projects.filter((p) => p.client_id === form.client_id),
    [projects, form.client_id],
  );

  const clientById = useCallback(
    (id: number) => clients.find((c) => c.id === id),
    [clients],
  );

  const toPreview = useCallback(
    (quote: Quote): DocumentPreviewModel => {
      const client = clientById(quote.client_id);
      return {
        kind: 'quote',
        number: quote.number,
        title: quote.title,
        amount: quote.amount,
        status: quote.status,
        issue_date: quote.issue_date,
        valid_until: quote.valid_until,
        client_name: quote.client_name,
        client_email: client?.email,
        client_company: client?.company,
        client_phone: client?.phone,
        project_name: quote.project_name,
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

  const openEdit = (quote: Quote) => {
    setEditing(quote);
    setForm({
      client_id: quote.client_id,
      project_id: quote.project_id,
      number: quote.number,
      title: quote.title,
      amount: quote.amount,
      status: quote.status,
      issue_date: quote.issue_date,
      valid_until: quote.valid_until ?? '',
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
        valid_until: form.valid_until || null,
      };
      if (editing) await updateQuote(editing.id, payload);
      else await createQuote(payload);
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
      await deleteQuote(toDelete.id);
      setToDelete(null);
      setDetail(null);
      reload();
    } catch {
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleConvert = async (quote: Quote) => {
    setConverting(true);
    try {
      const result = await convertQuote(quote.id);
      push(t('quotes.converted', { number: result.invoice.number }), 'success');
      setDetail(null);
      reload();
    } catch (err) {
      push(parseApiError(err), 'danger');
    } finally {
      setConverting(false);
    }
  };

  const handleSend = (quote: Quote) => {
    void sendQuote(quote.id)
      .then(() => {
        push(t('quotes.sent'), 'success');
        reload();
      })
      .catch((err) => push(parseApiError(err), 'danger'));
  };

  const n = data?.length ?? 0;
  const countLabel = t(n === 1 ? 'quotes.count' : 'quotes.count_plural', { n });

  return (
    <div>
      <PageHeader
        kicker={t('quotes.kicker')}
        title={t('quotes.title')}
        description={t('quotes.desc')}
        action={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost" onClick={() => downloadExport('quotes')}>
              {t('common.exportCsv')}
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} />
              {t('quotes.new')}
            </button>
          </div>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('quotes.search')}
        status={status}
        onStatusChange={setStatus}
        statusOptions={statusOptions.quotes}
        countLabel={countLabel}
      />

      {loading && !data ? <LoadingState label={t('quotes.loading')} /> : null}
      {error && !data ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <section className="card">
          <div className="card-body" style={{ paddingTop: '0.5rem' }}>
            {!data.length ? (
              <EmptyTable
                message={t('quotes.empty')}
                hint={t('quotes.empty.hint')}
                action={
                  <button type="button" className="btn btn-primary" onClick={openCreate}>
                    {t('quotes.new')}
                  </button>
                }
              />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('quotes.col.number')}</th>
                      <th>{t('quotes.col.title')}</th>
                      <th>{t('quotes.col.client')}</th>
                      <th>{t('quotes.col.amount')}</th>
                      <th>{t('quotes.col.status')}</th>
                      <th>{t('quotes.col.issue')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((quote) => (
                      <tr key={quote.id}>
                        <td className="mono">
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => setDetail(quote)}
                          >
                            {quote.number}
                          </button>
                        </td>
                        <td>
                          <strong>{quote.title}</strong>
                        </td>
                        <td>{quote.client_name}</td>
                        <td className="mono">{formatCurrency(quote.amount)}</td>
                        <td>
                          <StatusBadge status={quote.status} />
                        </td>
                        <td>{formatDate(quote.issue_date)}</td>
                        <td>
                          <RowActions
                            onView={() => setDetail(quote)}
                            onPreview={() => setPreview(toPreview(quote))}
                            onConvert={
                              canConvert(quote.status)
                                ? () => void handleConvert(quote)
                                : undefined
                            }
                            onEdit={() => openEdit(quote)}
                            onDelete={() => setToDelete(quote)}
                            onSend={() => handleSend(quote)}
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
        title={editing ? t('quotes.modal.edit') : t('quotes.modal.create')}
        onClose={() => setModalOpen(false)}
        wide
        footer={
          <FormActions
            formId="quote-form"
            onCancel={() => setModalOpen(false)}
            submitLabel={editing ? t('common.save') : t('common.create')}
            loading={saving}
          />
        }
      >
        <form id="quote-form" className="form-grid" onSubmit={handleFormSubmit(save)}>
          {formError ? <p className="form-error span-2">{formError}</p> : null}
          <label className="field span-2">
            <span className="field-label">{t('quotes.field.title')}</span>
            <input
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('quotes.field.client')}</span>
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
            <span className="field-label">{t('quotes.field.project')}</span>
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
            <span className="field-label">{t('quotes.field.amount')}</span>
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
            <span className="field-label">{t('quotes.field.status')}</span>
            <select
              className="select"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as Quote['status'] })
              }
            >
              {QUOTE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t(`status.${value}` as TranslationKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('quotes.field.issue')}</span>
            <input
              className="input"
              type="date"
              required
              value={form.issue_date}
              onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('quotes.field.valid')}</span>
            <input
              className="input"
              type="date"
              value={form.valid_until ?? ''}
              onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
            />
          </label>
        </form>
      </Modal>

      <DetailSheet
        open={!!detail}
        title={t('quotes.detail.title')}
        onClose={() => setDetail(null)}
        fields={
          detail
            ? [
                { label: t('quotes.col.number'), value: detail.number },
                { label: t('quotes.col.title'), value: detail.title },
                { label: t('quotes.col.client'), value: detail.client_name },
                {
                  label: t('quotes.field.project'),
                  value: detail.project_name || t('common.none'),
                },
                { label: t('quotes.col.amount'), value: formatCurrency(detail.amount) },
                { label: t('quotes.col.status'), value: <StatusBadge status={detail.status} /> },
                { label: t('quotes.col.issue'), value: formatDate(detail.issue_date) },
                {
                  label: t('quotes.field.valid'),
                  value: detail.valid_until ? formatDate(detail.valid_until) : '—',
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
                <span>{t('common.preview')}</span>
              </button>
              {canConvert(detail.status) ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={converting}
                  onClick={() => void handleConvert(detail)}
                >
                  <ArrowRightLeft size={16} />
                  <span>{t('quotes.convert')}</span>
                </button>
              ) : null}
              <button type="button" className="btn btn-ghost" onClick={() => handleSend(detail)}>
                <Mail size={16} />
                <span>{t('common.sendEmail')}</span>
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
                <span>{t('common.edit')}</span>
              </button>
            </>
          ) : null
        }
      />

      <DocumentPreview open={!!preview} doc={preview} onClose={() => setPreview(null)} />

      <ConfirmDialog
        open={!!toDelete}
        title={t('quotes.delete.title')}
        message={t('quotes.delete.msg', { number: toDelete?.number ?? '' })}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
