import { useState, type FormEvent } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';

export function LoginPage() {
  const { t } = useI18n();
  const { push } = useToast();
  const { loading, authEnabled, setupRequired, user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && !authEnabled) return <Navigate to="/" replace />;
  if (!loading && setupRequired) return <Navigate to="/setup" replace />;
  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim(), password);
      push(t('auth.loginSuccess'), 'success');
    } catch (err) {
      push(err instanceof Error ? err.message : t('auth.loginFailed'), 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="auth-brand">NexBoard</p>
        <h1>{t('auth.loginTitle')}</h1>
        <p className="auth-subtitle">{t('auth.loginSubtitle')}</p>

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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button className="btn btn-primary" type="submit" disabled={busy || loading}>
          {busy ? t('common.loading') : t('auth.login')}
        </button>

        {setupRequired ? (
          <p className="auth-foot">
            <Link to="/setup">{t('auth.goSetup')}</Link>
          </p>
        ) : null}
      </form>
    </div>
  );
}
