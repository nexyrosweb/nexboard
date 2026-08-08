import { CalendarClock, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { fetchClients } from '../api/clients';
import { fetchProjects } from '../api/projects';
import { createTask, deleteTask, fetchTasks, updateTask, type TaskInput } from '../api/tasks';
import { ConfirmDialog, FormActions, Modal, handleFormSubmit } from '../components/Modal';
import { PageHeader } from '../components/PageChrome';
import { ErrorState, LoadingState } from '../components/StateViews';
import { EmptyTable, RowActions, StatusBadge } from '../components/TableBits';
import { useI18n } from '../context/I18nContext';
import { useAsyncData } from '../hooks/useAsyncData';
import type { TranslationKey } from '../i18n/translations';
import type { Client, Project, Task } from '../types';
import { formatDate, priorityBadgeClass } from '../utils/format';
import { parseApiError, todayISO, useDebouncedValue } from '../utils/hooks';

const STATUS_VALUES: Task['status'][] = ['todo', 'in_progress', 'done', 'cancelled'];
const PRIORITY_VALUES: Task['priority'][] = ['low', 'medium', 'high'];

type TaskFormState = {
  title: string;
  description: string;
  status: Task['status'];
  priority: Task['priority'];
  due_date: string;
  reminder_at: string;
  assignee: string;
  client_id: number | null;
  project_id: number | null;
};

const emptyForm = (): TaskFormState => ({
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  due_date: '',
  reminder_at: '',
  assignee: '',
  client_id: null,
  project_id: null,
});

function toDatetimeLocal(value: string | null): string {
  if (!value) return '';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  return normalized.slice(0, 16);
}

function isOverdue(task: Task): boolean {
  if (!task.due_date) return false;
  if (task.status === 'done' || task.status === 'cancelled') return false;
  return task.due_date < todayISO();
}

function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useI18n();
  const label = t(`priority.${priority}` as TranslationKey);
  return (
    <span className={priorityBadgeClass(priority)}>
      {label.startsWith('priority.') ? priority : label}
    </span>
  );
}

export function TasksPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [todayOnly, setTodayOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const loader = useCallback(
    () =>
      fetchTasks({
        q: debouncedSearch || undefined,
        status: status || undefined,
        priority: priority || undefined,
        today: todayOnly ? '1' : undefined,
      }),
    [debouncedSearch, status, priority, todayOnly],
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
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ?? '',
      reminder_at: toDatetimeLocal(task.reminder_at),
      assignee: task.assignee ?? '',
      client_id: task.client_id,
      project_id: task.project_id,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload: TaskInput = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        reminder_at: form.reminder_at || null,
        assignee: form.assignee.trim() || null,
        client_id: form.client_id,
        project_id: form.project_id,
      };
      if (editing) await updateTask(editing.id, payload);
      else await createTask(payload);
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
      await deleteTask(toDelete.id);
      setToDelete(null);
      reload();
    } catch (err) {
      setFormError(parseApiError(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const n = data?.length ?? 0;
  const countLabel = t(n === 1 ? 'tasks.count' : 'tasks.count_plural', { n });

  return (
    <div>
      <PageHeader
        kicker={t('tasks.kicker')}
        title={t('tasks.title')}
        description={t('tasks.desc')}
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {t('tasks.new')}
          </button>
        }
      />

      <div className="list-toolbar">
        <div className="search-box grow">
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('tasks.search')}
            aria-label={t('common.search')}
          />
        </div>
        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label={t('common.allStatuses')}
        >
          <option value="">{t('common.allStatuses')}</option>
          {STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {t(`status.${value}` as TranslationKey)}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          aria-label={t('tasks.allPriorities')}
        >
          <option value="">{t('tasks.allPriorities')}</option>
          {PRIORITY_VALUES.map((value) => (
            <option key={value} value={value}>
              {t(`priority.${value}` as TranslationKey)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={`btn ${todayOnly ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTodayOnly((v) => !v)}
        >
          <CalendarClock size={16} />
          {t('tasks.today')}
        </button>
        <span className="toolbar-count">{countLabel}</span>
      </div>

      {loading && !data ? <LoadingState label={t('tasks.loading')} /> : null}
      {error && !data ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <section className="card">
          <div className="card-body" style={{ paddingTop: '0.5rem' }}>
            {!data.length ? (
              <EmptyTable
                message={t('tasks.empty')}
                hint={t('tasks.empty.hint')}
                action={
                  <button type="button" className="btn btn-primary" onClick={openCreate}>
                    {t('tasks.new')}
                  </button>
                }
              />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('tasks.col.title')}</th>
                      <th>{t('tasks.col.status')}</th>
                      <th>{t('tasks.col.priority')}</th>
                      <th>{t('tasks.col.due')}</th>
                      <th>{t('tasks.col.assignee')}</th>
                      <th>{t('tasks.col.client')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((task) => {
                      const overdue = isOverdue(task);
                      return (
                        <tr key={task.id} className={overdue ? 'task-row-overdue' : undefined}>
                          <td>
                            <strong>{task.title}</strong>
                            {task.project_name ? (
                              <div className="task-subtext">{task.project_name}</div>
                            ) : null}
                          </td>
                          <td>
                            <StatusBadge status={task.status} />
                          </td>
                          <td>
                            <PriorityBadge priority={task.priority} />
                          </td>
                          <td className={overdue ? 'task-overdue-cell' : undefined}>
                            {task.due_date ? formatDate(task.due_date) : '—'}
                            {overdue ? <span className="task-overdue-flag"> · {t('tasks.overdue')}</span> : null}
                          </td>
                          <td>{task.assignee || '—'}</td>
                          <td>{task.client_name || '—'}</td>
                          <td>
                            <RowActions onEdit={() => openEdit(task)} onDelete={() => setToDelete(task)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <Modal
        open={modalOpen}
        title={editing ? t('tasks.modal.edit') : t('tasks.modal.create')}
        onClose={() => setModalOpen(false)}
        wide
        footer={
          <FormActions
            formId="task-form"
            onCancel={() => setModalOpen(false)}
            submitLabel={editing ? t('common.save') : t('common.create')}
            loading={saving}
          />
        }
      >
        <form id="task-form" className="form-grid" onSubmit={handleFormSubmit(save)}>
          {formError ? <p className="form-error span-2">{formError}</p> : null}
          <label className="field span-2">
            <span className="field-label">{t('tasks.field.title')}</span>
            <input
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('tasks.field.status')}</span>
            <select
              className="select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Task['status'] })}
            >
              {STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {t(`status.${value}` as TranslationKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('tasks.field.priority')}</span>
            <select
              className="select"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })}
            >
              {PRIORITY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {t(`priority.${value}` as TranslationKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('tasks.field.dueDate')}</span>
            <input
              className="input"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('tasks.field.reminder')}</span>
            <input
              className="input"
              type="datetime-local"
              value={form.reminder_at}
              onChange={(e) => setForm({ ...form, reminder_at: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('tasks.field.assignee')}</span>
            <input
              className="input"
              value={form.assignee}
              onChange={(e) => setForm({ ...form, assignee: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('tasks.field.client')}</span>
            <select
              className="select"
              value={form.client_id ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  client_id: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">{t('common.none')}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('tasks.field.project')}</span>
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
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field span-2">
            <span className="field-label">{t('tasks.field.description')}</span>
            <textarea
              className="textarea"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title={t('tasks.delete.title')}
        message={t('tasks.delete.msg', { title: toDelete?.title ?? '' })}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
