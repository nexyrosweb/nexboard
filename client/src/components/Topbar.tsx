import { Menu, Moon, Sun } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { NotificationBell } from './NotificationBell';

interface TopbarProps {
  title: string;
  onMenuClick: () => void;
}

export function Topbar({ title, onMenuClick }: TopbarProps) {
  const { resolved, toggle } = useTheme();
  const { t } = useI18n();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="btn btn-icon btn-ghost mobile-nav-toggle"
          onClick={onMenuClick}
          aria-label={t('nav.open')}
        >
          <Menu size={18} />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="topbar-actions">
        <NotificationBell />
        <button
          type="button"
          className="btn btn-icon btn-ghost"
          onClick={toggle}
          aria-label={resolved === 'dark' ? t('common.lightMode') : t('common.darkMode')}
        >
          {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
