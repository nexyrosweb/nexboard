import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { fetchClients } from '../api/clients';
import {
  createProject,
  deleteProject,
  fetchProjects,
  updateProject,
  type ProjectInput,
} from '../api/projects';
import { ConfirmDialog, FormActions, Modal, handleFormSubmit } from '../components/Modal';
import { ListToolbar, PageHeader } from '../components/PageChrome';
import { ErrorState, LoadingState } from '../components/StateViews';
import { EmptyTable, RowActions, StatusBadge } from '../components/TableBits';
import { PROJECT_STATUSES, useStatusOptions } from '../constants/statuses';
import { useI18n } from '../context/I18nContext';
import { useAsyncData } from '../hooks/useAsyncData';
import type { TranslationKey } from '../i18n/translations';
import type { Client, Project } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { parseApiError, useDebouncedValue } from '../utils/hooks';

const emptyForm = (): ProjectInput => ({
  client_id: 0,
  name: '',
  description: '',
  status: 'en_cours',
  budget: 0,
  start_date: '',
  end_date: '',
});

export function ProjectsPage() {
  const { t } = useI18n();
  const statusOptions = useStatusOptions();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [clients, setClients] = useState<Client[]>([]);

  const loader = useCallback(
    () => fetchProjects({ q: debouncedSearch || undefined, status: status || undefined }),
    [debouncedSearch, status],
  );
  const { data, loading, error, reload } = useAsyncData(loader);

  useEffect(() => {
    void fetchClients().then(setClients).catch(() => setClients([]));
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm(),
      client_id: clients[0]?.id ?? 0,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setForm({
      client_id: project.client_id,
      name: project.name,
      description: project.description ?? '',
      status: project.status,
      budget: project.budget,
      start_date: project.start_date ?? '',
      end_date: project.end_date ?? '',
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
        budget: Number(form.budget) || 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (editing) await updateProject(editing.id, payload);
      else await createProject(payload);
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
      await deleteProject(toDelete.id);
      setToDelete(null);
      reload();
    } catch {
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const n = data?.length ?? 0;
  const countLabel = t(n === 1 ? 'projects.count' : 'projects.count_plural', { n });

  return (
    <div>
      <PageHeader
        kicker={t('projects.kicker')}
        title={t('projects.title')}
        description={t('projects.desc')}
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {t('projects.new')}
          </button>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('projects.search')}
        status={status}
        onStatusChange={setStatus}
        statusOptions={statusOptions.projects}
        countLabel={countLabel}
      />

      {loading && !data ? <LoadingState label={t('projects.loading')} /> : null}
      {error && !data ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <section className="card">
          <div className="card-body" style={{ paddingTop: '0.5rem' }}>
            {!data.length ? (
              <EmptyTable message={t('projects.empty')} />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('projects.col.project')}</th>
                      <th>{t('projects.col.client')}</th>
                      <th>{t('projects.col.budget')}</th>
                      <th>{t('projects.col.status')}</th>
                      <th>{t('projects.col.start')}</th>
                      <th>{t('projects.col.end')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((project) => (
                      <tr key={project.id}>
                        <td>
                          <strong>{project.name}</strong>
                        </td>
                        <td>{project.client_name}</td>
                        <td className="mono">{formatCurrency(project.budget)}</td>
                        <td>
                          <StatusBadge status={project.status} />
                        </td>
                        <td>{project.start_date ? formatDate(project.start_date) : '—'}</td>
                        <td>{project.end_date ? formatDate(project.end_date) : '—'}</td>
                        <td>
                          <RowActions
                            onEdit={() => openEdit(project)}
                            onDelete={() => setToDelete(project)}
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
        title={editing ? t('projects.modal.edit') : t('projects.modal.create')}
        onClose={() => setModalOpen(false)}
        wide
        footer={
          <FormActions
            formId="project-form"
            onCancel={() => setModalOpen(false)}
            submitLabel={editing ? t('common.save') : t('common.create')}
            loading={saving}
          />
        }
      >
        <form id="project-form" className="form-grid" onSubmit={handleFormSubmit(save)}>
          {formError ? <p className="form-error span-2">{formError}</p> : null}
          <label className="field span-2">
            <span className="field-label">{t('projects.field.name')}</span>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('projects.field.client')}</span>
            <select
              className="select"
              required
              value={form.client_id || ''}
              onChange={(e) => setForm({ ...form, client_id: Number(e.target.value) })}
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
            <span className="field-label">{t('projects.field.status')}</span>
            <select
              className="select"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as Project['status'] })
              }
            >
              {PROJECT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t(`status.${value}` as TranslationKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('projects.field.budget')}</span>
            <input
              className="input"
              type="number"
              min={0}
              step={100}
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('projects.field.start')}</span>
            <input
              className="input"
              type="date"
              value={form.start_date ?? ''}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('projects.field.end')}</span>
            <input
              className="input"
              type="date"
              value={form.end_date ?? ''}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </label>
          <label className="field span-2">
            <span className="field-label">{t('projects.field.description')}</span>
            <textarea
              className="textarea"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title={t('projects.delete.title')}
        message={t('projects.delete.msg', { name: toDelete?.name ?? '' })}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
