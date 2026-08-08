import { useCallback, useEffect, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  GripVertical,
  Receipt,
  RefreshCw,
  Settings2,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { fetchDashboard } from '../api/dashboard';
import { saveSettings } from '../api/settings';
import { ActivityFeed } from '../components/ActivityFeed';
import { Card } from '../components/Card';
import { RevenueChart } from '../components/RevenueChart';
import { StatCard } from '../components/StatCard';
import { ErrorState, LoadingState } from '../components/StateViews';
import { useBranding } from '../context/BrandingContext';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import type { DashboardData, DashboardLayout, DashboardTask } from '../types';
import { parseApiError } from '../utils/hooks';
import { formatDate, useFormatCurrency } from '../utils/format';
import type { TranslationKey } from '../i18n/translations';

const WIDGET_IDS = [
  'revenueMonth',
  'unpaid',
  'projectsActive',
  'newClients',
  'conversion',
  'revenueChart',
  'activity',
  'tasksToday',
] as const;

type WidgetId = (typeof WIDGET_IDS)[number];

const WIDE_WIDGETS = new Set<WidgetId>(['revenueChart', 'activity', 'tasksToday']);

const WIDGET_LABEL_KEYS: Record<WidgetId, TranslationKey> = {
  revenueMonth: 'dash.widget.revenueMonth',
  unpaid: 'dash.widget.unpaid',
  projectsActive: 'dash.widget.projectsActive',
  newClients: 'dash.widget.newClients',
  conversion: 'dash.widget.conversion',
  revenueChart: 'dash.widget.revenueChart',
  activity: 'dash.widget.activity',
  tasksToday: 'dash.widget.tasksToday',
};

const DEFAULT_LAYOUT: DashboardLayout = {
  order: [...WIDGET_IDS],
  hidden: [],
};

function isWidgetId(value: string): value is WidgetId {
  return (WIDGET_IDS as readonly string[]).includes(value);
}

function parseLayout(raw: string | boolean | undefined): DashboardLayout {
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as Partial<DashboardLayout>;
      const rawOrder = Array.isArray(parsed.order) ? parsed.order : [];
      const rawHidden = Array.isArray(parsed.hidden) ? parsed.hidden : [];
      const order = rawOrder.filter(
        (id): id is string => typeof id === 'string' && isWidgetId(id),
      );
      WIDGET_IDS.forEach((id) => {
        if (!order.includes(id)) order.push(id);
      });
      const hidden = rawHidden.filter(
        (id): id is string => typeof id === 'string' && isWidgetId(id),
      );
      return { order, hidden };
    } catch {
      /* fall through to default */
    }
  }
  return { order: [...DEFAULT_LAYOUT.order], hidden: [...DEFAULT_LAYOUT.hidden] };
}

function priorityBadge(priority: string): string {
  switch (priority) {
    case 'high':
      return 'badge badge-danger';
    case 'medium':
      return 'badge badge-warning';
    default:
      return 'badge';
  }
}

function TasksTodayList({ tasks }: { tasks: DashboardTask[] }) {
  const { t } = useI18n();
  if (!tasks.length) {
    return <div className="empty-state">{t('dash.noTasks')}</div>;
  }
  return (
    <ul className="task-mini-list">
      {tasks.map((task) => (
        <li key={task.id} className="task-mini-item">
          <Link to="/tasks" className="task-mini-link">
            <div>
              <div className="task-mini-title">{task.title}</div>
              <div className="task-mini-sub">
                {task.client_name ? `${task.client_name} · ` : ''}
                {task.due_date ? formatDate(task.due_date) : ''}
              </div>
            </div>
            <span className={priorityBadge(task.priority)}>{task.priority}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

interface WidgetContentProps {
  id: WidgetId;
  data: DashboardData;
}

function WidgetContent({ id, data }: WidgetContentProps) {
  const { t } = useI18n();
  const formatCurrency = useFormatCurrency();
  const { stats } = data;

  switch (id) {
    case 'revenueMonth':
      return (
        <StatCard
          label={t('dash.revenueMonth')}
          value={formatCurrency(stats.revenueMonth)}
          meta={`${formatCurrency(stats.revenuePaid)} ${t('dash.total')}`}
          icon={<Wallet size={16} />}
          accentWidth="72%"
        />
      );
    case 'unpaid':
      return (
        <StatCard
          label={t('dash.unpaid')}
          value={String(stats.unpaidCount)}
          meta={`${formatCurrency(stats.unpaidAmount)} ${t('dash.pending')}`}
          icon={<Receipt size={16} />}
          accentWidth="48%"
        />
      );
    case 'projectsActive':
      return (
        <StatCard
          label={t('dash.projectsActive')}
          value={String(stats.projectsActive)}
          meta={`${stats.projectsTotal} ${t('dash.projects')}`}
          icon={<FolderKanban size={16} />}
          accentWidth="55%"
        />
      );
    case 'newClients':
      return (
        <StatCard
          label={t('dash.newClients')}
          value={String(stats.clientsNewMonth)}
          meta={`${stats.clientsTotal} ${t('dash.total')}`}
          icon={<Users size={16} />}
          accentWidth="40%"
        />
      );
    case 'conversion':
      return (
        <StatCard
          label={t('dash.conversion')}
          value={`${stats.quoteConversionRate}%`}
          meta={`${stats.quotesAccepted}/${stats.quotesTotal}`}
          icon={<TrendingUp size={16} />}
          accentWidth={`${Math.min(100, stats.quoteConversionRate)}%`}
        />
      );
    case 'revenueChart':
      return (
        <Card
          className="chart-panel"
          title={t('dash.revenueChart')}
          subtitle={t('dash.revenueChartSub')}
        >
          <RevenueChart data={data.revenueByMonth} />
        </Card>
      );
    case 'activity':
      return (
        <Card title={t('dash.activity')} subtitle={t('dash.activitySub')}>
          <ActivityFeed items={data.recentActivity} />
        </Card>
      );
    case 'tasksToday':
      return (
        <Card
          title={t('dash.tasksToday')}
          action={
            <Link to="/tasks" className="link-btn">
              {t('dash.viewAllTasks')}
            </Link>
          }
        >
          <TasksTodayList tasks={data.tasksToday} />
        </Card>
      );
    default:
      return null;
  }
}

export function DashboardPage() {
  const { t } = useI18n();
  const { settings, refresh } = useBranding();
  const { push } = useToast();
  const loader = useCallback(() => fetchDashboard(), []);
  const { data, loading, error, reload } = useAsyncData(loader);

  const [layout, setLayout] = useState<DashboardLayout>(() => parseLayout(settings.dashboard_layout));
  const [draggedId, setDraggedId] = useState<WidgetId | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [pendingHidden, setPendingHidden] = useState<string[]>([]);
  const [savingLayout, setSavingLayout] = useState(false);

  useEffect(() => {
    setLayout(parseLayout(settings.dashboard_layout));
  }, [settings.dashboard_layout]);

  const persistLayout = useCallback(
    async (next: DashboardLayout) => {
      setLayout(next);
      setSavingLayout(true);
      try {
        await saveSettings({ dashboard_layout: JSON.stringify(next) });
        await refresh();
      } catch (err) {
        push(parseApiError(err), 'danger');
      } finally {
        setSavingLayout(false);
      }
    },
    [refresh, push],
  );

  const openCustomize = () => {
    setPendingHidden([...layout.hidden]);
    setCustomizeOpen(true);
  };

  const toggleHidden = (id: WidgetId) => {
    setPendingHidden((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onSaveCustomize = async () => {
    await persistLayout({ ...layout, hidden: pendingHidden });
    setCustomizeOpen(false);
    push(t('dash.layoutSaved'), 'success');
  };

  const handleDragStart = (id: WidgetId) => (e: DragEvent<HTMLDivElement>) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: WidgetId) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const sourceId = draggedId ?? e.dataTransfer.getData('text/plain');
    setDraggedId(null);
    if (!sourceId || sourceId === targetId || !isWidgetId(sourceId)) return;
    const next = [...layout.order];
    const from = next.indexOf(sourceId);
    const to = next.indexOf(targetId);
    if (from === -1 || to === -1) return;
    next.splice(from, 1);
    next.splice(to, 0, sourceId);
    void persistLayout({ ...layout, order: next });
  };

  if (loading && !data) {
    return <LoadingState label={t('dash.loading')} />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (!data) return null;

  const visibleOrder = layout.order.filter(
    (id): id is WidgetId => isWidgetId(id) && !layout.hidden.includes(id),
  );

  return (
    <div>
      <header className="page-header">
        <div>
          <div className="page-kicker">{t('dash.kicker')}</div>
          <h2 className="page-title">{t('dash.title')}</h2>
          <p className="page-desc">{t('dash.desc')}</p>
        </div>
        <div className="dash-toolbar">
          <button type="button" className="btn btn-ghost" onClick={openCustomize}>
            <Settings2 size={16} />
            {t('dash.customize')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={reload}>
            <RefreshCw size={16} />
            {t('common.refresh')}
          </button>
        </div>
      </header>

      <section className="dash-widgets" aria-label={t('dash.kicker')}>
        {visibleOrder.map((id) => (
          <div
            key={id}
            className={`dash-widget${WIDE_WIDGETS.has(id) ? ' dash-widget-wide' : ''}${
              draggedId === id ? ' dragging' : ''
            }`}
            draggable
            onDragStart={handleDragStart(id)}
            onDragOver={handleDragOver}
            onDrop={handleDrop(id)}
            onDragEnd={() => setDraggedId(null)}
          >
            <span className="dash-widget-handle" aria-hidden>
              <GripVertical size={14} />
            </span>
            <WidgetContent id={id} data={data} />
          </div>
        ))}
      </section>

      {customizeOpen ? (
        <div className="modal-backdrop" onClick={() => setCustomizeOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('dash.customize')}</h3>
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                onClick={() => setCustomizeOpen(false)}
                aria-label={t('common.cancel')}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p className="settings-hint">{t('dash.customizeHint')}</p>
              <ul className="dash-customize-list">
                {layout.order.map((id) => {
                  if (!isWidgetId(id)) return null;
                  const hidden = pendingHidden.includes(id);
                  return (
                    <li key={id} className="dash-customize-row">
                      <label>
                        <input
                          type="checkbox"
                          checked={!hidden}
                          onChange={() => toggleHidden(id)}
                          aria-label={hidden ? t('dash.show') : t('dash.hide')}
                        />
                        <span>{t(WIDGET_LABEL_KEYS[id])}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCustomizeOpen(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={savingLayout}
                onClick={() => void onSaveCustomize()}
              >
                {savingLayout ? t('common.saving') : t('dash.saveLayout')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
