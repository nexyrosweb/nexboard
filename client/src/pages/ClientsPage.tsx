import { Pencil, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import {
  createClient,
  deleteClient,
  fetchClients,
  updateClient,
  type ClientInput,
} from '../api/clients';
import { DetailSheet } from '../components/DetailSheet';
import { ConfirmDialog, FormActions, Modal, handleFormSubmit } from '../components/Modal';
import { ListToolbar, PageHeader } from '../components/PageChrome';
import { ErrorState, LoadingState } from '../components/StateViews';
import { EmptyTable, RowActions, StatusBadge } from '../components/TableBits';
import { CLIENT_STATUSES, useStatusOptions } from '../constants/statuses';
import { useI18n } from '../context/I18nContext';
import { useAsyncData } from '../hooks/useAsyncData';
import type { TranslationKey } from '../i18n/translations';
import type { Client } from '../types';
import { formatDate } from '../utils/format';
import { parseApiError, useDebouncedValue } from '../utils/hooks';

const emptyForm: ClientInput = {
  name: '',
  email: '',
  phone: '',
  company: '',
  status: 'actif',
  notes: '',
};

export function ClientsPage() {
  const { t } = useI18n();
  const statusOptions = useStatusOptions();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const loader = useCallback(
    () => fetchClients({ q: debouncedSearch || undefined, status: status || undefined }),
    [debouncedSearch, status],
  );
  const { data, loading, error, reload } = useAsyncData(loader);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState<Client | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone ?? '',
      company: client.company ?? '',
      status: client.status,
      notes: client.notes ?? '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await updateClient(editing.id, form);
      else await createClient(form);
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
      await deleteClient(toDelete.id);
      setToDelete(null);
      setDetail(null);
      reload();
    } catch (err) {
      setFormError(parseApiError(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const n = data?.length ?? 0;
  const countLabel = t(n === 1 ? 'clients.count' : 'clients.count_plural', { n });

  return (
    <div>
      <PageHeader
        kicker={t('clients.kicker')}
        title={t('clients.title')}
        description={t('clients.desc')}
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {t('clients.new')}
          </button>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('clients.search')}
        status={status}
        onStatusChange={setStatus}
        statusOptions={statusOptions.clients}
        countLabel={countLabel}
      />

      {loading && !data ? <LoadingState label={t('clients.loading')} /> : null}
      {error && !data ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <section className="card">
          <div className="card-body" style={{ paddingTop: '0.5rem' }}>
            {!data.length ? (
              <EmptyTable
                message={t('clients.empty')}
                hint={t('clients.empty.hint')}
                action={
                  <button type="button" className="btn btn-primary" onClick={openCreate}>
                    {t('clients.add')}
                  </button>
                }
              />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('clients.col.name')}</th>
                      <th>{t('clients.col.company')}</th>
                      <th>{t('clients.col.email')}</th>
                      <th>{t('clients.col.phone')}</th>
                      <th>{t('clients.col.status')}</th>
                      <th>{t('clients.col.created')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((client) => (
                      <tr key={client.id}>
                        <td>
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => setDetail(client)}
                          >
                            <strong>{client.name}</strong>
                          </button>
                        </td>
                        <td>{client.company || '—'}</td>
                        <td>{client.email}</td>
                        <td>{client.phone || '—'}</td>
                        <td>
                          <StatusBadge status={client.status} />
                        </td>
                        <td>{formatDate(client.created_at)}</td>
                        <td>
                          <RowActions
                            onView={() => setDetail(client)}
                            onEdit={() => openEdit(client)}
                            onDelete={() => setToDelete(client)}
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
        title={editing ? t('clients.modal.edit') : t('clients.modal.create')}
        onClose={() => setModalOpen(false)}
        footer={
          <FormActions
            formId="client-form"
            onCancel={() => setModalOpen(false)}
            submitLabel={editing ? t('common.save') : t('common.create')}
            loading={saving}
          />
        }
      >
        <form id="client-form" className="form-grid" onSubmit={handleFormSubmit(save)}>
          {formError ? <p className="form-error span-2">{formError}</p> : null}
          <label className="field">
            <span className="field-label">{t('clients.field.name')}</span>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('clients.field.status')}</span>
            <select
              className="select"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as Client['status'] })
              }
            >
              {CLIENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t(`status.${value}` as TranslationKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('clients.field.email')}</span>
            <input
              className="input"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('clients.field.phone')}</span>
            <input
              className="input"
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="field span-2">
            <span className="field-label">{t('clients.field.company')}</span>
            <input
              className="input"
              value={form.company ?? ''}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </label>
          <label className="field span-2">
            <span className="field-label">{t('clients.field.notes')}</span>
            <textarea
              className="textarea"
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
        </form>
      </Modal>

      <DetailSheet
        open={!!detail}
        title={t('clients.detail.title')}
        onClose={() => setDetail(null)}
        fields={
          detail
            ? [
                { label: t('clients.col.name'), value: detail.name },
                { label: t('clients.col.company'), value: detail.company || '—' },
                { label: t('clients.col.email'), value: detail.email },
                { label: t('clients.col.phone'), value: detail.phone || '—' },
                { label: t('clients.col.status'), value: <StatusBadge status={detail.status} /> },
                { label: t('clients.field.notes'), value: detail.notes || '—' },
                { label: t('clients.col.created'), value: formatDate(detail.created_at) },
              ]
            : []
        }
        actions={
          detail ? (
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
          ) : null
        }
      />

      <ConfirmDialog
        open={!!toDelete}
        title={t('clients.delete.title')}
        message={t('clients.delete.msg', { name: toDelete?.name ?? '' })}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
