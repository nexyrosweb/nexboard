import { ArrowRightLeft, Eye, FileText, Mail, Pencil, Trash2 } from 'lucide-react';
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
  onView?: () => void;
  onPreview?: () => void;
  onConvert?: () => void;
}

export function RowActions({
  onEdit,
  onDelete,
  onSend,
  onView,
  onPreview,
  onConvert,
}: RowActionsProps) {
  const { t } = useI18n();
  return (
    <div className="row-actions">
      {onView ? (
        <button
          type="button"
          className="btn btn-icon btn-ghost"
          onClick={onView}
          aria-label={t('common.details')}
        >
          <Eye size={16} />
        </button>
      ) : null}
      {onPreview ? (
        <button
          type="button"
          className="btn btn-icon btn-ghost"
          onClick={onPreview}
          aria-label={t('common.preview')}
        >
          <FileText size={16} />
        </button>
      ) : null}
      {onConvert ? (
        <button
          type="button"
          className="btn btn-icon btn-ghost"
          onClick={onConvert}
          aria-label={t('common.convert')}
        >
          <ArrowRightLeft size={16} />
        </button>
      ) : null}
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
  hint?: string;
  action?: ReactNode;
}

export function EmptyTable({ message, hint, action }: EmptyTableProps) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      {hint ? <p className="empty-state-hint">{hint}</p> : null}
      {action}
    </div>
  );
}
