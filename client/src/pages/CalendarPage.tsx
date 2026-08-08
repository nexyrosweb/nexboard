import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClients } from '../api/clients';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendar,
  fetchCalendarEvents,
  updateCalendarEvent,
  type CalendarEventInput,
} from '../api/calendar';
import { fetchProjects } from '../api/projects';
import { ConfirmDialog, Modal, handleFormSubmit } from '../components/Modal';
import { PageHeader } from '../components/PageChrome';
import { ErrorState, LoadingState } from '../components/StateViews';
import { useI18n } from '../context/I18nContext';
import { useAsyncData } from '../hooks/useAsyncData';
import type { TranslationKey } from '../i18n/translations';
import type { CalendarEvent, CalendarItem, Client, Project } from '../types';
import { parseApiError } from '../utils/hooks';

type ViewMode = 'month' | 'week';

const TYPE_KEYS: Array<{ color: string; labelKey: TranslationKey }> = [
  { color: 'event', labelKey: 'calendar.legend.event' },
  { color: 'invoice', labelKey: 'calendar.legend.invoice' },
  { color: 'quote', labelKey: 'calendar.legend.quote' },
  { color: 'project', labelKey: 'calendar.legend.project' },
  { color: 'task', labelKey: 'calendar.legend.task' },
  { color: 'danger', labelKey: 'calendar.legend.danger' },
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function rangeFor(mode: ViewMode, anchor: Date): { start: Date; end: Date } {
  if (mode === 'week') {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 6) };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { start: startOfWeek(first), end: addDays(startOfWeek(last), 6) };
}

function buildDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cur = start;
  while (cur.getTime() <= end.getTime()) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return '';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  return normalized.slice(0, 16);
}

type EventFormState = {
  title: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  client_id: number | null;
  project_id: number | null;
  reminder_minutes: string;
};

const emptyEventForm = (startsAt = ''): EventFormState => ({
  title: '',
  description: '',
  location: '',
  starts_at: startsAt,
  ends_at: '',
  all_day: false,
  client_id: null,
  project_id: null,
  reminder_minutes: '',
});

export function CalendarPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<ViewMode>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const { start, end } = useMemo(() => rangeFor(mode, anchor), [mode, anchor]);
  const fromISO = useMemo(() => toISODate(start), [start]);
  const toISO = useMemo(() => toISODate(end), [end]);

  const loader = useCallback(
    () => fetchCalendar({ from: fromISO, to: toISO }),
    [fromISO, toISO],
  );
  const { data, loading, error, reload } = useAsyncData(loader);

  const reloadEvents = useCallback(() => {
    void fetchCalendarEvents({ from: fromISO, to: toISO })
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [fromISO, toISO]);

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

  useEffect(() => {
    reloadEvents();
  }, [reloadEvents]);

  const days = useMemo(() => buildDays(start, end), [start, end]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of data?.items ?? []) {
      const key = item.date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [data]);

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return days.slice(0, 7).map((d) => fmt.format(d));
  }, [days, locale]);

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventFormState>(emptyEventForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = (dayKey?: string) => {
    setEditingEvent(null);
    setForm(emptyEventForm(dayKey ? `${dayKey}T09:00` : ''));
    setFormError(null);
    setEventModalOpen(true);
  };

  const openEditEvent = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setForm({
      title: evt.title,
      description: evt.description ?? '',
      location: evt.location ?? '',
      starts_at: toDatetimeLocal(evt.starts_at),
      ends_at: toDatetimeLocal(evt.ends_at),
      all_day: Boolean(evt.all_day),
      client_id: evt.client_id,
      project_id: evt.project_id,
      reminder_minutes: evt.reminder_minutes != null ? String(evt.reminder_minutes) : '',
    });
    setFormError(null);
    setEventModalOpen(true);
  };

  const handleItemClick = (item: CalendarItem) => {
    if (item.editable) {
      const evt = events.find((e) => e.id === item.ref_id);
      if (evt) openEditEvent(evt);
      return;
    }
    navigate(item.link);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload: CalendarEventInput = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        starts_at: form.starts_at,
        ends_at: form.ends_at || null,
        all_day: form.all_day,
        client_id: form.client_id,
        project_id: form.project_id,
        reminder_minutes: form.reminder_minutes ? Number(form.reminder_minutes) : null,
      };
      if (editingEvent) await updateCalendarEvent(editingEvent.id, payload);
      else await createCalendarEvent(payload);
      setEventModalOpen(false);
      reload();
      reloadEvents();
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
      await deleteCalendarEvent(toDelete.id);
      setToDelete(null);
      setEventModalOpen(false);
      reload();
      reloadEvents();
    } catch (err) {
      setFormError(parseApiError(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const goPrev = () => {
    setAnchor((cur) =>
      mode === 'week' ? addDays(cur, -7) : new Date(cur.getFullYear(), cur.getMonth() - 1, 1),
    );
  };
  const goNext = () => {
    setAnchor((cur) =>
      mode === 'week' ? addDays(cur, 7) : new Date(cur.getFullYear(), cur.getMonth() + 1, 1),
    );
  };
  const goToday = () => setAnchor(new Date());

  const rangeLabel = useMemo(() => {
    if (mode === 'month') {
      return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(anchor);
    }
    const fmtDay = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' });
    return `${fmtDay.format(start)} – ${fmtDay.format(end)}`;
  }, [mode, anchor, start, end, locale]);

  const hasItems = (data?.items?.length ?? 0) > 0;
  const todayKey = toISODate(new Date());

  return (
    <div>
      <PageHeader
        kicker={t('calendar.kicker')}
        title={t('calendar.title')}
        description={t('calendar.desc')}
        action={
          <button type="button" className="btn btn-primary" onClick={() => openCreate()}>
            <Plus size={16} />
            {t('calendar.createEvent')}
          </button>
        }
      />

      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={goPrev}
            aria-label={t('calendar.prev')}
          >
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="btn btn-ghost" onClick={goToday}>
            {t('calendar.today')}
          </button>
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={goNext}
            aria-label={t('calendar.next')}
          >
            <ChevronRight size={16} />
          </button>
          <span className="calendar-range-label">{rangeLabel}</span>
        </div>
        <div className="calendar-view-toggle">
          <button
            type="button"
            className={`btn ${mode === 'month' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('month')}
          >
            {t('calendar.month')}
          </button>
          <button
            type="button"
            className={`btn ${mode === 'week' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('week')}
          >
            {t('calendar.week')}
          </button>
        </div>
      </div>

      <div className="calendar-legend">
        {TYPE_KEYS.map(({ color, labelKey }) => (
          <span key={color} className="calendar-legend-item">
            <span className={`calendar-dot calendar-dot-${color}`} aria-hidden />
            {t(labelKey)}
          </span>
        ))}
      </div>

      {loading && !data ? <LoadingState label={t('common.loading')} /> : null}
      {error && !data ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <section className="card calendar-card">
          <div className="card-body">
            {!hasItems ? <p className="calendar-empty-hint">{t('calendar.empty')}</p> : null}
            <div className={`calendar-grid calendar-grid-${mode}`}>
              {weekdayLabels.map((label, idx) => (
                <div key={`${label}-${idx}`} className="calendar-weekday">
                  {label}
                </div>
              ))}
              {days.map((day) => {
                const key = toISODate(day);
                const items = itemsByDay.get(key) ?? [];
                const inCurrentMonth = mode === 'week' || day.getMonth() === anchor.getMonth();
                return (
                  <button
                    key={key}
                    type="button"
                    className={`calendar-cell${inCurrentMonth ? '' : ' calendar-cell-muted'}${
                      key === todayKey ? ' calendar-cell-today' : ''
                    }`}
                    onClick={() => openCreate(key)}
                  >
                    <div className="calendar-cell-head">
                      <span className="calendar-day-number">{day.getDate()}</span>
                    </div>
                    <div className="calendar-cell-items">
                      {items.map((item) => (
                        <span
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          className={`calendar-chip calendar-chip-${item.color}`}
                          title={item.meta ?? item.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(item);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              handleItemClick(item);
                            }
                          }}
                        >
                          {item.title}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <Modal
        open={eventModalOpen}
        title={editingEvent ? t('calendar.modal.edit') : t('calendar.modal.create')}
        onClose={() => setEventModalOpen(false)}
        wide
        footer={
          <>
            {editingEvent ? (
              <button
                type="button"
                className="btn btn-danger"
                disabled={saving}
                onClick={() => setToDelete(editingEvent)}
              >
                <Trash2 size={16} />
                {t('common.delete')}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEventModalOpen(false)}
              disabled={saving}
            >
              {t('common.cancel')}
            </button>
            <button type="submit" form="calendar-event-form" className="btn btn-primary" disabled={saving}>
              {saving ? t('common.saving') : editingEvent ? t('common.save') : t('common.create')}
            </button>
          </>
        }
      >
        <form id="calendar-event-form" className="form-grid" onSubmit={handleFormSubmit(save)}>
          {formError ? <p className="form-error span-2">{formError}</p> : null}
          <label className="field span-2">
            <span className="field-label">{t('calendar.field.title')}</span>
            <input
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('calendar.field.start')}</span>
            <input
              className="input"
              type="datetime-local"
              required
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('calendar.field.end')}</span>
            <input
              className="input"
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            />
          </label>
          <label className="field checkbox-field">
            <input
              type="checkbox"
              checked={form.all_day}
              onChange={(e) => setForm({ ...form, all_day: e.target.checked })}
            />
            <span className="field-label">{t('calendar.field.allDay')}</span>
          </label>
          <label className="field">
            <span className="field-label">{t('calendar.field.location')}</span>
            <input
              className="input"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('calendar.field.client')}</span>
            <select
              className="select"
              value={form.client_id ?? ''}
              onChange={(e) =>
                setForm({ ...form, client_id: e.target.value ? Number(e.target.value) : null })
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
            <span className="field-label">{t('calendar.field.project')}</span>
            <select
              className="select"
              value={form.project_id ?? ''}
              onChange={(e) =>
                setForm({ ...form, project_id: e.target.value ? Number(e.target.value) : null })
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
          <label className="field">
            <span className="field-label">{t('calendar.field.reminder')}</span>
            <input
              className="input"
              type="number"
              min={0}
              step={5}
              value={form.reminder_minutes}
              onChange={(e) => setForm({ ...form, reminder_minutes: e.target.value })}
            />
          </label>
          <label className="field span-2">
            <span className="field-label">{t('calendar.field.description')}</span>
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
        title={t('calendar.delete.title')}
        message={t('calendar.delete.msg', { title: toDelete?.title ?? '' })}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
