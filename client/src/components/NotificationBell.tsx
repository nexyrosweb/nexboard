import { Bell } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';
import { useI18n } from '../context/I18nContext';
import type { AppNotification } from '../types';
import { formatDate } from '../utils/format';

export type { AppNotification };

export function NotificationBell() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications(20);
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* ignore poll errors */
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  const markAll = async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: 1 })));
    setUnread(0);
  };

  const markOne = async (id: number) => {
    await markNotificationRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: 1 } : n)));
    setUnread((n) => Math.max(0, n - 1));
  };

  return (
    <div className="notif-root" ref={rootRef}>
      <button
        type="button"
        className="btn btn-icon btn-ghost"
        aria-label={t('notif.aria')}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} />
        {unread > 0 ? <span className="notif-dot">{unread > 9 ? '9+' : unread}</span> : null}
      </button>

      {open ? (
        <div className="notif-panel card">
          <div className="notif-panel-head">
            <strong>{t('notif.title')}</strong>
            <button type="button" className="btn btn-ghost" onClick={() => void markAll()}>
              {t('notif.markAll')}
            </button>
          </div>
          <ul className="notif-list">
            {!items.length ? (
              <li className="notif-empty">{t('notif.empty')}</li>
            ) : (
              items.map((item) => (
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
                    <Link
                      to={item.link}
                      className="notif-link"
                      onClick={() => setOpen(false)}
                    >
                      {t('notif.open')}
                    </Link>
                  ) : null}
                </li>
              ))
            )}
          </ul>
          <div className="notif-panel-foot">
            <Link to="/notifications" className="notif-see-all" onClick={() => setOpen(false)}>
              {t('notif.seeAll')}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
