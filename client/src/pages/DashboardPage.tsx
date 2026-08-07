import { useCallback } from 'react';
import {
  FolderKanban,
  Receipt,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react';
import { fetchDashboard } from '../api/dashboard';
import { ActivityFeed } from '../components/ActivityFeed';
import { Card } from '../components/Card';
import { RevenueChart } from '../components/RevenueChart';
import { StatCard } from '../components/StatCard';
import { StatusPieChart } from '../components/StatusPieChart';
import { ErrorState, LoadingState } from '../components/StateViews';
import { useI18n } from '../context/I18nContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatCurrency } from '../utils/format';

export function DashboardPage() {
  const { t } = useI18n();
  const loader = useCallback(() => fetchDashboard(), []);
  const { data, loading, error, reload } = useAsyncData(loader);

  if (loading && !data) {
    return <LoadingState label={t('dash.loading')} />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (!data) return null;

  const { stats, revenueByMonth, invoicesByStatus, recentActivity } = data;

  return (
    <div>
      <header className="page-header">
        <div>
          <div className="page-kicker">{t('dash.kicker')}</div>
          <h2 className="page-title">{t('dash.title')}</h2>
          <p className="page-desc">{t('dash.desc')}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={reload}>
          <RefreshCw size={16} />
          {t('common.refresh')}
        </button>
      </header>

      <section className="kpi-grid" aria-label={t('dash.kicker')}>
        <StatCard
          label={t('dash.revenue')}
          value={formatCurrency(stats.revenuePaid)}
          meta={`${formatCurrency(stats.revenuePending)} ${t('dash.pending')}`}
          icon={<Wallet size={16} />}
          accentWidth="78%"
          delay={0}
        />
        <StatCard
          label={t('dash.clientsActive')}
          value={String(stats.clientsActive)}
          meta={`${stats.clientsTotal} ${t('dash.total')}`}
          icon={<Users size={16} />}
          accentWidth="55%"
          delay={60}
        />
        <StatCard
          label={t('dash.projectsActive')}
          value={String(stats.projectsActive)}
          meta={`${stats.projectsTotal} ${t('dash.projects')}`}
          icon={<FolderKanban size={16} />}
          accentWidth="48%"
          delay={120}
        />
        <StatCard
          label={t('dash.openInvoices')}
          value={String(stats.invoicesOutstanding)}
          meta={`${stats.quotesPending} ${t('dash.quotesPending')}`}
          icon={<Receipt size={16} />}
          accentWidth="36%"
          delay={180}
        />
      </section>

      <section className="charts-grid">
        <Card
          className="chart-panel"
          title={t('dash.revenueChart')}
          subtitle={t('dash.revenueChartSub')}
        >
          <RevenueChart data={revenueByMonth} />
        </Card>
        <Card
          className="chart-panel"
          title={t('dash.invoiceSplit')}
          subtitle={t('dash.invoiceSplitSub')}
        >
          <StatusPieChart data={invoicesByStatus} />
        </Card>
      </section>

      <Card title={t('dash.activity')} subtitle={t('dash.activitySub')}>
        <ActivityFeed items={recentActivity} />
      </Card>
    </div>
  );
}
