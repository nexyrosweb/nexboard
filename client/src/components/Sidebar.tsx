import { NavLink } from 'react-router-dom';
import {
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

const links: Array<{
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
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
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
  const logo = settings.logo_url ? String(settings.logo_url) : '';

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label={t('nav.main')}>
      <div className="brand">
        {logo ? (
          <img src={logo} alt="" className="brand-logo" />
        ) : (
          <div className="brand-mark" aria-hidden>
            {name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="brand-text">
          <span className="brand-name">{name}</span>
          <span className="brand-tag">{tagline}</span>
        </div>
        <button
          type="button"
          className="btn btn-icon btn-ghost mobile-nav-toggle"
          style={{ marginLeft: 'auto', color: '#e2e8f0', borderColor: 'transparent' }}
          onClick={onClose}
          aria-label={t('nav.close')}
        >
          <X size={18} />
        </button>
      </div>

      <nav>
        <ul className="nav-list">
          {links.map(({ to, labelKey, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={onClose}
              >
                <Icon size={18} />
                <span>{t(labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', padding: '0 0.55rem' }}>
          {t('nav.footer')}
        </p>
      </div>
    </aside>
  );
}
