import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

const titleKeys: Record<string, TranslationKey> = {
  '/': 'nav.dashboard',
  '/clients': 'nav.clients',
  '/projects': 'nav.projects',
  '/quotes': 'nav.quotes',
  '/invoices': 'nav.invoices',
  '/tasks': 'nav.tasks',
  '/calendar': 'nav.calendar',
  '/notifications': 'nav.notifications',
  '/settings': 'nav.settings',
};

export function AppLayout() {
  const location = useLocation();
  const { t } = useI18n();
  const [navOpen, setNavOpen] = useState(false);
  const title = useMemo(() => {
    const key = titleKeys[location.pathname];
    return key ? t(key) : 'NexBoard';
  }, [location.pathname, t]);

  return (
    <div className="app-shell">
      <div
        className={`sidebar-backdrop${navOpen ? ' visible' : ''}`}
        onClick={() => setNavOpen(false)}
        aria-hidden
      />
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="main-area">
        <Topbar title={title} onMenuClick={() => setNavOpen(true)} />
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
