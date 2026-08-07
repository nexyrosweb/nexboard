import { useCallback, useState } from 'react';
import {
  deleteLogo,
  downloadBackup,
  downloadExport,
  fetchSettings,
  saveSettings,
  testSmtp,
  uploadLogo,
} from '../api/settings';
import { PageHeader } from '../components/PageChrome';
import { ErrorState, LoadingState } from '../components/StateViews';
import { useBranding } from '../context/BrandingContext';
import { useI18n } from '../context/I18nContext';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { isLocale, type Locale, type TranslationKey } from '../i18n/translations';
import type { AppSettings } from '../types';
import { parseApiError } from '../utils/hooks';

type Tab = 'language' | 'general' | 'brand' | 'smtp' | 'data';

const TAB_IDS: Tab[] = ['language', 'general', 'brand', 'smtp', 'data'];

const TAB_KEYS: Record<Tab, TranslationKey> = {
  language: 'settings.tab.language',
  general: 'settings.tab.general',
  brand: 'settings.tab.brand',
  smtp: 'settings.tab.smtp',
  data: 'settings.tab.data',
};

const PRESET_COLORS = ['#0891B2', '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED'];

function str(value: string | boolean | undefined, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return fallback;
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { refresh, applyBrandColor } = useBranding();
  const { locale, setLocale, t, options: localeOptions } = useI18n();
  const { push } = useToast();
  const loader = useCallback(() => fetchSettings(), []);
  const { data, loading, error, reload } = useAsyncData(loader);

  const [tab, setTab] = useState<Tab>('language');
  const [form, setForm] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const current = form ?? data;

  const patch = (partial: AppSettings) => {
    if (!current) return;
    setForm({ ...current, ...partial });
  };

  const onLanguageChange = (next: Locale) => {
    setLocale(next);
    patch({ locale: next });
  };

  const onSave = async () => {
    if (!current) return;
    setSaving(true);
    try {
      const saved = await saveSettings({
        company_name: str(current.company_name),
        company_email: str(current.company_email),
        company_phone: str(current.company_phone),
        company_address: str(current.company_address),
        company_tagline: str(current.company_tagline),
        currency: str(current.currency, 'EUR'),
        theme,
        brand_color: str(current.brand_color, '#0891B2'),
        locale: str(current.locale, locale),
        smtp_host: str(current.smtp_host),
        smtp_port: str(current.smtp_port, '587'),
        smtp_secure: str(current.smtp_secure, 'false'),
        smtp_user: str(current.smtp_user),
        smtp_pass: str(current.smtp_pass),
        smtp_from: str(current.smtp_from),
        notify_email: str(current.notify_email, 'false'),
      });
      setForm(saved);
      applyBrandColor(str(saved.brand_color, '#0891B2'));
      if (typeof saved.locale === 'string' && isLocale(saved.locale)) {
        setLocale(saved.locale);
      }
      await refresh();
      push(t('settings.saved'), 'success');
      reload();
    } catch (err) {
      push(parseApiError(err), 'danger');
    } finally {
      setSaving(false);
    }
  };

  const onLogo = async (file: File | null) => {
    if (!file) return;
    try {
      const saved = await uploadLogo(file);
      setForm(saved);
      await refresh();
      push(t('settings.logoUpdated'), 'success');
    } catch (err) {
      push(parseApiError(err), 'danger');
    }
  };

  const onRemoveLogo = async () => {
    try {
      const saved = await deleteLogo();
      setForm(saved);
      await refresh();
      push(t('settings.logoRemoved'), 'info');
    } catch (err) {
      push(parseApiError(err), 'danger');
    }
  };

  const onTestSmtp = async () => {
    setTesting(true);
    try {
      await onSave();
      const result = await testSmtp(str(current?.company_email) || undefined);
      push(t('settings.testSent', { to: result.to }), 'success');
    } catch (err) {
      push(parseApiError(err), 'danger');
    } finally {
      setTesting(false);
    }
  };

  if (loading && !current) return <LoadingState label={t('settings.loading')} />;
  if (error && !current) return <ErrorState message={error} onRetry={reload} />;
  if (!current) return null;

  const selectedLocale =
    (typeof current.locale === 'string' && isLocale(current.locale) ? current.locale : null) ??
    locale;

  return (
    <div>
      <PageHeader
        kicker={t('settings.kicker')}
        title={t('settings.title')}
        description={t('settings.desc')}
        action={
          <button type="button" className="btn btn-primary" onClick={() => void onSave()} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        }
      />

      <div className="settings-tabs">
        {TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`settings-tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            {t(TAB_KEYS[id])}
          </button>
        ))}
      </div>

      <section className="card">
        <div className="card-body settings-grid">
          {tab === 'language' ? (
            <>
              <p className="settings-hint">{t('settings.languageHint')}</p>
              <label className="field">
                <span className="field-label">{t('settings.language')}</span>
                <select
                  className="select"
                  value={selectedLocale}
                  onChange={(e) => onLanguageChange(e.target.value as Locale)}
                >
                  {localeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {tab === 'general' ? (
            <>
              <label className="field">
                <span className="field-label">{t('settings.companyName')}</span>
                <input
                  className="input"
                  value={str(current.company_name)}
                  onChange={(e) => patch({ company_name: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">{t('settings.tagline')}</span>
                <input
                  className="input"
                  value={str(current.company_tagline)}
                  onChange={(e) => patch({ company_tagline: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">{t('settings.email')}</span>
                <input
                  className="input"
                  type="email"
                  value={str(current.company_email)}
                  onChange={(e) => patch({ company_email: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">{t('settings.phone')}</span>
                <input
                  className="input"
                  value={str(current.company_phone)}
                  onChange={(e) => patch({ company_phone: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">{t('settings.currency')}</span>
                <select
                  className="select"
                  value={str(current.currency, 'EUR')}
                  onChange={(e) => patch({ currency: e.target.value })}
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CHF">CHF</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">{t('settings.address')}</span>
                <textarea
                  className="textarea"
                  value={str(current.company_address)}
                  onChange={(e) => patch({ company_address: e.target.value })}
                />
              </label>
            </>
          ) : null}

          {tab === 'brand' ? (
            <>
              <div className="field">
                <span className="field-label">{t('settings.logo')}</span>
                <div className="logo-row">
                  {current.logo_url ? (
                    <img src={str(current.logo_url)} alt={t('settings.logo')} className="logo-preview" />
                  ) : (
                    <div className="logo-placeholder">{t('settings.noLogo')}</div>
                  )}
                  <div className="logo-actions">
                    <label className="btn btn-ghost">
                      {t('settings.import')}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        hidden
                        onChange={(e) => void onLogo(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {current.logo_url ? (
                      <button type="button" className="btn btn-ghost" onClick={() => void onRemoveLogo()}>
                        {t('settings.remove')}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <label className="field">
                <span className="field-label">{t('settings.brandColor')}</span>
                <div className="color-row">
                  <input
                    className="input"
                    type="color"
                    value={str(current.brand_color, '#0891B2')}
                    onChange={(e) => {
                      patch({ brand_color: e.target.value });
                      applyBrandColor(e.target.value);
                    }}
                  />
                  <input
                    className="input"
                    value={str(current.brand_color, '#0891B2')}
                    onChange={(e) => {
                      patch({ brand_color: e.target.value });
                      if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(e.target.value)) {
                        applyBrandColor(e.target.value);
                      }
                    }}
                  />
                </div>
                <div className="color-presets">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="color-swatch"
                      style={{ background: c }}
                      aria-label={c}
                      onClick={() => {
                        patch({ brand_color: c });
                        applyBrandColor(c);
                      }}
                    />
                  ))}
                </div>
              </label>

              <label className="field">
                <span className="field-label">{t('settings.theme')}</span>
                <select
                  className="select"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as ThemeMode)}
                >
                  <option value="system">{t('common.themeSystem')}</option>
                  <option value="light">{t('common.themeLight')}</option>
                  <option value="dark">{t('common.themeDark')}</option>
                </select>
              </label>
            </>
          ) : null}

          {tab === 'smtp' ? (
            <>
              <p className="settings-hint">{t('settings.smtpHint')}</p>
              <label className="field">
                <span className="field-label">{t('settings.smtpHost')}</span>
                <input
                  className="input"
                  placeholder="smtp.exemple.com"
                  value={str(current.smtp_host)}
                  onChange={(e) => patch({ smtp_host: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">{t('settings.smtpPort')}</span>
                <input
                  className="input"
                  value={str(current.smtp_port, '587')}
                  onChange={(e) => patch({ smtp_port: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">{t('settings.smtpUser')}</span>
                <input
                  className="input"
                  value={str(current.smtp_user)}
                  onChange={(e) => patch({ smtp_user: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">{t('settings.smtpPass')}</span>
                <input
                  className="input"
                  type="password"
                  placeholder={current.smtp_pass_set ? '••••••••' : ''}
                  value={str(current.smtp_pass)}
                  onChange={(e) => patch({ smtp_pass: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">{t('settings.smtpFrom')}</span>
                <input
                  className="input"
                  placeholder="noreply@entreprise.com"
                  value={str(current.smtp_from)}
                  onChange={(e) => patch({ smtp_from: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">{t('settings.smtpTls')}</span>
                <select
                  className="select"
                  value={str(current.smtp_secure, 'false')}
                  onChange={(e) => patch({ smtp_secure: e.target.value })}
                >
                  <option value="false">{t('settings.smtpStarttls')}</option>
                  <option value="true">{t('settings.smtpSsl')}</option>
                </select>
              </label>
              <div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={testing}
                  onClick={() => void onTestSmtp()}
                >
                  {testing ? t('settings.smtpTesting') : t('settings.smtpTest')}
                </button>
                {current.smtp_configured ? (
                  <span className="badge badge-success" style={{ marginLeft: '0.75rem' }}>
                    {t('settings.smtpReady')}
                  </span>
                ) : (
                  <span className="badge badge-warning" style={{ marginLeft: '0.75rem' }}>
                    {t('settings.smtpMissing')}
                  </span>
                )}
              </div>
            </>
          ) : null}

          {tab === 'data' ? (
            <>
              <p className="settings-hint">{t('settings.dataHint')}</p>
              <div className="export-grid">
                {(['clients', 'projects', 'quotes', 'invoices'] as const).map((entity) => (
                  <button
                    key={entity}
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => downloadExport(entity)}
                  >
                    Export {entity}.csv
                  </button>
                ))}
                <button type="button" className="btn btn-primary" onClick={() => downloadBackup()}>
                  {t('settings.backup')}
                </button>
              </div>
              <div className="settings-ideas">
                <h3>{t('settings.ideasTitle')}</h3>
                <ul>
                  <li>{t('settings.idea1')}</li>
                  <li>{t('settings.idea2')}</li>
                  <li>{t('settings.idea3')}</li>
                  <li>{t('settings.idea4')}</li>
                  <li>{t('settings.idea5')}</li>
                </ul>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
