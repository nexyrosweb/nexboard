import { Mail, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { statusBadgeClass, statusLabelKey } from '../utils/format';

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const key = statusLabelKey(status) as TranslationKey;
  return <span className={statusBadgeClass(status)}>{t(key)}</span>;
}

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  onSend?: () => void;
}

export function RowActions({ onEdit, onDelete, onSend }: RowActionsProps) {
  const { t } = useI18n();
  return (
    <div className="row-actions">
      {onSend ? (
        <button
          type="button"
          className="btn btn-icon btn-ghost"
          onClick={onSend}
          aria-label={t('common.sendEmail')}
        >
          <Mail size={16} />
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-icon btn-ghost"
        onClick={onEdit}
        aria-label={t('common.edit')}
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        className="btn btn-icon btn-ghost"
        onClick={onDelete}
        aria-label={t('common.delete')}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

interface EmptyTableProps {
  message: string;
  action?: ReactNode;
}

export function EmptyTable({ message, action }: EmptyTableProps) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      {action}
    </div>
  );
}
