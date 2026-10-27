import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';

export function SetupPage() {
  const { t } = useI18n();
  const { push } = useToast();
  const { loading, authEnabled, setupRequired, user, setup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && !authEnabled) return <Navigate to="/" replace />;
  if (!loading && !setupRequired && user) return <Navigate to="/" replace />;
  if (!loading && !setupRequired && !user) return <Navigate to="/login" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await setup({ name: name.trim(), email: email.trim(), password });
      push(t('auth.setupSuccess'), 'success');
    } catch (err) {
      push(err instanceof Error ? err.message : t('auth.setupFailed'), 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="auth-brand">NexBoard</p>
        <h1>{t('auth.setupTitle')}</h1>
        <p className="auth-subtitle">{t('auth.setupSubtitle')}</p>

        <label className="field">
          <span>{t('auth.name')}</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </label>

        <label className="field">
          <span>{t('auth.email')}</span>
          <input
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>{t('auth.password')}</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={10}
            required
          />
          <small className="field-hint">{t('auth.passwordHint')}</small>
        </label>

        <button className="btn btn-primary" type="submit" disabled={busy || loading}>
          {busy ? t('common.loading') : t('auth.createAdmin')}
        </button>
      </form>
    </div>
  );
}
