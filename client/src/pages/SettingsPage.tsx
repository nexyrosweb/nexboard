import { useCallback, useState } from 'react';
import {
  confirmImport,
  deleteLogo,
  downloadBackup,
  downloadExport,
  fetchSettings,
  previewImport,
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
import { isLocale, translate, type Locale, type TranslationKey } from '../i18n/translations';
import type { AppSettings, ImportEntity, ImportPreviewResponse } from '../types';
import { parseApiError } from '../utils/hooks';

type Tab = 'language' | 'general' | 'brand' | 'smtp' | 'reminders' | 'statuses' | 'data';

const TAB_IDS: Tab[] = ['language', 'general', 'brand', 'smtp', 'reminders', 'statuses', 'data'];

const TAB_KEYS: Record<Tab, TranslationKey> = {
  language: 'settings.tab.language',
  general: 'settings.tab.general',
  brand: 'settings.tab.brand',
  smtp: 'settings.tab.smtp',
  reminders: 'settings.tab.reminders',
  statuses: 'settings.tab.statuses',
  data: 'settings.tab.data',
};

const PRESET_COLORS = [
  '#0891B2',
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#0F172A',
];

const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const STATUS_FIELDS = [
  { key: 'statuses_clients' as const, label: 'settings.statusesClients' as TranslationKey },
  { key: 'statuses_projects' as const, label: 'settings.statusesProjects' as TranslationKey },
  { key: 'statuses_quotes' as const, label: 'settings.statusesQuotes' as TranslationKey },
  { key: 'statuses_invoices' as const, label: 'settings.statusesInvoices' as TranslationKey },
];

function str(value: string | boolean | undefined, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return fallback;
}

function statusesToDisplay(value: string | boolean | undefined): string {
  const raw = str(value);
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String).join(', ');
  } catch {
    /* already editable text */
  }
  return raw;
}

function statusesToSave(value: string | boolean | undefined): string {
  const raw = str(value);
  if (!raw.trim()) return '[]';
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return JSON.stringify(parsed.map(String).map((s) => s.trim()).filter(Boolean));
    }
  } catch {
    /* comma / newline list */
  }
  return JSON.stringify(
    raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function importStatusBadgeClass(status: 'ok' | 'duplicate' | 'error'): string {
  switch (status) {
    case 'ok':
      return 'badge badge-success';
    case 'duplicate':
      return 'badge badge-warning';
    default:
      return 'badge badge-danger';
  }
}

function importRowSummary(data: Record<string, string>): string {
  return Object.entries(data)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ');
}

function currencyOptions(
  currencies: string | boolean | undefined,
  currentCurrency: string | boolean | undefined,
): string[] {
  const list = str(currencies, 'EUR,USD,GBP,CHF,CAD,JPY')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const cur = str(currentCurrency, 'EUR').toUpperCase();
  if (cur && !list.includes(cur)) list.unshift(cur);
  return list.length ? list : ['EUR'];
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function colorsMatch(a: string, b: string): boolean {
  return a.replace('#', '').toLowerCase() === b.replace('#', '').toLowerCase();
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { refresh, applyBrandColor, acknowledgeLocale } = useBranding();
  const { locale, setLocale, t, options: localeOptions } = useI18n();
  const { push } = useToast();
  const loader = useCallback(() => fetchSettings(), []);
  const { data, loading, error, reload } = useAsyncData(loader);

  const [tab, setTab] = useState<Tab>('language');
  const [form, setForm] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savingLocale, setSavingLocale] = useState(false);

  const [importEntity, setImportEntity] = useState<ImportEntity>('clients');
  const [importFileName, setImportFileName] = useState('');
  const [importCsv, setImportCsv] = useState('');
  const [importPreview, setImportPreview] = useState<ImportPreviewResponse | null>(null);
  const [importPreviewing, setImportPreviewing] = useState(false);
  const [importConfirming, setImportConfirming] = useState(false);

  const current = form ?? data;

  const patch = (partial: AppSettings) => {
    setForm((prev) => {
      const base = prev ?? data;
      if (!base) return prev;
      return { ...base, ...partial };
    });
  };

  const onLanguageChange = async (next: Locale) => {
    if (next === locale && str(current?.locale) === next) return;

    acknowledgeLocale();
    setLocale(next);
    patch({ locale: next });
    setSavingLocale(true);
    try {
      const saved = await saveSettings({ locale: next });
      setForm((prev) => ({ ...(prev ?? data ?? {}), ...saved }));
      setLocale(next);
      push(translate(next, 'settings.languageSaved'), 'success');
      reload();
    } catch (err) {
      push(parseApiError(err), 'danger');
    } finally {
      setSavingLocale(false);
    }
  };

  const onSave = async () => {
    if (!current) return;
    setSaving(true);
    try {
      const localeToSave =
        (typeof current.locale === 'string' && isLocale(current.locale)
          ? current.locale
          : null) ?? locale;

      const saved = await saveSettings({
        company_name: str(current.company_name),
        company_email: str(current.company_email),
        company_phone: str(current.company_phone),
        company_address: str(current.company_address),
        company_tagline: str(current.company_tagline),
        currency: str(current.currency, 'EUR'),
        currencies: str(current.currencies, 'EUR,USD,GBP,CHF,CAD,JPY'),
        quote_number_format: str(current.quote_number_format, 'DEV-{YYYY}-{###}'),
        invoice_number_format: str(
          current.invoice_number_format,
          'FAC - {YYYY} - {###}',
        ),
        theme,
        brand_color: str(current.brand_color, '#0891B2'),
        locale: localeToSave,
        smtp_host: str(current.smtp_host),
        smtp_port: str(current.smtp_port, '587'),
        smtp_secure: str(current.smtp_secure, 'false'),
        smtp_user: str(current.smtp_user),
        smtp_pass: str(current.smtp_pass),
        smtp_from: str(current.smtp_from),
        notify_email: str(current.notify_email, 'false'),
        reminder_enabled: str(current.reminder_enabled, 'true'),
        reminder_email: str(current.reminder_email, 'true'),
        reminder_interval_hours: str(current.reminder_interval_hours, '24'),
        statuses_clients: statusesToSave(current.statuses_clients),
        statuses_projects: statusesToSave(current.statuses_projects),
        statuses_quotes: statusesToSave(current.statuses_quotes),
        statuses_invoices: statusesToSave(current.statuses_invoices),
      });
      setForm(saved);
      applyBrandColor(str(saved.brand_color, '#0891B2'));
      if (typeof saved.locale === 'string' && isLocale(saved.locale)) {
        setLocale(saved.locale);
      }
      await refresh({ syncLocale: true });
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

  const persistBrand = async (partial: AppSettings, opts?: { toast?: boolean }) => {
    if (partial.brand_color && typeof partial.brand_color === 'string') {
      applyBrandColor(partial.brand_color);
    }
    if (isThemeMode(partial.theme)) {
      setTheme(partial.theme);
    }
    patch(partial);
    try {
      const saved = await saveSettings(partial);
      setForm((prev) => ({ ...(prev ?? data ?? {}), ...saved }));
      await refresh();
      if (opts?.toast !== false) push(t('settings.saved'), 'success');
    } catch (err) {
      push(parseApiError(err), 'danger');
    }
  };

  const onBrandColor = (color: string, persist = true) => {
    patch({ brand_color: color });
    if (COLOR_RE.test(color)) {
      applyBrandColor(color);
      if (persist) void persistBrand({ brand_color: color }, { toast: false });
    }
  };

  const onBrandTheme = (next: ThemeMode) => {
    void persistBrand({ theme: next }, { toast: false });
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

  const onImportFile = async (file: File | null) => {
    if (!file) return;
    setImportFileName(file.name);
    setImportPreview(null);
    try {
      const text = await file.text();
      setImportCsv(text);
    } catch (err) {
      push(parseApiError(err), 'danger');
    }
  };

  const onImportEntityChange = (entity: ImportEntity) => {
    setImportEntity(entity);
    setImportPreview(null);
  };

  const onPreviewImport = async () => {
    if (!importCsv.trim()) return;
    setImportPreviewing(true);
    try {
      const result = await previewImport(importEntity, importCsv);
      setImportPreview(result);
    } catch (err) {
      push(parseApiError(err), 'danger');
    } finally {
      setImportPreviewing(false);
    }
  };

  const onConfirmImport = async () => {
    if (!importCsv.trim()) return;
    setImportConfirming(true);
    try {
      const result = await confirmImport(importEntity, importCsv);
      push(t('settings.importDone', { imported: result.imported, skipped: result.skipped }), 'success');
      setImportPreview(null);
      setImportCsv('');
      setImportFileName('');
    } catch (err) {
      push(parseApiError(err), 'danger');
    } finally {
      setImportConfirming(false);
    }
  };

  if (loading && !current) return <LoadingState label={t('settings.loading')} />;
  if (error && !current) return <ErrorState message={error} onRetry={reload} />;
  if (!current) return null;

  const selectedLocale = locale;

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
                  disabled={savingLocale}
                  onChange={(e) => void onLanguageChange(e.target.value as Locale)}
                >
                  {localeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="settings-hint">{t('settings.languageAutoSave')}</p>
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
                  {currencyOptions(current.currencies, current.currency).map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{t('settings.currencies')}</span>
                <input
                  className="input"
                  placeholder="EUR,USD,GBP"
                  value={str(current.currencies, 'EUR,USD,GBP,CHF,CAD,JPY')}
                  onChange={(e) => patch({ currencies: e.target.value })}
                />
                <span className="settings-hint">{t('settings.currenciesHint')}</span>
              </label>
              <label className="field">
                <span className="field-label">{t('settings.quoteNumberFormat')}</span>
                <input
                  className="input mono"
                  placeholder="DEV-{YYYY}-{###}"
                  value={str(current.quote_number_format, 'DEV-{YYYY}-{###}')}
                  onChange={(e) => patch({ quote_number_format: e.target.value })}
                />
                <span className="settings-hint">{t('settings.numberFormatHint')}</span>
              </label>
              <label className="field">
                <span className="field-label">{t('settings.invoiceNumberFormat')}</span>
                <input
                  className="input mono"
                  placeholder="FAC - {YYYY} - {###}"
                  value={str(current.invoice_number_format, 'FAC - {YYYY} - {###}')}
                  onChange={(e) => patch({ invoice_number_format: e.target.value })}
                />
                <span className="settings-hint">{t('settings.numberFormatHint')}</span>
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
              <p className="settings-hint">{t('settings.brandHint')}</p>

              <div className="field">
                <span className="field-label">{t('settings.logo')}</span>
                <div className="logo-row">
                  <img
                    src={current.logo_url ? str(current.logo_url) : '/logo.png'}
                    alt={t('settings.logo')}
                    className="logo-preview"
                  />
                  <div className="logo-actions">
                    <label className="btn btn-ghost">
                      {t('settings.import')}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        hidden
                        onChange={(e) => {
                          void onLogo(e.target.files?.[0] ?? null);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {current.logo_url ? (
                      <button type="button" className="btn btn-ghost" onClick={() => void onRemoveLogo()}>
                        {t('settings.remove')}
                      </button>
                    ) : null}
                  </div>
                </div>
                <span className="settings-hint">
                  {current.logo_url ? t('settings.logoCustomHint') : t('settings.logoDefaultHint')}
                </span>
              </div>

              <div className="field">
                <span className="field-label">{t('settings.brandColor')}</span>
                <div className="color-row">
                  <input
                    className="input"
                    type="color"
                    value={str(current.brand_color, '#0891B2')}
                    onChange={(e) => onBrandColor(e.target.value, true)}
                    aria-label={t('settings.brandColor')}
                  />
                  <input
                    className="input mono"
                    value={str(current.brand_color, '#0891B2')}
                    onChange={(e) => onBrandColor(e.target.value, false)}
                    onBlur={(e) => {
                      if (COLOR_RE.test(e.target.value)) onBrandColor(e.target.value, true);
                    }}
                    spellCheck={false}
                  />
                </div>
                <div className="color-presets" role="listbox" aria-label={t('settings.brandColor')}>
                  {PRESET_COLORS.map((c) => {
                    const active = colorsMatch(str(current.brand_color, '#0891B2'), c);
                    return (
                      <button
                        key={c}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`color-swatch${active ? ' active' : ''}`}
                        style={{ background: c }}
                        aria-label={c}
                        onClick={() => onBrandColor(c, true)}
                      />
                    );
                  })}
                </div>
              </div>

              <label className="field">
                <span className="field-label">{t('settings.theme')}</span>
                <select
                  className="select"
                  value={theme}
                  onChange={(e) => onBrandTheme(e.target.value as ThemeMode)}
                >
                  <option value="system">{t('common.themeSystem')}</option>
                  <option value="light">{t('common.themeLight')}</option>
                  <option value="dark">{t('common.themeDark')}</option>
                </select>
                <span className="settings-hint">{t('settings.themeHint')}</span>
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

          {tab === 'reminders' ? (
            <>
              <p className="settings-hint">{t('settings.remindersHint')}</p>
              <label className="field">
                <span className="field-label">{t('settings.reminderEnabled')}</span>
                <select
                  className="select"
                  value={str(current.reminder_enabled, 'true')}
                  onChange={(e) => patch({ reminder_enabled: e.target.value })}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
              <label className="field field-checkbox">
                <span className="field-label">{t('settings.reminderEmail')}</span>
                <input
                  type="checkbox"
                  checked={str(current.reminder_email, 'true') === 'true'}
                  onChange={(e) => patch({ reminder_email: e.target.checked ? 'true' : 'false' })}
                />
              </label>
              <label className="field">
                <span className="field-label">{t('settings.reminderInterval')}</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={str(current.reminder_interval_hours, '24')}
                  onChange={(e) => patch({ reminder_interval_hours: e.target.value })}
                />
              </label>
            </>
          ) : null}

          {tab === 'statuses' ? (
            <>
              <p className="settings-hint">{t('settings.statusesHint')}</p>
              {STATUS_FIELDS.map(({ key, label }) => (
                <label key={key} className="field">
                  <span className="field-label">{t(label)}</span>
                  <textarea
                    className="textarea"
                    value={statusesToDisplay(current[key])}
                    onChange={(e) => patch({ [key]: e.target.value })}
                  />
                </label>
              ))}
            </>
          ) : null}

          {tab === 'data' ? (
            <>
              <h3 className="settings-section-title">{t('settings.importTitle')}</h3>
              <p className="settings-hint">{t('settings.importDesc')}</p>
              <div className="import-controls">
                <label className="field">
                  <span className="field-label">{t('settings.importEntity')}</span>
                  <select
                    className="select"
                    value={importEntity}
                    onChange={(e) => onImportEntityChange(e.target.value as ImportEntity)}
                  >
                    <option value="clients">{t('settings.importClients')}</option>
                    <option value="projects">{t('settings.importProjects')}</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">{t('settings.importFile')}</span>
                  <label className="btn btn-ghost import-file-btn">
                    {importFileName || t('settings.importChoose')}
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      hidden
                      onChange={(e) => void onImportFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={!importCsv.trim() || importPreviewing}
                  onClick={() => void onPreviewImport()}
                >
                  {importPreviewing ? t('settings.importPreviewing') : t('settings.importPreview')}
                </button>
              </div>
              <p className="settings-hint import-hint">{t('settings.importHint')}</p>

              {importPreview ? (
                <div className="import-preview">
                  <p className="import-summary">
                    {t('settings.importSummary', {
                      ok: importPreview.ok,
                      duplicates: importPreview.duplicates,
                      errors: importPreview.errors,
                      total: importPreview.total,
                    })}
                  </p>
                  {importPreview.rows.length ? (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>{t('settings.importRow')}</th>
                            <th>{t('doc.status')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.rows.map((row) => (
                            <tr key={row.index}>
                              <td>{row.index}</td>
                              <td className="import-row-summary">
                                {importRowSummary(row.data)}
                                {row.message ? (
                                  <span className="import-row-message"> — {row.message}</span>
                                ) : null}
                              </td>
                              <td>
                                <span className={importStatusBadgeClass(row.status)}>
                                  {t(
                                    row.status === 'ok'
                                      ? 'settings.importStatusOk'
                                      : row.status === 'duplicate'
                                        ? 'settings.importStatusDuplicate'
                                        : 'settings.importStatusError',
                                  )}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="settings-hint">{t('settings.importNoRows')}</p>
                  )}
                  {importPreview.ok > 0 ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={importConfirming}
                      onClick={() => void onConfirmImport()}
                    >
                      {importConfirming ? t('settings.importConfirming') : t('settings.importConfirm')}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <h3 className="settings-section-title">{t('settings.exportTitle')}</h3>
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
