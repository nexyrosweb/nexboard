import { useI18n } from '../context/I18nContext';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  const { t } = useI18n();
  return (
    <div className="loading-state card">
      <div className="spinner" aria-hidden />
      <p>{label ?? t('common.loading')}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useI18n();
  return (
    <div className="error-state card">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          {t('common.retry')}
        </button>
      ) : null}
    </div>
  );
}
