import { X } from 'lucide-react';
import { useEffect, type FormEvent, type ReactNode } from 'react';
import { useI18n } from '../context/I18nContext';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function Modal({ open, title, onClose, children, footer, wide }: ModalProps) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`modal${wide ? ' modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h3>{title}</h3>
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={onClose}
            aria-label={t('nav.close')}
          >
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  loading,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? t('common.deleting') : confirmLabel ?? t('common.delete')}
          </button>
        </>
      }
    >
      <p className="modal-text">{message}</p>
    </Modal>
  );
}

interface FormActionsProps {
  onCancel: () => void;
  submitLabel: string;
  loading?: boolean;
  formId?: string;
}

export function FormActions({ onCancel, submitLabel, loading, formId }: FormActionsProps) {
  const { t } = useI18n();
  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={loading}>
        {t('common.cancel')}
      </button>
      <button type="submit" form={formId} className="btn btn-primary" disabled={loading}>
        {loading ? t('common.saving') : submitLabel}
      </button>
    </>
  );
}

export function handleFormSubmit(handler: () => Promise<void> | void) {
  return (e: FormEvent) => {
    e.preventDefault();
    void handler();
  };
}
