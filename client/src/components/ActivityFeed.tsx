import { FileText, FolderKanban, Receipt } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import type { ActivityItem } from '../types';
import { formatDate, statusBadgeClass, useFormatCurrency, useStatusLabel } from '../utils/format';

interface ActivityFeedProps {
  items: ActivityItem[];
}

function iconFor(type: ActivityItem['type']) {
  switch (type) {
    case 'invoice':
      return <Receipt size={16} />;
    case 'quote':
      return <FileText size={16} />;
    default:
      return <FolderKanban size={16} />;
  }
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  const { t } = useI18n();
  const formatCurrency = useFormatCurrency();
  const statusLabel = useStatusLabel();

  if (!items.length) {
    return <div className="empty-state">{t('dash.noActivity')}</div>;
  }

  return (
    <ul className="activity-list">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="activity-item"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <span className="activity-icon">{iconFor(item.type)}</span>
          <div>
            <div className="activity-title">{item.title}</div>
            <div className="activity-sub">{item.subtitle}</div>
          </div>
          <div className="activity-right">
            {item.amount != null ? (
              <div className="activity-amount">{formatCurrency(item.amount)}</div>
            ) : null}
            <div style={{ marginTop: '0.25rem' }}>
              <span className={statusBadgeClass(item.status)}>
                {statusLabel(item.status)}
              </span>
            </div>
            <div className="activity-date">{formatDate(item.date)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
