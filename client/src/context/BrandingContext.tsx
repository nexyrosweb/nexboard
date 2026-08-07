import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import { useI18n } from './I18nContext';
import { isLocale } from '../i18n/translations';
import type { AppSettings } from '../types';

interface BrandingContextValue {
  settings: AppSettings;
  loading: boolean;
  refresh: () => Promise<void>;
  applyBrandColor: (color: string) => void;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<AppSettings>('/api/settings');
      setSettings(data);
      applyBrandColor(data.brand_color ? String(data.brand_color) : '#0891B2');
      if (data.company_name) document.title = String(data.company_name);
      if (typeof data.locale === 'string' && isLocale(data.locale)) {
        setLocale(data.locale);
      }
    } catch {
      applyBrandColor('#0891B2');
    } finally {
      setLoading(false);
    }
  }, [setLocale]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ settings, loading, refresh, applyBrandColor }),
    [settings, loading, refresh],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
}
