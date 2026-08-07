import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../context/I18nContext';
import type { Option } from '../types';

interface PageHeaderProps {
  kicker: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({ kicker, title, description, action }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <div className="page-kicker">{kicker}</div>
        <h2 className="page-title">{title}</h2>
        <p className="page-desc">{description}</p>
      </div>
      {action}
    </header>
  );
}

interface ToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  status: string;
  onStatusChange: (value: string) => void;
  statusOptions: Option[];
  countLabel: string;
}

export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  status,
  onStatusChange,
  statusOptions,
  countLabel,
}: ToolbarProps) {
  const { t } = useI18n();
  return (
    <div className="list-toolbar">
      <div className="search-box grow">
        <Search size={16} />
        <input
          className="input"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder ?? t('common.search')}
          aria-label={t('common.search')}
        />
      </div>
      <select
        className="select"
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label={t('common.allStatuses')}
      >
        <option value="">{t('common.allStatuses')}</option>
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="toolbar-count">{countLabel}</span>
    </div>
  );
}
