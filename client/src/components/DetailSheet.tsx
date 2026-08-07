import type { ReactNode } from 'react';
import { useI18n } from '../context/I18nContext';
import { Modal } from './Modal';

export interface DetailField {
  label: string;
  value: ReactNode;
}

interface DetailSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  fields: DetailField[];
  actions?: ReactNode;
}

export function DetailSheet({ open, title, onClose, fields, actions }: DetailSheetProps) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      wide
      footer={
        <div className="detail-actions">
          {actions}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      }
    >
      <dl className="detail-sheet">
        {fields.map((field) => (
          <div key={field.label} className="detail-sheet-row">
            <dt>{field.label}</dt>
            <dd>{field.value || '—'}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
