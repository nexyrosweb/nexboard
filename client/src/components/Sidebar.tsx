import { NavLink } from 'react-router-dom';
import {
  Bell,
  Calendar,
  CheckSquare,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

const primaryLinks: Array<{
  to: string;
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
  end?: boolean;
}> = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/clients', labelKey: 'nav.clients', icon: Users },
  { to: '/projects', labelKey: 'nav.projects', icon: FolderKanban },
  { to: '/quotes', labelKey: 'nav.quotes', icon: FileText },
  { to: '/invoices', labelKey: 'nav.invoices', icon: Receipt },
  { to: '/tasks', labelKey: 'nav.tasks', icon: CheckSquare },
  { to: '/calendar', labelKey: 'nav.calendar', icon: Calendar },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { settings } = useBranding();
  const { t } = useI18n();
  const name = String(settings.company_name || 'NexBoard');
  const tagline = String(settings.company_tagline || 'Business OS');
  const logo = settings.logo_url ? String(settings.logo_url) : '/logo.png';

  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label={t('nav.main')}>
      <div className="sidebar-inner">
        <div className="brand">
          <img src={logo} alt="" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-name">{name}</span>
            <span className="brand-tag">{tagline}</span>
          </div>
          <button
            type="button"
            className="sidebar-close mobile-nav-toggle"
            onClick={onClose}
            aria-label={t('nav.close')}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-section-label">{t('nav.section.main')}</p>
          <ul className="nav-list">
            {primaryLinks.map(({ to, labelKey, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-link-icon">
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <span className="nav-link-label">{t(labelKey)}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          <p className="nav-section-label">{t('nav.section.system')}</p>
          <ul className="nav-list">
            <li>
              <NavLink
                to="/notifications"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-link-icon">
                  <Bell size={18} strokeWidth={2} />
                </span>
                <span className="nav-link-label">{t('nav.notifications')}</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/settings"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-link-icon">
                  <Settings size={18} strokeWidth={2} />
                </span>
                <span className="nav-link-label">{t('nav.settings')}</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-footer-text">{t('nav.footer')}</p>
        </div>
      </div>
    </aside>
  );
}
