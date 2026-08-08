import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';
import { PageHeader } from '../components/PageChrome';
import { ErrorState, LoadingState } from '../components/StateViews';
import { useI18n } from '../context/I18nContext';
import { useAsyncData } from '../hooks/useAsyncData';
import type { AppNotification } from '../types';
import { formatDate } from '../utils/format';
import type { TranslationKey } from '../i18n/translations';

type Filter = 'all' | 'unread';

const TYPE_ORDER: AppNotification['type'][] = ['danger', 'warning', 'info', 'success'];

const TYPE_LABEL_KEYS: Record<AppNotification['type'], TranslationKey> = {
  danger: 'notif.type.danger',
  warning: 'notif.type.warning',
  info: 'notif.type.info',
  success: 'notif.type.success',
};

export function NotificationsPage() {
  const { t } = useI18n();
  const loader = useCallback(() => fetchNotifications(100), []);
  const { data, loading, error, reload } = useAsyncData(loader);
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<AppNotification[] | null>(null);

  const list = items ?? data?.items ?? [];

  const filtered = useMemo(
    () => (filter === 'unread' ? list.filter((n) => !n.read) : list),
    [list, filter],
  );

  const grouped = useMemo(() => {
    const groups = new Map<AppNotification['type'], AppNotification[]>();
    for (const type of TYPE_ORDER) groups.set(type, []);
    for (const item of filtered) {
      groups.get(item.type)?.push(item);
    }
    return TYPE_ORDER.map((type) => ({ type, items: groups.get(type) ?? [] })).filter(
      (group) => group.items.length > 0,
    );
  }, [filtered]);

  const markOne = async (id: number) => {
    try {
      await markNotificationRead(id);
      setItems((prev) =>
        (prev ?? data?.items ?? []).map((n) => (n.id === id ? { ...n, read: 1 } : n)),
      );
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => (prev ?? data?.items ?? []).map((n) => ({ ...n, read: 1 })));
    } catch {
      /* ignore */
    }
  };

  if (loading && !data) return <LoadingState label={t('common.loading')} />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        kicker={t('notif.pageKicker')}
        title={t('notif.pageTitle')}
        description={t('notif.pageDesc')}
        action={
          <button type="button" className="btn btn-ghost" onClick={() => void markAll()}>
            <CheckCheck size={16} />
            {t('notif.markAll')}
          </button>
        }
      />

      <div className="notif-filters">
        <button
          type="button"
          className={`notif-filter-btn${filter === 'all' ? ' active' : ''}`}
          onClick={() => setFilter('all')}
        >
          {t('notif.filterAll')}
        </button>
        <button
          type="button"
          className={`notif-filter-btn${filter === 'unread' ? ' active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          {t('notif.filterUnread')}
        </button>
      </div>

      {!grouped.length ? (
        <div className="empty-state card">
          {filter === 'unread' ? t('notif.empty.unread') : t('notif.empty')}
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.type} className="card notif-group">
            <div className="card-header">
              <h2 className="card-title">
                <span className={`notif-type notif-type-${group.type}`} />
                {t(TYPE_LABEL_KEYS[group.type])}
                <span className="notif-group-count">{group.items.length}</span>
              </h2>
            </div>
            <ul className="notif-page-list">
              {group.items.map((item) => (
                <li key={item.id} className={item.read ? '' : 'unread'}>
                  <button
                    type="button"
                    className="notif-item"
                    onClick={() => void markOne(item.id)}
                  >
                    <span className={`notif-type notif-type-${item.type}`} />
                    <span className="notif-body">
                      <span className="notif-title">{item.title}</span>
                      <span className="notif-msg">{item.message}</span>
                      <span className="notif-date">{formatDate(item.created_at)}</span>
                    </span>
                  </button>
                  {item.link ? (
                    <Link to={item.link} className="notif-link">
                      {t('notif.open')}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
