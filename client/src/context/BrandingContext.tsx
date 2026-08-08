import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import { useI18n } from './I18nContext';
import { useTheme, type ThemeMode } from './ThemeContext';
import { isLocale, type Locale } from '../i18n/translations';
import type { AppSettings } from '../types';

interface BrandingContextValue {
  settings: AppSettings;
  loading: boolean;
  refresh: (opts?: { syncLocale?: boolean }) => Promise<void>;
  applyBrandColor: (color: string) => void;
  acknowledgeLocale: () => void;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function shade(hex: string, percent: number): string {
  const raw = hex.replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.min(255, Math.max(0, ((num >> 16) & 255) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + percent));
  const b = Math.min(255, Math.max(0, (num & 255) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function applyBrandColor(color: string) {
  if (!color) return;
  const root = document.documentElement;
  root.style.setProperty('--signal', color);
  root.style.setProperty('--signal-deep', shade(color, -20));
  root.style.setProperty('--sidebar-active', color);
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({});
  const [loading, setLoading] = useState(true);
  const { setLocale } = useI18n();
  const { setTheme } = useTheme();
  const hydratedLocale = useRef(false);
  const hydratedTheme = useRef(false);

  const refresh = useCallback(async (opts?: { syncLocale?: boolean }) => {
    setLoading(true);
    try {
      const data = await api.get<AppSettings>('/api/settings');
      setSettings(data);
      applyBrandColor(data.brand_color ? String(data.brand_color) : '#0891B2');
      if (data.company_name) document.title = String(data.company_name);

      if (isThemeMode(data.theme) && (opts?.syncLocale === true || !hydratedTheme.current)) {
        setTheme(data.theme);
        hydratedTheme.current = true;
      } else if (!hydratedTheme.current) {
        hydratedTheme.current = true;
      }

      const canApplyLocale =
        typeof data.locale === 'string' &&
        isLocale(data.locale) &&
        (opts?.syncLocale === true || !hydratedLocale.current);

      if (canApplyLocale) {
        setLocale(data.locale as Locale);
        hydratedLocale.current = true;
      } else if (!hydratedLocale.current) {
        hydratedLocale.current = true;
      }
    } catch {
      applyBrandColor('#0891B2');
    } finally {
      setLoading(false);
    }
  }, [setLocale, setTheme]);

  const acknowledgeLocale = useCallback(() => {
    hydratedLocale.current = true;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ settings, loading, refresh, applyBrandColor, acknowledgeLocale }),
    [settings, loading, refresh, acknowledgeLocale],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
}
